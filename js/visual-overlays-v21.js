(() => {
  const PORTRAIT = window.innerHeight > window.innerWidth;
  const SIZES = PORTRAIT ? {
    lili: [104, 124],
    star: [76, 76],
    key: [92, 62],
    pond: [112, 72],
    gate: [128, 156]
  } : {
    lili: [112, 132],
    star: [82, 82],
    key: [102, 68],
    pond: [124, 80],
    gate: [142, 170]
  };

  const CROPS = {
    lili: { x: 7, y: 31, width: 109, height: 132 },
    star: { x: 50, y: 58, width: 59, height: 59 },
    gate: { x: 31, y: 47, width: 163, height: 201 }
  };

  let attachedScene = null;
  let mirrors = [];

  function destroyMirrors() {
    mirrors.forEach(item => item.visual?.destroy());
    mirrors = [];
    attachedScene = null;
  }

  function addMirror(scene, source, type) {
    if (!source?.texture) return;
    const visual = scene.add.image(source.x, source.y, source.texture.key)
      .setDepth((source.depth ?? 0) + 1)
      .setOrigin(source.originX ?? 0.5, source.originY ?? 0.5);

    const crop = CROPS[type];
    if (crop) visual.setCrop(crop.x, crop.y, crop.width, crop.height);
    const [width, height] = SIZES[type];
    visual.setDisplaySize(width, height);
    mirrors.push({ source, visual, type, width, height });
  }

  function attach(scene) {
    if (!scene?.player || !scene?.stars || !scene?.key || !scene?.gate || !scene?.ponds) return false;
    destroyMirrors();
    attachedScene = scene;

    addMirror(scene, scene.player, 'lili');
    scene.stars.getChildren().forEach(star => addMirror(scene, star, 'star'));
    addMirror(scene, scene.key, 'key');
    scene.ponds.getChildren().forEach(pond => addMirror(scene, pond, 'pond'));
    addMirror(scene, scene.gate, 'gate');

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, destroyMirrors);
    scene.events.on(Phaser.Scenes.Events.UPDATE, sync);
    return true;
  }

  function sync() {
    if (!attachedScene) return;
    const pulse = 1 + Math.sin(attachedScene.time.now / 280) * 0.06;

    for (const item of mirrors) {
      const { source, visual, type, width, height } = item;
      if (!source || !visual?.scene) continue;
      const alive = source.active !== false && source.visible !== false;
      visual.setVisible(alive);
      if (!alive) continue;

      visual.setPosition(source.x, source.y);
      visual.rotation = source.rotation;
      visual.flipX = source.flipX;
      visual.flipY = source.flipY;

      const factor = type === 'star' || type === 'key' || type === 'gate' ? pulse : 1;
      visual.setDisplaySize(width * factor, height * factor);
      visual.setAlpha(type === 'gate' ? (attachedScene.gateOpen ? 1 : 0.46) : 1);
      source.setAlpha(0.001);
    }
  }

  const timer = window.setInterval(() => {
    const game = Phaser.GAMES?.find(Boolean);
    const scene = game?.scene?.getScene?.('garden');
    if (!scene?.sys?.isActive?.()) return;
    if (scene !== attachedScene || mirrors.length === 0 || mirrors[0]?.source !== scene.player) attach(scene);
  }, 180);

  window.addEventListener('pagehide', () => window.clearInterval(timer), { once: true });
})();