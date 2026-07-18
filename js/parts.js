'use strict';
/* =========================================================================
 * parts.js — Beyblade X part database + combo stat computation
 *
 * A bey is assembled from three parts, just like the real X system:
 *   BLADE   — the big metal layer. Drives Attack / Defense / Stamina + weight.
 *   RATCHET — the "N-HH" middle piece (N teeth, HH height). Drives burst
 *             resistance and stability.
 *   BIT     — the tip. Drives movement pattern, spin drain and Xtreme-rail
 *             affinity.
 * ========================================================================= */

const Parts = (() => {

  // type -> UI color + special move
  const TYPES = {
    attack:  { label: 'ATTACK',  color: '#ff5f3c', special: 'XTREME RUSH',  spDesc: 'Rocket straight at the opponent for a smash hit.' },
    defense: { label: 'DEFENSE', color: '#3ec86e', special: 'IRON WALL',    spDesc: 'Brace for 2.5s: massive knockback + burst resistance.' },
    stamina: { label: 'STAMINA', color: '#38b6ff', special: 'SPIN SURGE',   spDesc: 'Instantly recover a chunk of spin power.' },
    balance: { label: 'BALANCE', color: '#c77dff', special: 'TORNADO DRIVE', spDesc: 'A quick dash plus a small spin recovery.' },
  };

  // unlock = total match wins needed before this blade is available to the player
  const BLADES = [
    { id: 'dran',    name: 'Dran Sword',    type: 'attack',  atk: 9,  def: 4, sta: 4,  wt: 36, style: 'sword',  lobes: 3, color: '#2f6df6', accent: '#ffb01f', unlock: 0,
      desc: 'Three great sword-wings built for one thing: huge smash hits.' },
    { id: 'hells',   name: 'Hells Scythe',  type: 'balance', atk: 6,  def: 6, sta: 6,  wt: 33, style: 'scythe', lobes: 3, color: '#8b3df0', accent: '#ff5470', unlock: 0,
      desc: 'Three reaper scythes that do a little of everything well.' },
    { id: 'wizarrow',name: 'Wizard Arrow',  type: 'stamina', atk: 3,  def: 5, sta: 9,  wt: 31, style: 'orb',    lobes: 4, color: '#19b6ff', accent: '#ffe45e', unlock: 0,
      desc: 'A smooth, round profile that just keeps on spinning.' },
    { id: 'knight',  name: 'Knight Shield', type: 'defense', atk: 3,  def: 9, sta: 6,  wt: 35, style: 'shield', lobes: 6, color: '#9fb4d8', accent: '#3559c9', unlock: 0,
      desc: 'A fortress of round shields that shrugs off smash attacks.' },
    { id: 'shark',   name: 'Shark Edge',    type: 'attack',  atk: 8,  def: 3, sta: 5,  wt: 34, style: 'sword',  lobes: 3, color: '#18c5c0', accent: '#0b3a56', unlock: 1,
      desc: 'Serrated fins slice upward for vicious uppercut hits.' },
    { id: 'leon',    name: 'Leon Claw',     type: 'balance', atk: 7,  def: 6, sta: 5,  wt: 34, style: 'claw',   lobes: 3, color: '#ffc226', accent: '#d23c2a', unlock: 2,
      desc: 'Lion claws with bite on offense and poise on defense.' },
    { id: 'viper',   name: 'Viper Tail',    type: 'stamina', atk: 4,  def: 6, sta: 8,  wt: 32, style: 'orb',    lobes: 5, color: '#4cd94c', accent: '#a13cf0', unlock: 3,
      desc: 'A coiled serpent that trades venomous late-game endurance.' },
    { id: 'cobalt',  name: 'Cobalt Drake',  type: 'attack',  atk: 9,  def: 4, sta: 4,  wt: 37, style: 'claw',   lobes: 4, color: '#2242e8', accent: '#8fd3ff', unlock: 4,
      desc: 'A heavyweight dragon forged for relentless Xtreme dashes.' },
    { id: 'phoenix', name: 'Phoenix Wing',  type: 'attack',  atk: 10, def: 5, sta: 4,  wt: 38, style: 'wing',   lobes: 3, color: '#e8262d', accent: '#ffa41f', unlock: 6,
      desc: 'The champion\'s blade. Massive wings, massive weight, massive hits.' },
    { id: 'wizrod',  name: 'Wizard Rod',    type: 'stamina', atk: 2,  def: 6, sta: 10, wt: 36, style: 'orb',    lobes: 6, color: '#5ad0ff', accent: '#f0f6ff', unlock: 8,
      desc: 'The endgame stamina monster. Nearly perfectly round, nearly eternal.' },
  ];

  // teeth = burst-lock strength, h = height (60 low / 70 mid / 80 tall)
  const RATCHETS = [
    { id: '3-60', teeth: 3, h: 60, wt: 6.5, desc: 'Low and aggressive. The classic attack ratchet.' },
    { id: '4-60', teeth: 4, h: 60, wt: 6.6, desc: 'Low height with a firmer 4-tooth lock.' },
    { id: '5-60', teeth: 5, h: 60, wt: 6.8, desc: 'Stable, hard to burst, hugs the stadium floor.' },
    { id: '9-60', teeth: 9, h: 60, wt: 7.0, desc: 'Nine shallow teeth: the burst-proof low ratchet.' },
    { id: '2-70', teeth: 2, h: 70, wt: 6.4, desc: 'Tall and risky — light lock, good hit angles.' },
    { id: '4-70', teeth: 4, h: 70, wt: 6.7, desc: 'Mid height all-rounder with a solid lock.' },
    { id: '3-80', teeth: 3, h: 80, wt: 6.9, desc: 'Tall profile that rides above low attacks.' },
    { id: '4-80', teeth: 4, h: 80, wt: 7.1, desc: 'Tall and secure — the stamina keeper\'s pick.' },
  ];

  // speed: self-propulsion, drain: spin cost multiplier, kbRes: knockback resist,
  // xdash: Xtreme-rail affinity (>=5 can catch the rail), lock: burst lock bonus
  const BITS = [
    { id: 'F',  name: 'Flat',      type: 'attack',  speed: 9, drain: 1.35, kbRes: 3, xdash: 9,  lock: 5, desc: 'Full-contact flat tip. Fast, wild, born for the Xtreme rail.' },
    { id: 'R',  name: 'Rush',      type: 'attack',  speed: 8, drain: 1.22, kbRes: 4, xdash: 8,  lock: 6, desc: 'A controlled flat that keeps some grip in the bank.' },
    { id: 'GF', name: 'Gear Flat', type: 'attack',  speed: 8, drain: 1.40, kbRes: 3, xdash: 10, lock: 5, desc: 'Geared teeth bite the rail for monster Xtreme dashes.' },
    { id: 'T',  name: 'Taper',     type: 'balance', speed: 5, drain: 1.05, kbRes: 5, xdash: 5,  lock: 6, desc: 'The jack of all tips. Decent speed, decent stamina.' },
    { id: 'B',  name: 'Ball',      type: 'stamina', speed: 2, drain: 0.80, kbRes: 5, xdash: 2,  lock: 6, desc: 'A smooth ball that sits center and out-spins everyone.' },
    { id: 'O',  name: 'Orb',       type: 'stamina', speed: 3, drain: 0.75, kbRes: 4, xdash: 3,  lock: 5, desc: 'Minimal friction, maximum spin time.' },
    { id: 'N',  name: 'Needle',    type: 'defense', speed: 2, drain: 0.95, kbRes: 8, xdash: 1,  lock: 7, desc: 'A sharp point that digs in and refuses to move.' },
    { id: 'D',  name: 'Dot',       type: 'defense', speed: 1, drain: 0.90, kbRes: 9, xdash: 1,  lock: 7, desc: 'A dimpled anchor. The hardest tip to knock around.' },
    { id: 'P',  name: 'Point',     type: 'defense', speed: 3, drain: 0.85, kbRes: 7, xdash: 2,  lock: 8, desc: 'A guarded point with a vice-grip burst lock.' },
  ];

  const byId = (list, id) => list.find(p => p.id === id);

  /** Assemble a combo and derive every number the physics engine needs. */
  function computeStats(blade, ratchet, bit) {
    const weight = blade.wt + ratchet.wt + 2; // bit ~2g

    const attack  = blade.atk + bit.speed * 0.25;
    const defense = blade.def + bit.kbRes * 0.40 + (ratchet.h === 70 ? 0.8 : 0);
    const stamina = blade.sta + (1.4 - bit.drain) * 5 + (ratchet.h === 80 ? 0.8 : 0);

    return {
      type: blade.type,
      weight,
      attack, defense, stamina,
      // spin
      baseRPM:   6200 + stamina * 260,
      // stamina's edge comes mostly from higher base RPM; decay varies gently
      spinDecay: Math.max(35, 90 - stamina) * bit.drain, // rpm/s
      // movement
      moveDrive: bit.speed * 36,                          // px/s^2 self-propulsion
      moveDamp:  Math.max(0.30, 0.78 - bit.speed * 0.032),// velocity damping /s
      xdash:     bit.xdash,
      // survivability
      kbBase:    1 + defense * 0.065 + (weight - 38) * 0.02, // knockback divisor
      burstMax:  4 + Math.round(ratchet.teeth / 3) + Math.round(bit.lock / 4),
      burstRes:  (0.78 + ratchet.teeth * 0.035) * (1 + (weight - 40) * 0.008),
      stability: (ratchet.h === 60 ? 1.15 : ratchet.h === 70 ? 1.0 : 0.9),
    };
  }

  function makeCombo(bladeId, ratchetId, bitId) {
    const blade = byId(BLADES, bladeId), ratchet = byId(RATCHETS, ratchetId), bit = byId(BITS, bitId);
    return {
      blade, ratchet, bit,
      stats: computeStats(blade, ratchet, bit),
      name: `${blade.name} ${ratchet.id}${bit.id}`,
    };
  }

  // CPU blader personas + curated combos per difficulty
  const CPU_BLADERS = {
    easy: {
      name: 'Rookie Riku', title: 'STREET BLADER',
      combos: [['dran', '3-60', 'B'], ['wizarrow', '4-70', 'T'], ['hells', '2-70', 'O'], ['knight', '3-80', 'F']],
    },
    normal: {
      name: 'Blader Kass', title: 'X CLUB ACE',
      combos: [['shark', '3-60', 'F'], ['knight', '9-60', 'N'], ['wizarrow', '4-80', 'B'], ['leon', '4-60', 'T'], ['hells', '4-70', 'R']],
    },
    hard: {
      name: 'Champion Ryu', title: 'X TOURNAMENT CHAMPION',
      combos: [['phoenix', '3-60', 'GF'], ['wizrod', '4-80', 'B'], ['cobalt', '4-60', 'F'], ['knight', '9-60', 'D'], ['viper', '5-60', 'O']],
    },
  };

  function cpuPick(diff) {
    const b = CPU_BLADERS[diff];
    const c = b.combos[Math.floor(Math.random() * b.combos.length)];
    return { blader: b, combo: makeCombo(c[0], c[1], c[2]) };
  }

  return { TYPES, BLADES, RATCHETS, BITS, byId, computeStats, makeCombo, CPU_BLADERS, cpuPick };
})();
