(() => {
  const factors = {
    lili: 1.45,
    star: 3.0,
    key: 2.7,
    pond: 2.0,
    gate: 3.0
  };

  const imagePrototype = Phaser.GameObjects.Image.prototype;
  const originalSetDisplaySize = imagePrototype.setDisplaySize;

  imagePrototype.setDisplaySize = function (width, height) {
    const key = this.texture?.key;
    const factor = factors[key] ?? 1;
    const result = originalSetDisplaySize.call(this, width * factor, height * factor);

    if (factor > 1) {
      this.setDataEnabled?.();
      this.setData?.('gardenVisualScale', factor);
    }

    return result;
  };

  // Hvězdy a otevřená brána používají tweens s absolutní hodnotou scale.
  // Bez této opravy animace přepíše zvětšenou velikost zpět na scale 1.
  const tweenPrototype = Phaser.Tweens.TweenManager.prototype;
  const originalAdd = tweenPrototype.add;

  tweenPrototype.add = function (config) {
    const targets = Phaser.Utils.Array.SafeRange
      ? (Array.isArray(config?.targets) ? config.targets : [config?.targets])
      : (Array.isArray(config?.targets) ? config.targets : [config?.targets]);
    const target = targets.find(Boolean);
    const key = target?.texture?.key;
    const factor = factors[key] ?? 1;

    if (factor > 1 && config && typeof config.scale === 'number') {
      config = { ...config, scale: config.scale * factor };
    }
    if (factor > 1 && config && typeof config.scaleX === 'number') {
      config = { ...config, scaleX: config.scaleX * factor };
    }
    if (factor > 1 && config && typeof config.scaleY === 'number') {
      config = { ...config, scaleY: config.scaleY * factor };
    }

    return originalAdd.call(this, config);
  };
})();