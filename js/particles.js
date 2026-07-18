'use strict';
/* =========================================================================
 * particles.js — sparks, shockwaves, rings and burst debris.
 * Everything is drawn additively for that arcade energy look.
 * ========================================================================= */

const Particles = (() => {
  let list = [];

  function clear() { list = []; }

  /** Directional metal sparks (collisions, wall hits). */
  function sparks(x, y, n, color, speed = 260, spread = Math.PI * 2, baseAng = 0) {
    for (let i = 0; i < n; i++) {
      const a = baseAng + (Math.random() - 0.5) * spread;
      const s = speed * (0.35 + Math.random() * 0.9);
      list.push({
        kind: 'spark', x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0, max: 0.25 + Math.random() * 0.3,
        size: 1.5 + Math.random() * 2.5, color,
      });
    }
  }

  /** Expanding ring (launches, specials, finishes). */
  function ring(x, y, color, r0 = 10, r1 = 90, dur = 0.4, width = 4) {
    list.push({ kind: 'ring', x, y, life: 0, max: dur, r0, r1, width, color });
  }

  /** Big radial flash used for bursts. */
  function flash(x, y, color, r = 120, dur = 0.3) {
    list.push({ kind: 'flash', x, y, life: 0, max: dur, r, color });
  }

  /** Small drifting glow motes (special auras, rail trail). */
  function motes(x, y, n, color, speed = 60) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random());
      list.push({
        kind: 'mote', x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20,
        life: 0, max: 0.4 + Math.random() * 0.5,
        size: 2 + Math.random() * 3, color,
      });
    }
  }

  /** Chunky debris used when a bey bursts. */
  function debris(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 120 + Math.random() * 320;
      list.push({
        kind: 'debris', x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        rot: Math.random() * 6.28, vrot: (Math.random() - 0.5) * 20,
        life: 0, max: 0.6 + Math.random() * 0.5,
        size: 3 + Math.random() * 6, color,
      });
    }
  }

  function update(dt) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life += dt;
      if (p.life >= p.max) { list.splice(i, 1); continue; }
      if (p.vx !== undefined) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.96; p.vy *= 0.96;
        if (p.kind === 'debris') { p.vy += 60 * dt; p.rot += p.vrot * dt; }
      }
    }
  }

  function draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of list) {
      const t = p.life / p.max;       // 0..1
      const fade = 1 - t;
      ctx.globalAlpha = fade;
      switch (p.kind) {
        case 'spark': {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * fade;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
          ctx.stroke();
          break;
        }
        case 'mote': {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * fade, 0, 6.283);
          ctx.fill();
          break;
        }
        case 'ring': {
          const r = p.r0 + (p.r1 - p.r0) * t;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.width * fade;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, 6.283);
          ctx.stroke();
          break;
        }
        case 'flash': {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * (0.4 + t));
          g.addColorStop(0, p.color);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * (0.4 + t), 0, 6.283);
          ctx.fill();
          break;
        }
        case 'debris': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
          break;
        }
      }
    }
    ctx.restore();
  }

  return { clear, sparks, ring, flash, motes, debris, update, draw };
})();
