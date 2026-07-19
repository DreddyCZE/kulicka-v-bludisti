(() => {
  const nativeAdd = window.addEventListener.bind(window);
  const orientationListeners = [];
  let joystickActive = false;
  let baseline = null;
  let samples = [];
  let calibrated = false;

  const status = () => document.querySelector('#sensor-status');

  function proxyOrientation(beta, gamma, source) {
    const event = new Event('deviceorientation');
    Object.defineProperties(event, {
      beta: { value: beta },
      gamma: { value: gamma },
      alpha: { value: source?.alpha ?? 0 },
      absolute: { value: source?.absolute ?? false }
    });
    return event;
  }

  function neutralize() {
    const neutral = proxyOrientation(35, 0);
    orientationListeners.forEach(listener => {
      try { listener.call(window, neutral); } catch (error) { console.warn(error); }
    });
  }

  function resetCalibration() {
    baseline = null;
    samples = [];
    calibrated = false;
    neutralize();
    const el = status();
    if (el) el.textContent = 'Polož telefon rovně · kalibruji…';
  }

  function deadzone(value, zone = 1.25) {
    if (Math.abs(value) <= zone) return 0;
    return value > 0 ? value - zone : value + zone;
  }

  window.addEventListener = function (type, listener, options) {
    if (type !== 'deviceorientation' || typeof listener !== 'function') {
      return nativeAdd(type, listener, options);
    }

    orientationListeners.push(listener);
    const wrapped = event => {
      if (joystickActive || event.beta == null || event.gamma == null) return;

      if (!calibrated) {
        samples.push({ beta: event.beta, gamma: event.gamma });
        listener.call(window, proxyOrientation(35, 0, event));
        const el = status();
        if (el) el.textContent = `Kalibruji náklon ${Math.min(samples.length, 8)}/8`;

        if (samples.length >= 8) {
          baseline = {
            beta: samples.reduce((sum, item) => sum + item.beta, 0) / samples.length,
            gamma: samples.reduce((sum, item) => sum + item.gamma, 0) / samples.length
          };
          calibrated = true;
          samples = [];
          if (el) el.textContent = 'Náklon zkalibrován ✓';
        }
        return;
      }

      const deltaBeta = deadzone(event.beta - baseline.beta);
      const deltaGamma = deadzone(event.gamma - baseline.gamma);
      listener.call(window, proxyOrientation(35 + deltaBeta, deltaGamma, event));
    };

    return nativeAdd(type, wrapped, options);
  };

  function setJoystick(active) {
    if (active && !joystickActive) neutralize();
    joystickActive = active;
    window.__gardenJoystickActive = active;
    const el = status();
    if (el) el.textContent = active
      ? 'Joystick aktivní · náklon vypnutý'
      : (calibrated ? 'Náklon znovu aktivní ✓' : 'Polož telefon rovně · kalibruji…');
  }

  function attach() {
    const joystick = document.querySelector('#joystick');
    const sensorStatus = status();
    if (joystick) {
      joystick.addEventListener('pointerdown', () => setJoystick(true), true);
      joystick.addEventListener('pointerup', () => setJoystick(false), true);
      joystick.addEventListener('pointercancel', () => setJoystick(false), true);
      joystick.addEventListener('lostpointercapture', () => setJoystick(false), true);
    }
    sensorStatus?.addEventListener('click', resetCalibration);
    nativeAdd('blur', () => setJoystick(false));
    nativeAdd('orientationchange', resetCalibration);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) setJoystick(false);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach, { once: true });
  else attach();
})();