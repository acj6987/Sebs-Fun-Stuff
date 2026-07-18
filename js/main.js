'use strict';
/* =========================================================================
 * main.js — boot, canvas sizing, the game loop and raw input plumbing.
 * ========================================================================= */

(() => {
  const canvas = document.getElementById('arena');
  const ctx = canvas.getContext('2d');

  // World is designed around the stadium (radius 270 + casing).
  const WORLD_EXTENT = 760; // world units that must fit in the smaller axis

  let view = { w: 0, h: 0, scale: 1, dpr: 1 };

  function resize() {
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    canvas.width = view.w * view.dpr;
    canvas.height = view.h * view.dpr;
    canvas.style.width = view.w + 'px';
    canvas.style.height = view.h + 'px';
    view.scale = Math.min(view.w, view.h) / WORLD_EXTENT;
  }
  window.addEventListener('resize', resize);
  resize();

  // First user gesture unlocks WebAudio (browser autoplay policy).
  const unlockAudio = () => AudioX.init();
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);

  window.addEventListener('keydown', e => Game.key(e));
  canvas.addEventListener('pointerdown', e => Game.tap(e.clientX));

  Game.init();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    Game.update(dt);

    // ---- render ----
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.clearRect(0, 0, view.w, view.h);

    // subtle vignette backdrop
    const bg = ctx.createRadialGradient(view.w / 2, view.h / 2, 100, view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.7);
    bg.addColorStop(0, '#141a2c');
    bg.addColorStop(1, '#07090f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, view.w, view.h);

    const shake = Game.getShake();
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;

    ctx.save();
    ctx.translate(view.w / 2 + sx, view.h / 2 + sy);
    ctx.scale(view.scale, view.scale);
    Game.draw(ctx);
    ctx.restore();

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
