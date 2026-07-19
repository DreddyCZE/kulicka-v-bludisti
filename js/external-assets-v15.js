(() => {
  async function loadBase64Image(path) {
    const value = (await fetch(path, { cache: 'no-store' })).text().then(text => text.trim());
    const base64 = await value;
    if (!base64.startsWith('iVBOR')) throw new Error(`Neplatný PNG asset: ${path}`);

    const image = new Image();
    image.decoding = 'async';
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    return image;
  }

  window.GARDEN_ASSET_BOOT = (async () => {
    const definitions = {
      lili: './assets/generated/lili.png.b64?v=16',
      star: './assets/generated/star-v16.png.b64?v=16',
      key: './assets/generated/key-v16.png.b64?v=16',
      pond: './assets/generated/pond-v16.png.b64?v=16',
      gate: './assets/generated/gate-v16.png.b64?v=16'
    };

    const images = {};
    const results = await Promise.allSettled(
      Object.entries(definitions).map(async ([key, path]) => {
        images[key] = await loadBase64Image(path);
      })
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const key = Object.keys(definitions)[index];
        console.warn(`Externí asset ${key} se nepodařilo načíst. Použije se bezpečný fallback.`, result.reason);
      }
    });

    window.GARDEN_EXTERNAL_IMAGES = images;

    const portrait = document.querySelector('.portrait');
    if (portrait && images.lili) {
      const portraitImage = images.lili.cloneNode();
      portraitImage.alt = 'Lili';
      portraitImage.style.width = '100%';
      portraitImage.style.height = '100%';
      portraitImage.style.objectFit = 'cover';
      portraitImage.style.borderRadius = '50%';
      portrait.replaceChildren(portraitImage);
    }

    const originalGenerateTexture = Phaser.GameObjects.Graphics.prototype.generateTexture;
    Phaser.GameObjects.Graphics.prototype.generateTexture = function (key, width, height) {
      const external = window.GARDEN_EXTERNAL_IMAGES?.[key];
      if (!external) return originalGenerateTexture.call(this, key, width, height);

      try {
        const textures = this.scene.sys.textures;
        if (!textures.exists(key)) textures.addImage(key, external);
        return this;
      } catch (error) {
        console.warn(`Externí asset ${key} selhal, používám bezpečnou kresbu.`, error);
        return originalGenerateTexture.call(this, key, width, height);
      }
    };

    return Object.keys(images).length > 0;
  })();
})();