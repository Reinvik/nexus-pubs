/**
 * Utilidad de Sonido para el Escáner de Código de Barras y Acciones del POS
 * Utiliza Web Audio API (nativo en todos los navegadores, 0 latencia, funciona 100% offline)
 */

let audioCtx = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

// Obtener preferencia de sonido del usuario desde localStorage
export const isSoundEnabled = () => {
  try {
    const saved = localStorage.getItem('solago_pos_sound_enabled');
    return saved === null ? true : saved === 'true';
  } catch (e) {
    return true;
  }
};

export const setSoundEnabled = (enabled) => {
  try {
    localStorage.setItem('solago_pos_sound_enabled', enabled ? 'true' : 'false');
  } catch (e) {}
};

/**
 * Reproduce diferentes tipos de sonidos sintetizados en tiempo real
 * @param {'scan' | 'payment' | 'error' | 'click' | 'delete'} type
 */
export const playSound = (type = 'scan') => {
  if (!isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'scan') {
      // Pitido corto de escáner POS profesional (1250 Hz, 75ms)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1250, now);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
      osc.start(now);
      osc.stop(now + 0.075);
    } else if (type === 'payment' || type === 'sale_alert') {
      // Doble campana resonante de cobro estilo caja registradora moderna (E6 + B6)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.50, now); // C6
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.28, now + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1567.98, now + 0.12); // G6
      gain2.gain.setValueAtTime(0, now + 0.12);
      gain2.gain.linearRampToValueAtTime(0.35, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.7);
    } else if (type === 'error') {
      // Tono de alerta/error grave (frecuencia descendente)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(200, now + 0.18);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'delete') {
      // Tono sutil de eliminación
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(220, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else {
      // Click ligero
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    }
  } catch (e) {
    // Silencioso si no hay soporte de audio
  }
};

/**
 * Solicitar permiso para notificaciones nativas de escritorio / móvil
 */
export const requestNotificationPermission = async () => {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      try {
        return await Notification.requestPermission();
      } catch (e) {
        return 'denied';
      }
    }
    return Notification.permission;
  }
  return 'unsupported';
};

/**
 * Mostrar notificación nativa en Windows / Android / MacOS cuando entra una venta
 */
export const showNativeSaleNotification = (title, options = {}) => {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        icon: '/solago-emblem.png',
        badge: '/solago-emblem.png',
        ...options
      });
      setTimeout(() => notif.close(), 7000);
      return notif;
    } catch (e) {
      // Silencioso si el navegador bloquea en modo background
    }
  }
  return null;
};
