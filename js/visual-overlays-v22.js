(() => {
  const PORTRAIT = window.innerHeight > window.innerWidth;
  const SIZES = PORTRAIT ? {
    lili: [138, 164],
    star: [112, 112],
    key: [132, 88],
    pond: [156, 100],
    gate: [184, 224]
  } : {
    lili: [148, 176],
    star: [120, 120],
    key: [144, 96],
    pond: [172, 110],
    gate: [202, 242]
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

  function addGlow(scene, source, type) {
    if (!['star', 'key', 'gate'].includes(type)) return null;
    const glowSize = type === 'gate' ? [210, 250] : type === 'key' ? [150, 104] : [130, 130];
    return scene.add.ellipse(source.x, source.y, glowSize[0], glowSize[1], type === 'gate' ? 0xa86cff : 0xffe65a, type === 'gate' ? 0.18 : 0.22)
      .setDepth((source.depth ?? 0) + 0.5);
  }

  function addMirror(scene, source, type) {
    if (!source?.texture) return;
    const glow = addGlow(scene, source, type);
    const visual = scene.add.image(source.x, source.y, source.texture.key)
      .setDepth((source.depth ?? 0) + 1)
      .setOrigin(source.originX ?? 0.5, source.originY ?? 0.5);

    const crop = CROPS[type];
    if (crop) visual.setCrop(crop.x, crop.y, crop.width, crop.height);
    const [width, height] = SIZES[type];
    visual.setDisplaySize(width, height);
    mirrors.push({ source, visual, glow, type, width, height });
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
    const pulse = 1 + Math.sin(attachedScene.time.now / 260) * 0.075;

    for (const item of mirrors) {
      const { source, visual, glow, type, width, height } = item;
      if (!source || !visual?.scene) continue;
      const alive = source.active !== false && source.visible !== false;
      visual.setVisible(alive);
      glow?.setVisible(alive);
      if (!alive) continue;

      visual.setPosition(source.x, source.y);
      visual.rotation = source.rotation;
      visual.flipX = source.flipX;
      visual.flipY = source.flipY;

      const factor = ['star', 'key', 'gate'].includes(type) ? pulse : 1;
      visual.setDisplaySize(width * factor, height * factor);
      visual.setAlpha(type === 'gate' ? (attachedScene.gateOpen ? 1 : 0.5) : 1);

      if (glow) {
        glow.setPosition(source.x, source.y);
        glow.setScale(factor);
        glow.setAlpha(type === 'gate' ? (attachedScene.gateOpen ? 0.34 : 0.12) : 0.2);
      }

      source.setAlpha(0.001);
    }
  }

  const timer = window.setInterval(() => {
    const game = Phaser.GAMES?.find(Boolean);
    const scene = game?.scene?.getScene?.('garden');
    if (!scene?.sys?.isActive?.()) return;
    if (scene !== attachedScene || mirrors.length === 0 || mirrors[0]?.source !== scene.player) attach(scene);
  }, 160);

  window.addEventListener('pagehide', () => window.clearInterval(timer), { once: true });
})();
