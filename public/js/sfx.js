/**
 * Little synthesised blips — no audio files to download. The AudioContext is
 * created on the first real interaction so browsers don't block it.
 */
let ctx = null;

function audio() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, { duration = 0.12, type = 'sine', gain = 0.06, delay = 0 } = {}) {
  const ac = audio();
  if (!ac) return;
  const start = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const vol = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  vol.gain.setValueAtTime(0, start);
  vol.gain.linearRampToValueAtTime(gain, start + 0.01);
  vol.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(vol).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export const sfx = {
  unlock() {
    audio();
  },
  hit() {
    tone(880, { type: 'triangle' });
    tone(1320, { delay: 0.06, duration: 0.1, type: 'triangle' });
  },
  miss() {
    tone(180, { type: 'sawtooth', duration: 0.18, gain: 0.05 });
  },
  ping() {
    tone(660, { duration: 0.1 });
  },
  join() {
    tone(523, { duration: 0.1 });
    tone(784, { delay: 0.09, duration: 0.14 });
  },
  win() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, { delay: i * 0.1, duration: 0.18, type: 'triangle' }));
  },
};
