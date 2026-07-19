(() => {
  let joystickActive = false;
  const status = () => document.querySelector('#sensor-status');

  function sendNeutralOrientation() {
    const event = new Event('deviceorientation');
    Object.defineProperties(event, {
      beta: { value: 35 },
      gamma: { value: 0 },
      alpha: { value: 0 }
    });
    window.dispatchEvent(event);
  }

  function setJoystick(active) {
    if (active && !joystickActive) sendNeutralOrientation();
    joystickActive = active;
    window.__gardenJoystickActive = active;
    const el = status();
    if (el) {
      el.textContent = active
        ? 'Joystick aktivní · náklon vypnutý'
        : 'Náklon znovu aktivní';
    }
  }

  window.addEventListener('deviceorientation', event => {
    if (joystickActive && event.isTrusted) event.stopImmediatePropagation();
  }, true);

  function attach() {
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach, { once: true });
  } else {
    attach();
  }
})();