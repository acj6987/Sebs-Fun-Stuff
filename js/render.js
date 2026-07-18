'use strict';
/* =========================================================================
 * render.js — all canvas drawing: the stadium, the beys (fully procedural,
 * no image assets), trails, auras and burst animations.
 * ========================================================================= */

const Renderer = (() => {
  const { WALL_R, RAIL_R, POCKETS } = Physics;

  /* -------------------------------------------------- blade silhouettes -- */
  // Each style is a radius-modulation function r(u) where u = angle within
  // one lobe segment in [0,1). Returns 0..1 multiplier of the outer radius.
  const STYLES = {
    sword:  u => 0.68 + 0.32 * Math.pow(1 - u, 1.6),                    // sawtooth: sharp trailing blades
    scythe: u => 0.70 + 0.30 * Math.pow(Math.max(0, 1 - u * 1.25), 2.2),// hooked, thinner tips
    wing:   u => 0.66 + 0.34 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.35)), 1.2),
    claw:   u => 0.72 + 0.28 * Math.pow(1 - Math.abs(u - 0.35) / 0.65, 2.5),
    shield: u => 0.86 + 0.14 * Math.sin(Math.PI * u),                   // rounded bumps
    orb:    u => 0.92 + 0.08 * Math.sin(Math.PI * u),                   // nearly circular
  };

  function bladePath(ctx, R, lobes, style) {
    const fn = STYLES[style] || STYLES.orb;
    const STEPS = 22 * lobes;
    ctx.beginPath();
    for (let i = 0; i <= STEPS; i++) {
      const a = (i / STEPS) * Math.PI * 2;
      const u = (i % (STEPS / lobes)) / (STEPS / lobes);
      const r = R * fn(u);
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  /* ------------------------------------------------------------ the bey -- */
  function drawBeyBody(ctx, combo, R, angle, opts = {}) {
    const { blade, ratchet, bit } = combo;
    const typeColor = Parts.TYPES[blade.type].color;

    ctx.save();
    ctx.rotate(angle);

    // dark under-disc
    ctx.fillStyle = '#10131c';
    ctx.beginPath(); ctx.arc(0, 0, R * 1.02, 0, 6.283); ctx.fill();

    // main blade layer w/ metallic gradient
    const g = ctx.createLinearGradient(-R, -R, R, R);
    g.addColorStop(0, shade(blade.color, 1.35));
    g.addColorStop(0.5, blade.color);
    g.addColorStop(1, shade(blade.color, 0.45));
    ctx.fillStyle = g;
    bladePath(ctx, R, blade.lobes, blade.style);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.stroke();

    // accent inner layer (rotated half a lobe for depth)
    ctx.save();
    ctx.rotate(Math.PI / blade.lobes);
    const g2 = ctx.createLinearGradient(-R, R, R, -R);
    g2.addColorStop(0, shade(blade.accent, 1.2));
    g2.addColorStop(1, shade(blade.accent, 0.5));
    ctx.fillStyle = g2;
    bladePath(ctx, R * 0.62, blade.lobes, blade.style);
    ctx.fill();
    ctx.restore();

    // ratchet ring with teeth
    const rr = R * 0.40;
    ctx.fillStyle = '#c7ccd8';
    ctx.beginPath();
    const teeth = ratchet.teeth;
    const TS = teeth * 8;
    for (let i = 0; i <= TS; i++) {
      const a = (i / TS) * Math.PI * 2;
      const u = (i % (TS / teeth)) / (TS / teeth);
      const r = rr * (0.86 + 0.14 * (u < 0.5 ? 1 : 0.72));
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#5a6070';
    ctx.lineWidth = 1;
    ctx.stroke();

    // bit
    ctx.fillStyle = typeColor;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.22, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.stroke();

    ctx.restore(); // un-rotate so the bit letter stays upright

    if (!opts.noLetter) {
      ctx.fillStyle = '#0c0f16';
      ctx.font = `bold ${Math.round(R * 0.24)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bit.id, 0, 1);
    }

    // fixed specular highlight (light source doesn't spin)
    const hl = ctx.createRadialGradient(-R * 0.4, -R * 0.4, 0, -R * 0.4, -R * 0.4, R * 1.2);
    hl.addColorStop(0, 'rgba(255,255,255,0.28)');
    hl.addColorStop(0.5, 'rgba(255,255,255,0.04)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill();
  }

  function shade(hex, mul) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) * mul) | 0;
    const g = Math.min(255, ((n >> 8) & 255) * mul) | 0;
    const b = Math.min(255, (n & 255) * mul) | 0;
    return `rgb(${r},${g},${b})`;
  }

  function drawBey(ctx, bey, t) {
    const typeColor = Parts.TYPES[bey.stats.type].color;

    // burst debris pieces
    if (bey.dead && bey.pieces) {
      const fade = Math.max(0, 1 - bey.deadT / 1.1);
      if (fade <= 0) return;
      ctx.save();
      ctx.globalAlpha = fade;
      for (const p of bey.pieces) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (p.layer === 0) {
          const g = ctx.createLinearGradient(-20, -20, 20, 20);
          g.addColorStop(0, shade(bey.combo.blade.color, 1.3));
          g.addColorStop(1, shade(bey.combo.blade.color, 0.5));
          ctx.fillStyle = g;
          bladePath(ctx, bey.radius, bey.combo.blade.lobes, bey.combo.blade.style);
          ctx.fill();
        } else if (p.layer === 1) {
          ctx.fillStyle = '#c7ccd8';
          ctx.beginPath(); ctx.arc(0, 0, bey.radius * 0.4, 0, 6.283); ctx.fill();
        } else {
          ctx.fillStyle = typeColor;
          ctx.beginPath(); ctx.arc(0, 0, bey.radius * 0.22, 0, 6.283); ctx.fill();
        }
        ctx.restore();
      }
      ctx.restore();
      return;
    }

    // toppled (spin finish): draw squashed + tilted, fading slightly
    const toppled = bey.dead && bey.dead.kind === 'spin';
    const fellOut = bey.dead && !toppled; // over/xtreme: sink + shrink
    if (fellOut) {
      const k = Math.max(0, 1 - bey.deadT / 0.5);
      if (k <= 0) return;
      ctx.save();
      ctx.globalAlpha = k;
      ctx.translate(bey.x, bey.y);
      ctx.scale(k, k);
      drawBeyBody(ctx, bey.combo, bey.radius, bey.angle, { noLetter: true });
      ctx.restore();
      return;
    }

    // motion trail
    if (!bey.dead && bey.trail.length > 2) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const hot = bey.dashT > 0 || bey.state === 'rail';
      for (const p of bey.trail) {
        const a = Math.max(0, 1 - p.t / 0.22) * (hot ? 0.28 : 0.10);
        ctx.globalAlpha = a;
        ctx.fillStyle = hot ? '#33e0ff' : bey.combo.blade.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, bey.radius * 0.8, 0, 6.283);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(bey.x, bey.y);

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 6, bey.radius * 0.95, bey.radius * 0.5, 0, 0, 6.283);
    ctx.fill();

    // low-spin wobble
    let wobA = 0;
    if (!bey.dead) {
      const w = Math.max(0, 1 - bey.spinFrac / 0.45); // grows as spin drops below 45%
      wobA = w * 4.5;
      ctx.translate(Math.sin(bey.wobblePhase * 2.1) * wobA, Math.cos(bey.wobblePhase * 1.7) * wobA);
      ctx.rotate(Math.sin(bey.wobblePhase) * w * 0.16);
    } else if (toppled) {
      const k = Math.min(1, bey.deadT / 0.4);
      ctx.rotate(0.5 * k);
      ctx.scale(1, 1 - 0.35 * k);
      ctx.globalAlpha = 0.85;
    }

    // auras
    if (!bey.dead) {
      if (bey.state === 'rail' || bey.dashT > 0) aura(ctx, bey.radius * 1.7, '#33e0ff', 0.5);
      if (bey.braceT > 0) {
        aura(ctx, bey.radius * 1.6, '#3ec86e', 0.45);
        ctx.strokeStyle = 'rgba(80,255,150,0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, bey.radius * 1.3 + Math.sin(t * 12) * 3, 0, 6.283);
        ctx.stroke();
      }
      if (bey.specialFlashT > 0) aura(ctx, bey.radius * (2.4 - bey.specialFlashT), typeColor, bey.specialFlashT);
      if (bey.hitFlashT > 0) aura(ctx, bey.radius * 1.5, '#ffffff', bey.hitFlashT * 2.4);
    }

    drawBeyBody(ctx, bey.combo, bey.radius, bey.angle);

    // burst danger indicator: red pulse when 1 click from bursting
    if (!bey.dead && bey.stats.burstMax - bey.clicks < 1.2) {
      ctx.strokeStyle = `rgba(255,60,60,${0.5 + 0.4 * Math.sin(t * 16)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, bey.radius * 1.12, 0, 6.283);
      ctx.stroke();
    }

    ctx.restore();
  }

  function aura(ctx, r, color, alpha) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha);
    const g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();
    ctx.restore();
  }

  /* ------------------------------------------------------------ stadium -- */
  function drawArena(ctx, t, railHot) {
    // outer casing
    ctx.save();
    const caseG = ctx.createRadialGradient(0, 0, WALL_R * 0.8, 0, 0, WALL_R * 1.35);
    caseG.addColorStop(0, '#232a3d');
    caseG.addColorStop(1, '#0d1120');
    ctx.fillStyle = caseG;
    ctx.beginPath(); ctx.arc(0, 0, WALL_R * 1.32, 0, 6.283); ctx.fill();

    // pocket chutes (dark drops behind the wall openings)
    for (const p of POCKETS) {
      ctx.save();
      ctx.rotate(p.ang);
      const grad = ctx.createLinearGradient(WALL_R - 10, 0, WALL_R * 1.28, 0);
      grad.addColorStop(0, '#05070d');
      grad.addColorStop(1, '#101625');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, WALL_R * 1.26, -p.half, p.half);
      ctx.closePath();
      ctx.fill();
      // pocket rim color: cyan for Xtreme, amber for Over
      ctx.strokeStyle = p.kind === 'x' ? 'rgba(51,224,255,0.9)' : 'rgba(255,176,31,0.8)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, WALL_R + 2, -p.half, p.half);
      ctx.stroke();
      // label
      ctx.fillStyle = p.kind === 'x' ? 'rgba(51,224,255,0.85)' : 'rgba(255,176,31,0.75)';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(WALL_R * 1.14, 0);
      ctx.rotate(-p.ang); // keep the label upright
      ctx.fillText(p.kind === 'x' ? 'XTREME  +3' : 'OVER  +2', 0, 4);
      ctx.restore();
      ctx.restore();
    }

    // bowl
    const bowlG = ctx.createRadialGradient(0, -40, 30, 0, 0, WALL_R);
    bowlG.addColorStop(0, '#2a3350');
    bowlG.addColorStop(0.55, '#1b2238');
    bowlG.addColorStop(1, '#12182b');
    ctx.fillStyle = bowlG;
    ctx.beginPath(); ctx.arc(0, 0, WALL_R, 0, 6.283); ctx.fill();

    // faint concentric guides
    ctx.strokeStyle = 'rgba(255,255,255,0.045)';
    ctx.lineWidth = 1;
    for (const rr of [0.28, 0.52]) {
      ctx.beginPath(); ctx.arc(0, 0, WALL_R * rr, 0, 6.283); ctx.stroke();
    }

    // giant X decal
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = '#33e0ff';
    ctx.lineWidth = 34;
    ctx.lineCap = 'round';
    const xr = WALL_R * 0.42;
    ctx.beginPath();
    ctx.moveTo(-xr, -xr); ctx.lineTo(xr, xr);
    ctx.moveTo(xr, -xr); ctx.lineTo(-xr, xr);
    ctx.stroke();
    ctx.restore();

    // XTREME RAIL — glowing dashed ring, pulses harder when someone rides it
    const pulse = 0.35 + 0.15 * Math.sin(t * 3) + (railHot ? 0.45 : 0);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(51,224,255,${pulse})`;
    ctx.lineWidth = 7;
    ctx.setLineDash([26, 14]);
    ctx.lineDashOffset = -t * 60;
    ctx.beginPath(); ctx.arc(0, 0, RAIL_R, 0, 6.283); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = `rgba(51,224,255,${pulse * 0.35})`;
    ctx.lineWidth = 16;
    ctx.beginPath(); ctx.arc(0, 0, RAIL_R, 0, 6.283); ctx.stroke();
    ctx.restore();

    // wall segments (between pockets)
    const edges = [];
    for (const p of POCKETS) edges.push([p.ang - p.half, p.ang + p.half]);
    edges.sort((a, b) => a[0] - b[0]);
    ctx.strokeStyle = '#39466b';
    ctx.lineWidth = 13;
    for (let i = 0; i < edges.length; i++) {
      const from = edges[i][1];
      const to = edges[(i + 1) % edges.length][0] + (i === edges.length - 1 ? Math.PI * 2 : 0);
      ctx.beginPath(); ctx.arc(0, 0, WALL_R + 5, from, to); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(140,170,230,0.35)';
    ctx.lineWidth = 3;
    for (let i = 0; i < edges.length; i++) {
      const from = edges[i][1];
      const to = edges[(i + 1) % edges.length][0] + (i === edges.length - 1 ? Math.PI * 2 : 0);
      ctx.beginPath(); ctx.arc(0, 0, WALL_R - 1, from, to); ctx.stroke();
    }
    ctx.restore();
  }

  /* --------------------------------------------- select-screen preview -- */
  function drawPreview(canvas, combo, t) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    const R = Math.min(w, h) * 0.36;
    // pedestal glow
    const typeColor = Parts.TYPES[combo.blade.type].color;
    const g = ctx.createRadialGradient(0, 0, R * 0.3, 0, 0, R * 1.6);
    g.addColorStop(0, hexA(typeColor, 0.25));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    drawBeyBody(ctx, combo, R, t * 2.2);
    ctx.restore();
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  return { drawArena, drawBey, drawPreview, drawBeyBody, hexA, shade };
})();
