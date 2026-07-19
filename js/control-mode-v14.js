// Bezpečné přepínání mezi gyroskopem a joystickem.
// Tento soubor se načítá před hlavní hrou, takže může při použití joysticku
// zastavit události náklonu dříve, než je zpracuje Phaser renderer.
(() => {
  let joystickActive = false;
  const status = () => document.querySelector('#sensor-status');

  const setJoystick = active => {
    joystickActive = active;
    window.__gardenJoystickActive = active;
    if (active) {
      window.dispatchEvent(new CustomEvent('garden-input-mode', { detail: 'joystick' }));
      const el = status();
      if (el) el.textContent = 'Joystick aktivní · gyroskop vypnutý';
    } else {
      window.dispatchEvent(new CustomEvent('garden-input-mode', { detail: 'gyro' }));
      const el = status();
      if (el) el.textContent = 'Gyroskop znovu aktivní';
    }
  };

  // Capture listener je registrovaný před listenerem hlavní hry.
  window.addEventListener('deviceorientation', event => {
    if (!joystickActive) return;
    event.stopImmediatePropagation();
  }, true);

  const attach = () => {
    const joystick = document.querySelector('#joystick');
    if (!joystick) return;

    joystick.addEventListener('pointerdown', () => setJoystick(true), true);
    joystick.addEventListener('pointerup', () => setJoystick(false), true);
    joystick.addEventListener('pointercancel', () => setJoystick(false), true);
    joystick.addEventListener('lostpointercapture', () => setJoystick(false), true);

    window.addEventListener('blur', () => setJoystick(false));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) setJoystick(false);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach, { once: true });
  } else {
    attach();
  }
})();
