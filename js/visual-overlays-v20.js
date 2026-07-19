(() => {
  const FACTORS = {
    lili: 1.28,
    star: 1.75,
    key: 1.65,
    pond: 1.35,
    gate: 1.65
  };

  let attachedScene = null;
  let mirrors = [];

  function destroyMirrors() {
    for (const item of mirrors) item.visual?.destroy();
    mirrors = [];
    attachedScene = null;
  }

  function addMirror(scene, source, factor, type) {
    if (!source || !source.texture) return;

    const visual = scene.add.image(source.x, source.y, source.texture.key)
      .setDepth((source.depth ?? 0) + 1)
      .setOrigin(source.originX ?? 0.5, source.originY ?? 0.5);

    mirrors.push({ source, visual, factor, type });
  }

  function attach(scene) {
    if (!scene?.player || !scene?.stars || !scene?.key || !scene?.gate || !scene?.ponds) return false;

    destroyMirrors();
    attachedScene = scene;

    addMirror(scene, scene.player, FACTORS.lili, 'player');
    scene.stars.getChildren().forEach(star => addMirror(scene, star, FACTORS.star, 'star'));
    addMirror(scene, scene.key, FACTORS.key, 'key');
    scene.ponds.getChildren().forEach(pond => addMirror(scene, pond, FACTORS.pond, 'pond'));
    addMirror(scene, scene.gate, FACTORS.gate, 'gate');

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, destroyMirrors);
    scene.events.on(Phaser.Scenes.Events.UPDATE, sync);
    return true;
  }

  function sync() {
    if (!attachedScene) return;

    for (const item of mirrors) {
      const { source, visual, factor, type } = item;
      if (!source || !visual?.scene) continue;

      const alive = source.active !== false && source.visible !== false;
      visual.setVisible(alive);
      if (!alive) continue;

      visual.x = source.x;
      visual.y = source.y;
      visual.rotation = source.rotation;
      visual.flipX = source.flipX;
      visual.flipY = source.flipY;
      visual.setScale(source.scaleX * factor, source.scaleY * factor);

      if (type === 'gate') {
        visual.setAlpha(attachedScene.gateOpen ? 1 : 0.42);
      } else {
        visual.setAlpha(1);
      }

      // Původní objekt zůstává jako neviditelné fyzikální tělo.
      // Jeho velikost ani kolizní tvar se nemění.
      source.setAlpha(0.001);
    }
  }

  const timer = window.setInterval(() => {
    const game = Phaser.GAMES?.find(Boolean);
    const scene = game?.scene?.getScene?.('garden');
    if (!scene?.sys?.isActive?.()) return;

    if (scene !== attachedScene || mirrors.length === 0 || mirrors[0]?.source !== scene.player) {
      attach(scene);
    }
  }, 250);

  window.addEventListener('pagehide', () => window.clearInterval(timer), { once: true });
})();
