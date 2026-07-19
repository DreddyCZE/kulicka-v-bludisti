(() => {
  const factors = {
    lili: 1.35,
    star: 1.85,
    key: 1.75,
    pond: 1.45,
    gate: 1.75
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
})();
