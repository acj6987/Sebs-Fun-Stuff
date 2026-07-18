'use strict';
/* =========================================================================
 * audio.js — WebAudio synthesized sound. Zero audio files.
 * All SFX are built from oscillators + filtered noise, so the game works
 * fully offline from a single folder.
 * ========================================================================= */

const AudioX = (() => {
  let ctx = null;
  let master = null;
  let muted = false;
  let noiseBuf = null;

  // ---- BGM state ----
  let bgmOn = false;
  let bgmTimer = null;
  let bgmStep = 0;
  let bgmNext = 0;
  const BPM = 132;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);

    // 1s of white noise, reused by every noise-based effect
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 0.9;
  }
  const isMuted = () => muted;

  const now = () => ctx ? ctx.currentTime : 0;

  function env(gainNode, t, peak, attack, decay) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t);
    g.linearRampToValueAtTime(peak, t + attack);
    g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  function tone(t, { type = 'sine', f0 = 440, f1 = null, dur = 0.15, vol = 0.3, attack = 0.005 }) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== null) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    env(g, t, vol, attack, dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + attack + 0.05);
  }

  function noise(t, { dur = 0.2, vol = 0.3, type = 'bandpass', f0 = 2000, f1 = null, q = 1, attack = 0.003 }) {
    if (!ctx) return;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const flt = ctx.createBiquadFilter(); flt.type = type; flt.Q.value = q;
    flt.frequency.setValueAtTime(f0, t);
    if (f1 !== null) flt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    env(g, t, vol, attack, dur);
    s.connect(flt).connect(g).connect(master);
    s.start(t); s.stop(t + dur + attack + 0.05);
  }

  // ------------------------------------------------------------------ SFX
  const sfx = {
    click()    { if (!ctx) return; tone(now(), { type: 'square', f0: 620, dur: 0.05, vol: 0.08 }); },
    hover()    { if (!ctx) return; tone(now(), { type: 'square', f0: 380, dur: 0.03, vol: 0.04 }); },
    lock()     { if (!ctx) return; const t = now(); tone(t, { type: 'square', f0: 300, f1: 700, dur: 0.09, vol: 0.15 }); noise(t, { dur: 0.08, vol: 0.1, f0: 4000 }); },
    count()    { if (!ctx) return; tone(now(), { type: 'square', f0: 440, dur: 0.12, vol: 0.18 }); },
    go()       { if (!ctx) return; const t = now(); tone(t, { type: 'square', f0: 880, dur: 0.3, vol: 0.22 }); tone(t, { type: 'sawtooth', f0: 220, f1: 440, dur: 0.3, vol: 0.12 }); },
    launch()   { if (!ctx) return; const t = now();
      noise(t, { dur: 0.45, vol: 0.35, type: 'bandpass', f0: 900, f1: 4500, q: 0.7 });
      tone(t, { type: 'sawtooth', f0: 90, f1: 30, dur: 0.35, vol: 0.25 }); },
    clash(p = 0.5) { if (!ctx) return; const t = now(); const v = 0.12 + Math.min(0.45, p * 0.4);
      noise(t, { dur: 0.09 + p * 0.08, vol: v, type: 'highpass', f0: 2500, q: 0.6 });
      tone(t, { type: 'triangle', f0: 1400 + Math.random() * 900, f1: 300, dur: 0.08, vol: v * 0.7 });
      tone(t, { type: 'sine', f0: 120, f1: 55, dur: 0.12, vol: v * 0.8 }); },
    rail()     { if (!ctx) return; const t = now();
      tone(t, { type: 'sawtooth', f0: 200, f1: 900, dur: 0.5, vol: 0.14 });
      noise(t, { dur: 0.5, vol: 0.1, f0: 1200, f1: 5200, q: 2 }); },
    dash()     { if (!ctx) return; const t = now();
      noise(t, { dur: 0.3, vol: 0.3, type: 'bandpass', f0: 500, f1: 6000, q: 1 });
      tone(t, { type: 'square', f0: 700, f1: 1400, dur: 0.2, vol: 0.12 }); },
    special()  { if (!ctx) return; const t = now();
      tone(t, { type: 'sawtooth', f0: 300, f1: 1200, dur: 0.35, vol: 0.16 });
      tone(t + 0.05, { type: 'square', f0: 600, f1: 1800, dur: 0.3, vol: 0.1 }); },
    burst()    { if (!ctx) return; const t = now();
      noise(t, { dur: 0.7, vol: 0.5, type: 'lowpass', f0: 6000, f1: 200, q: 0.5 });
      tone(t, { type: 'sine', f0: 150, f1: 35, dur: 0.6, vol: 0.4 });
      for (let i = 0; i < 5; i++) tone(t + 0.05 + i * 0.05, { type: 'square', f0: 900 - i * 120, dur: 0.05, vol: 0.08 }); },
    pocket()   { if (!ctx) return; const t = now();
      tone(t, { type: 'sine', f0: 400, f1: 60, dur: 0.5, vol: 0.3 });
      noise(t + 0.15, { dur: 0.3, vol: 0.2, type: 'lowpass', f0: 900, f1: 150 }); },
    topple()   { if (!ctx) return; const t = now();
      noise(t, { dur: 0.35, vol: 0.15, type: 'lowpass', f0: 1200, f1: 200 });
      tone(t, { type: 'triangle', f0: 220, f1: 70, dur: 0.4, vol: 0.15 }); },
    point()    { if (!ctx) return; const t = now();
      tone(t, { type: 'square', f0: 660, dur: 0.1, vol: 0.15 });
      tone(t + 0.11, { type: 'square', f0: 990, dur: 0.16, vol: 0.15 }); },
    win()      { if (!ctx) return; const t = now();
      [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.13, { type: 'square', f0: f, dur: 0.18, vol: 0.16 }));
      tone(t + 0.52, { type: 'square', f0: 1319, dur: 0.5, vol: 0.18 }); },
    lose()     { if (!ctx) return; const t = now();
      [392, 349, 311, 262].forEach((f, i) => tone(t + i * 0.16, { type: 'triangle', f0: f, dur: 0.22, vol: 0.16 })); },
    unlock()   { if (!ctx) return; const t = now();
      [784, 988, 1175, 1568].forEach((f, i) => tone(t + i * 0.09, { type: 'triangle', f0: f, dur: 0.25, vol: 0.14 })); },
  };

  // ------------------------------------------------------------------ BGM
  // A minimal driving battle loop: kick / hat / bass, scheduled ahead of time.
  const BASS = [55, 55, 65.4, 73.4, 55, 55, 82.4, 73.4]; // A1 A1 C2 D2 A1 A1 E2 D2

  function scheduleStep(step, t) {
    const beat16 = step % 16;
    if (beat16 % 4 === 0) { // kick
      tone(t, { type: 'sine', f0: 140, f1: 42, dur: 0.16, vol: 0.20 });
    }
    if (beat16 % 4 === 2) { // hat
      noise(t, { dur: 0.03, vol: 0.05, type: 'highpass', f0: 8000 });
    }
    if (beat16 % 2 === 0) { // bass
      const n = BASS[(step >> 1) % BASS.length];
      tone(t, { type: 'sawtooth', f0: n, dur: 0.16, vol: 0.075, attack: 0.01 });
    }
  }

  function bgmStart() {
    if (!ctx || bgmOn) return;
    bgmOn = true;
    bgmStep = 0;
    bgmNext = ctx.currentTime + 0.1;
    const stepDur = 60 / BPM / 4;
    bgmTimer = setInterval(() => {
      if (!bgmOn) return;
      while (bgmNext < ctx.currentTime + 0.25) {
        scheduleStep(bgmStep, bgmNext);
        bgmNext += stepDur;
        bgmStep++;
      }
    }, 80);
  }

  function bgmStop() {
    bgmOn = false;
    if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
  }

  return { init, sfx, setMuted, isMuted, bgmStart, bgmStop };
})();
