const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function loadBase64(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Asset ${path} se nepodařilo načíst.`);
  return (await response.text()).trim();
}

async function waitForGarden() {
  for (let i = 0; i < 120; i++) {
    const game = Phaser.GAMES?.find(Boolean);
    const scene = game?.scene?.getScene('garden');
    if (game && scene?.stars) return { game, scene };
    await wait(100);
  }
  throw new Error('Herní scéna nebyla připravena.');
}

async function applyIllustratedSkin() {
  try {
    const [starBase64, target] = await Promise.all([
      loadBase64('assets/generated/star.webp.txt?v=11'),
      waitForGarden()
    ]);
    const { game, scene } = target;
    const textureKey = 'illustrated-star-v11';

    if (!game.textures.exists(textureKey)) {
      await new Promise((resolve, reject) => {
        const onReady = key => {
          if (key !== textureKey) return;
          game.textures.off(Phaser.Textures.Events.ADD, onReady);
          resolve();
        };
        game.textures.on(Phaser.Textures.Events.ADD, onReady);
        game.textures.addBase64(textureKey, `data:image/webp;base64,${starBase64}`);
        setTimeout(() => reject(new Error('Vypršel čas načítání textury.')), 5000);
      });
    }

    scene.stars.getChildren().forEach((star, index) => {
      star.setTexture(textureKey).setDisplaySize(62, 62).setDepth(14);
      scene.tweens.killTweensOf(star);
      scene.tweens.add({
        targets: star,
        scale: { from: 0.9, to: 1.08 },
        angle: { from: -4, to: 4 },
        duration: 820 + index * 70,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut'
      });
      if (star.postFX) star.postFX.addGlow(0xffd23f, 3, 0, false, 0.12, 8);
    });

    // Přidá měkčí světlo a sytější vzhled celé zahradě bez zásahu do kolizí.
    scene.cameras.main.setPostPipeline?.([]);
    scene.cameras.main.setBackgroundColor('#66d7ff');
    document.documentElement.dataset.assetSkin = 'v11';
  } catch (error) {
    console.error('Ilustrovaný skin v11:', error);
  }
}

applyIllustratedSkin();
