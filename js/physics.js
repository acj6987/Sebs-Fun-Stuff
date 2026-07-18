'use strict';
/* =========================================================================
 * physics.js — the battle simulation.
 *
 * World space: origin at stadium center, +y is down (canvas convention).
 * The stadium is a bowl: a center-seeking force grows toward the edge.
 * Just inside the wall sits the XTREME RAIL — aggressive (flat-bit) beys
 * that hit it with enough tangential speed lock on, accelerate hard, then
 * slingshot across the stadium at their opponent (the X-dash).
 *
 * Three wall openings: two OVER pockets (2 pts) and the XTREME pocket
 * (3 pts). Get knocked through one and the round ends.
 * ========================================================================= */

const Physics = (() => {
  const WALL_R = 270;                 // playable bowl radius
  const RAIL_R = WALL_R - 20;         // radius the X-rail sits at
  const OUT_R  = WALL_R + 26;         // beyond this inside a pocket => out
  const TOPPLE_RPM = 450;             // below this, a bey falls over

  // Pocket openings, as center angle + half-width (radians).
  // atan2 space: +90° is the bottom of the screen (Xtreme pocket, front).
  const POCKETS = [
    { kind: 'x',    ang:  Math.PI / 2,     half: 0.22 },
    { kind: 'over', ang:  Math.PI * 7 / 6, half: 0.19 },  // upper-left
    { kind: 'over', ang: -Math.PI / 6,     half: 0.19 },  // upper-right
  ];
  // outward radial speed needed to fall through a pocket mouth:
  // low right after taking a hit (that's how KOs happen), high otherwise —
  // a bey under its own power grips the stadium floor.
  const POCKET_LIP_SMACKED = 240;
  const POCKET_LIP_GRIP = 640;

  function angDiff(a, b) {
    let d = a - b;
    while (d >  Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }
  function pocketAt(theta) {
    for (const p of POCKETS) if (Math.abs(angDiff(theta, p.ang)) < p.half) return p;
    return null;
  }

  /* ======================================================== Bey ========= */
  class Bey {
    constructor(combo, owner) {
      this.combo = combo;
      this.stats = combo.stats;
      this.owner = owner;                        // 0 = P1, 1 = P2/CPU
      this.radius = 23 + this.stats.weight * 0.14;
      this.mass = this.stats.weight;
      this.reset();
    }

    reset() {
      this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
      this.rpm = 0; this.launchRPM = 1;
      this.angle = Math.random() * 6.283;
      this.clicks = 0;
      this.dead = null; this.deadT = 0;
      this.state = 'free';                       // free | rail
      this.railAngle = 0; this.railDir = 1; this.railSpeed = 0;
      this.railMax = 0; this.railT = 0; this.railCD = 0;
      this.dashT = 0;                            // >0 => X-dash smash window
      this.gripT = 0;                            // >0 => tip grip: resists self-KO
      this.smackT = 0;                           // >0 => recently hit: can be KO'd
      this.braceT = 0;                           // >0 => IRON WALL active
      this.hitCD = 0; this.hitFlashT = 0;
      this.spGauge = 0; this.specialFlashT = 0;
      this.wobblePhase = Math.random() * 10;
      this.trail = [];
      this.pieces = null;                        // burst debris pieces
      this.time = 0;
      this.statsOut = { hits: 0, dashes: 0, maxImpact: 0 };
    }

    launch(x, y, power) {
      this.reset();
      this.x = x; this.y = y;
      const theta = Math.atan2(y, x);
      const vt = 150 + power * 250;              // tangential launch speed
      this.vx = -Math.sin(theta) * vt - Math.cos(theta) * 30;
      this.vy =  Math.cos(theta) * vt - Math.sin(theta) * 30;
      this.launchRPM = this.stats.baseRPM * (0.60 + 0.40 * power) * (power >= 0.97 ? 1.05 : 1);
      this.rpm = this.launchRPM;
    }

    get spinFrac() { return Math.max(0, this.rpm) / this.launchRPM; }
    get speed() { return Math.hypot(this.vx, this.vy); }

    die(kind, events) {
      if (this.dead) return;
      this.dead = { kind };
      this.state = 'free';
      if (kind === 'burst') {
        // blade / ratchet / bit fly apart
        this.pieces = [0, 1, 2].map(i => {
          const a = Math.random() * 6.283;
          const s = 160 + Math.random() * 260;
          return {
            layer: i, x: this.x, y: this.y,
            vx: Math.cos(a) * s + this.vx * 0.4,
            vy: Math.sin(a) * s + this.vy * 0.4,
            rot: this.angle, vrot: (Math.random() - 0.5) * 30,
          };
        });
      }
      events.push({ type: 'die', kind, bey: this, x: this.x, y: this.y });
    }

    /** IRON WALL / XTREME RUSH / SPIN SURGE / TORNADO DRIVE */
    useSpecial(opp, events) {
      if (this.dead || this.spGauge < 100) return false;
      this.spGauge = 0;
      this.specialFlashT = 0.6;
      const aim = () => {
        const dx = opp.x - this.x, dy = opp.y - this.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        return [dx / d, dy / d];
      };
      switch (this.stats.type) {
        case 'attack': {
          const [nx, ny] = aim();
          const s = 640;
          this.state = 'free'; this.railCD = Math.max(this.railCD, 0.8);
          this.vx = nx * s; this.vy = ny * s;
          this.dashT = 0.7; this.gripT = 1.3;
          break;
        }
        case 'defense':
          this.braceT = 2.5;
          break;
        case 'stamina':
          this.rpm = Math.min(this.launchRPM, this.rpm + this.launchRPM * 0.14);
          break;
        case 'balance': {
          const [nx, ny] = aim();
          this.vx = nx * 500; this.vy = ny * 500;
          this.dashT = 0.5; this.gripT = 1.1;
          this.rpm = Math.min(this.launchRPM, this.rpm + this.launchRPM * 0.05);
          break;
        }
      }
      events.push({ type: 'special', bey: this, x: this.x, y: this.y });
      return true;
    }

    update(dt, opp, events) {
      this.time += dt;

      if (this.dead) {
        this.deadT += dt;
        if (this.pieces) {
          for (const p of this.pieces) {
            p.x += p.vx * dt; p.y += p.vy * dt;
            p.vx *= 0.94; p.vy *= 0.94;
            p.rot += p.vrot * dt;
          }
        } else if (this.dead.kind === 'spin') {
          this.angle += dt * 2; // slow sad wobble on the floor
        }
        return;
      }

      const st = this.stats;
      this.railCD = Math.max(0, this.railCD - dt);
      this.dashT = Math.max(0, this.dashT - dt);
      this.gripT = Math.max(0, this.gripT - dt);
      this.smackT = Math.max(0, this.smackT - dt);
      this.braceT = Math.max(0, this.braceT - dt);
      this.hitCD = Math.max(0, this.hitCD - dt);
      this.hitFlashT = Math.max(0, this.hitFlashT - dt);
      this.specialFlashT = Math.max(0, this.specialFlashT - dt);
      this.spGauge = Math.min(100, this.spGauge + dt * 9);

      // ---- spin decay -----------------------------------------------------
      // escalates over the round so every battle resolves eventually
      let decay = (st.spinDecay + this.speed * 0.05) * (1 + this.time * 0.02);
      if (this.state === 'rail') decay += 140;
      this.rpm -= decay * dt;
      this.angle += (this.rpm / 60) * 6.283 * dt * 0.11;  // visually scaled down
      this.wobblePhase += dt * (3 + (1 - this.spinFrac) * 11);

      if (this.rpm <= TOPPLE_RPM) { this.die('spin', events); return; }

      // ---- movement -------------------------------------------------------
      if (this.state === 'rail') {
        this.updateRail(dt, opp, events);
      } else {
        this.updateFree(dt, events);
      }

      // ---- trail ----------------------------------------------------------
      this.trail.push({ x: this.x, y: this.y, t: 0 });
      for (const p of this.trail) p.t += dt;
      while (this.trail.length && this.trail[0].t > 0.22) this.trail.shift();
    }

    updateRail(dt, opp, events) {
      this.railSpeed = Math.min(this.railSpeed + 560 * dt, this.railMax);
      this.railAngle += this.railDir * (this.railSpeed / RAIL_R) * dt;
      this.railT -= dt;

      this.x = Math.cos(this.railAngle) * RAIL_R;
      this.y = Math.sin(this.railAngle) * RAIL_R;
      // expose real velocity so collisions on the rail hit hard
      this.vx = -Math.sin(this.railAngle) * this.railSpeed * this.railDir;
      this.vy =  Math.cos(this.railAngle) * this.railSpeed * this.railDir;

      if (Math.random() < dt * 40) events.push({ type: 'railSpark', x: this.x, y: this.y, bey: this });

      if (this.railT <= 0 || this.spinFrac < 0.12) {
        // slingshot: release aimed at the opponent (slight lead)
        const lead = 0.25;
        const tx = opp.dead ? 0 : opp.x + opp.vx * lead;
        const ty = opp.dead ? 0 : opp.y + opp.vy * lead;
        const dx = tx - this.x, dy = ty - this.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        const s = this.railSpeed * 1.05;
        this.vx = dx / d * s; this.vy = dy / d * s;
        this.state = 'free';
        this.dashT = 0.6;
        this.gripT = 1.3;
        this.railCD = 2.6;
        this.statsOut.dashes++;
        events.push({ type: 'dashRelease', bey: this, x: this.x, y: this.y });
      }
    }

    updateFree(dt, events) {
      const st = this.stats;
      const r = Math.hypot(this.x, this.y);
      const theta = Math.atan2(this.y, this.x);
      const cos = Math.cos(theta), sin = Math.sin(theta);

      // bowl: center-seeking force, stronger near the wall
      const slope = Math.pow(Math.min(1, r / WALL_R), 2);
      let ax = -cos * slope * 150;
      let ay = -sin * slope * 150;

      // bit self-propulsion while there's spin to burn
      if (this.spinFrac > 0.12 && this.dashT <= 0) {
        const sp = this.speed;
        const drive = st.moveDrive * (0.45 + 0.55 * this.spinFrac);
        if (sp > 30) {
          ax += this.vx / sp * drive;
          ay += this.vy / sp * drive;
        } else {
          ax += -sin * drive;
          ay +=  cos * drive;
        }
        // aggressive bits climb outward toward the rail once they have pace
        if (st.xdash >= 5 && sp > 130) {
          ax += cos * st.xdash * 11;
          ay += sin * st.xdash * 11;
        }
      }

      // IRON WALL hunkers toward center
      if (this.braceT > 0) { ax -= cos * 120; ay -= sin * 120; }

      this.vx += ax * dt;
      this.vy += ay * dt;
      const damp = Math.exp(-st.moveDamp * dt);
      this.vx *= damp; this.vy *= damp;
      // extra drag at runaway speeds (the bowl bleeds off dash momentum)
      const spd = this.speed;
      if (spd > 480) {
        const k = Math.max(0, spd - (spd - 480) * 1.1 * dt) / spd;
        this.vx *= k; this.vy *= k;
      }
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // ---- Xtreme rail catch ---------------------------------------------
      const rr = Math.hypot(this.x, this.y);
      const th = Math.atan2(this.y, this.x);
      const vt = -Math.sin(th) * this.vx + Math.cos(th) * this.vy; // tangential
      if (this.railCD <= 0 && st.xdash >= 5 && this.spinFrac > 0.18 &&
          rr > WALL_R * 0.76 && Math.abs(vt) > 165) {
        this.state = 'rail';
        this.railDir = vt >= 0 ? 1 : -1;
        this.railAngle = th;
        this.railSpeed = Math.max(Math.abs(vt), 280);
        this.railMax = 490 + st.xdash * 30;
        this.railT = 0.55 + Math.random() * 0.5 + st.xdash * 0.035;
        events.push({ type: 'railLock', bey: this, x: this.x, y: this.y });
        return;
      }

      // ---- wall & pockets ---------------------------------------------------
      if (rr > WALL_R - this.radius) {
        const pk = pocketAt(th);
        if (pk) {
          const vr = Math.cos(th) * this.vx + Math.sin(th) * this.vy; // outward
          const lip = (this.smackT > 0 && this.gripT <= 0) ? POCKET_LIP_SMACKED : POCKET_LIP_GRIP;
          if (rr <= WALL_R && vr > 0 && vr < lip) {
            // not enough momentum to clear the pocket lip — soft bounce
            const pen = rr - (WALL_R - this.radius);
            this.x -= Math.cos(th) * pen;
            this.y -= Math.sin(th) * pen;
            const vtan = -Math.sin(th) * this.vx + Math.cos(th) * this.vy;
            const nvr = -vr * 0.3, nvt = vtan * 0.93;
            this.vx = Math.cos(th) * nvr - Math.sin(th) * nvt;
            this.vy = Math.sin(th) * nvr + Math.cos(th) * nvt;
          } else if (rr > OUT_R) {
            this.die(pk.kind === 'x' ? 'xtreme' : 'over', events);
            return;
          }
        } else {
          // bounce off the wall
          const pen = rr - (WALL_R - this.radius);
          this.x -= Math.cos(th) * pen;
          this.y -= Math.sin(th) * pen;
          const vr = Math.cos(th) * this.vx + Math.sin(th) * this.vy;   // radial
          const vtan = -Math.sin(th) * this.vx + Math.cos(th) * this.vy;
          if (vr > 0) {
            const nvr = -vr * 0.5;
            const nvt = vtan * 0.95;
            this.vx = Math.cos(th) * nvr - Math.sin(th) * nvt;
            this.vy = Math.sin(th) * nvr + Math.cos(th) * nvt;
            this.rpm -= Math.min(80, vr * 0.18);
            if (vr > 130) events.push({ type: 'wall', x: this.x, y: this.y, power: vr / 400, bey: this });
          }
        }
      }
      if (rr > OUT_R + 60) this.die('over', events); // safety net
    }
  }

  /* ==================================================== collisions ====== */
  function collide(a, b, events) {
    if (a.dead || b.dead) return;
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    const minD = a.radius + b.radius;
    if (d >= minD || d === 0) return;

    const nx = dx / d, ny = dy / d;

    // positional separation (always)
    const overlap = minD - d;
    a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
    b.x += nx * overlap / 2; b.y += ny * overlap / 2;

    if (a.hitCD > 0 || b.hitCD > 0) return;

    const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
    const vn = rvx * nx + rvy * ny;
    if (vn > 0) return; // already separating
    const rel = -vn;

    // impulse with restitution
    const e = 0.7;
    const j = -(1 + e) * vn / (1 / a.mass + 1 / b.mass);
    a.vx -= j * nx / a.mass; a.vy -= j * ny / a.mass;
    b.vx += j * nx / b.mass; b.vy += j * ny / b.mass;

    // smash: attack stat converts impact into extra knockback for the OTHER bey
    const dashMulA = a.dashT > 0 ? 2.6 : (a.state === 'rail' ? 2.0 : 1);
    const dashMulB = b.dashT > 0 ? 2.6 : (b.state === 'rail' ? 2.0 : 1);
    const kbA = a.stats.kbBase * (a.braceT > 0 ? 3.4 : 1);
    const kbB = b.stats.kbBase * (b.braceT > 0 ? 3.4 : 1);
    const smashToB = (a.stats.attack * 11 + rel * 0.26) * dashMulA / kbB;
    const smashToA = (b.stats.attack * 11 + rel * 0.26) * dashMulB / kbA;
    b.vx += nx * smashToB; b.vy += ny * smashToB;
    a.vx -= nx * smashToA; a.vy -= ny * smashToA;

    // being smacked knocks you off the rail
    for (const bey of [a, b]) {
      if (bey.state === 'rail') {
        bey.state = 'free';
        bey.railCD = Math.max(bey.railCD, 1.2);
      }
    }

    // spin loss (defense resists a little; capped so one clash can't gut you).
    // The bey that initiated a dash smash powers through and keeps most of
    // its spin — aggression should pay, not punish.
    const selfShieldA = dashMulA > 1 ? 0.5 : 1;
    const selfShieldB = dashMulB > 1 ? 0.5 : 1;
    a.rpm -= Math.min(480, rel * (0.25 + b.stats.attack * 0.035) * dashMulB / (1 + a.stats.defense * 0.04)) * selfShieldA;
    b.rpm -= Math.min(480, rel * (0.25 + a.stats.attack * 0.035) * dashMulA / (1 + b.stats.defense * 0.04)) * selfShieldB;

    // burst clicks (IRON WALL blocks them entirely)
    // clicks use a gentler dash multiplier than knockback does
    const clickMulA = dashMulA > 1 ? 1.55 : 1, clickMulB = dashMulB > 1 ? 1.55 : 1;
    if (b.braceT <= 0) b.clicks += rel * a.stats.attack * 0.000085 * clickMulA / b.stats.burstRes;
    if (a.braceT <= 0) a.clicks += rel * b.stats.attack * 0.000085 * clickMulB / a.stats.burstRes;

    a.hitCD = b.hitCD = 0.12;
    a.hitFlashT = b.hitFlashT = 0.15;
    if (rel > 160 || smashToA > 60) a.smackT = 0.9;
    if (rel > 160 || smashToB > 60) b.smackT = 0.9;
    a.spGauge = Math.min(100, a.spGauge + 13);
    b.spGauge = Math.min(100, b.spGauge + 13);
    a.statsOut.hits++; b.statsOut.hits++;

    const impact = rel + Math.max(smashToA, smashToB);
    a.statsOut.maxImpact = Math.max(a.statsOut.maxImpact, impact);
    b.statsOut.maxImpact = Math.max(b.statsOut.maxImpact, impact);

    events.push({
      type: 'clash',
      x: a.x + nx * a.radius, y: a.y + ny * a.radius,
      power: Math.min(1.6, impact / 420),
      dash: dashMulA > 1 || dashMulB > 1,
    });

    if (b.clicks >= b.stats.burstMax) b.die('burst', events);
    if (a.clicks >= a.stats.burstMax) a.die('burst', events);

    // spin finish check right after a big spin-draining hit
    if (!a.dead && a.rpm <= TOPPLE_RPM) a.die('spin', events);
    if (!b.dead && b.rpm <= TOPPLE_RPM) b.die('spin', events);
  }

  return { WALL_R, RAIL_R, OUT_R, TOPPLE_RPM, POCKETS, Bey, collide, pocketAt, angDiff };
})();
