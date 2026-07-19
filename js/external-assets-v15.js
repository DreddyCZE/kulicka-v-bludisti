(() => {
  async function loadBase64Image(path) {
    const base64 = (await fetch(path, { cache: 'no-store' })).text().then(text => text.trim());
    const value = await base64;
    if (!value.startsWith('iVBOR')) throw new Error('Neplatný PNG asset');
    const image = new Image();
    image.decoding = 'async';
    image.src = `data:image/png;base64,${value}`;
    await image.decode();
    return image;
  }

  window.GARDEN_ASSET_BOOT = (async () => {
    try {
      const lili = await loadBase64Image('./assets/generated/lili.png.b64?v=15');
      window.GARDEN_EXTERNAL_IMAGES = { lili };

      const portrait = document.querySelector('.portrait');
      if (portrait) {
        portrait.replaceChildren(lili.cloneNode());
        const img = portrait.querySelector('img');
        if (img) {
          img.alt = 'Lili';
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          img.style.borderRadius = '50%';
        }
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

      return true;
    } catch (error) {
      console.warn('Externí PNG asset se nepodařilo načíst. Hra použije bezpečný fallback.', error);
      return false;
    }
  })();
})();