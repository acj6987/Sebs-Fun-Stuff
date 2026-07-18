'use strict';
/* =========================================================================
 * game.js — state machine, UI wiring, scoring and match flow.
 *
 * Match rules (real Beyblade X point system, first to 4):
 *   SPIN FINISH   +1  opponent stops spinning first
 *   OVER FINISH   +2  opponent knocked into a side pocket
 *   BURST FINISH  +2  opponent's bey bursts apart
 *   XTREME FINISH +3  opponent launched out through the Xtreme pocket
 * ========================================================================= */

const Game = (() => {
  const $  = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  const ROUND_LIMIT = 75;          // seconds per round before time-up judgment
  const WIN_POINTS = 4;

  const FINISH_INFO = {
    spin:   { pts: 1, label: 'SPIN FINISH',    cls: 'f-spin' },
    over:   { pts: 2, label: 'OVER FINISH',    cls: 'f-over' },
    burst:  { pts: 2, label: 'BURST FINISH',   cls: 'f-burst' },
    xtreme: { pts: 3, label: 'XTREME FINISH',  cls: 'f-xtreme' },
  };

  /* ------------------------------------------------------------ state -- */
  let state = 'title';             // title|mode|select|vs|launch|countdown|battle|roundend|result
  let stateT = 0;
  let globalT = 0;

  let mode = 'cpu';                // 'cpu' | '2p'
  let diff = 'normal';
  let cpuCtl = null;
  let cpuBlader = null;

  let combos = [null, null];
  let beys = [null, null];
  let score = [0, 0];
  let round = 0;
  let roundTime = 0;
  let roundLog = [];
  let events = [];
  let shake = 0;
  let timescale = 1;
  let paused = false;
  let roundDeaths = [];            // deaths recorded this round

  // launch minigame
  const launch = { locked: [false, false], val: [0, 0], power: [0, 0], cpuLockAt: 0 };
  let countStep = 0;

  // bey selection
  let selecting = 0;               // which player is building (2P)
  const sel = [
    { blade: 0, ratchet: 0, bit: 0 },
    { blade: 1, ratchet: 1, bit: 4 },
  ];

  // persistence
  let save = { wins: 0, losses: 0, muted: false };
  function loadSave() {
    try { Object.assign(save, JSON.parse(localStorage.getItem('beyx_save_v1') || '{}')); } catch (e) { /* fresh */ }
  }
  function persist() {
    try { localStorage.setItem('beyx_save_v1', JSON.stringify(save)); } catch (e) { /* private mode */ }
  }
  const unlockedBlades = () => Parts.BLADES.filter(b => b.unlock <= save.wins);

  /* ------------------------------------------------------- UI helpers -- */
  const SCREENS = ['screen-title', 'screen-mode', 'screen-select', 'screen-vs', 'screen-result'];
  function showScreen(id) {
    for (const s of SCREENS) $('#' + s).classList.toggle('hidden', s !== id);
  }
  function setState(s) { state = s; stateT = 0; }

  let bannerTimer = null;
  function banner(text, cls = '', dur = 1000) {
    const el = $('#banner');
    el.className = 'banner-show ' + cls;
    el.textContent = text;
    void el.offsetWidth; // restart CSS animation
    el.classList.add('pop');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { el.className = 'hidden'; }, dur);
  }

  function playerName(i) {
    if (i === 0) return mode === '2p' ? 'PLAYER 1' : 'YOU';
    return mode === '2p' ? 'PLAYER 2' : cpuBlader.name.toUpperCase();
  }

  /* ==================================================== SELECT SCREEN == */
  function beginSelect(playerIdx) {
    selecting = playerIdx;
    // clamp selection to unlocked range
    const pool = unlockedBlades();
    if (sel[playerIdx].blade >= pool.length) sel[playerIdx].blade = 0;
    $('#select-title').textContent =
      mode === '2p' ? `PLAYER ${playerIdx + 1} — BUILD YOUR BEY` : 'BUILD YOUR BEY';
    $('#select-unlock-info').textContent =
      `${pool.length}/${Parts.BLADES.length} blades unlocked — win VS CPU matches to unlock more`;
    showScreen('screen-select');
    refreshSelect();
  }

  function currentCombo(i) {
    const pool = unlockedBlades();
    const s = sel[i];
    return Parts.makeCombo(
      pool[s.blade % pool.length].id,
      Parts.RATCHETS[s.ratchet % Parts.RATCHETS.length].id,
      Parts.BITS[s.bit % Parts.BITS.length].id
    );
  }

  function refreshSelect() {
    const pool = unlockedBlades();
    const s = sel[selecting];
    const blade = pool[s.blade % pool.length];
    const ratchet = Parts.RATCHETS[s.ratchet % Parts.RATCHETS.length];
    const bit = Parts.BITS[s.bit % Parts.BITS.length];
    const combo = Parts.makeCombo(blade.id, ratchet.id, bit.id);
    const T = Parts.TYPES[combo.stats.type];

    $('#row-blade .part-name').textContent = blade.name;
    $('#row-blade .part-desc').textContent = blade.desc;
    $('#row-ratchet .part-name').textContent = ratchet.id;
    $('#row-ratchet .part-desc').textContent = ratchet.desc;
    $('#row-bit .part-name').textContent = `${bit.id} — ${bit.name}`;
    $('#row-bit .part-desc').textContent = bit.desc;

    $('#combo-name').textContent = combo.name;
    const chip = $('#combo-type');
    chip.textContent = T.label + ' TYPE';
    chip.style.background = T.color;

    const st = combo.stats;
    const setBar = (id, v) => { $(id).style.width = Math.min(100, v / 12 * 100) + '%'; };
    setBar('#bar-atk', st.attack);
    setBar('#bar-def', st.defense);
    setBar('#bar-sta', st.stamina);
    $('#stat-weight').textContent = st.weight.toFixed(1) + ' g';
    $('#stat-burst').textContent = st.burstMax + ' clicks';
    $('#stat-dash').textContent = st.xdash >= 5 ? 'YES (' + st.xdash + '/10)' : 'no';
    $('#sp-name').textContent = T.special;
    $('#sp-desc').textContent = T.spDesc;
  }

  function cyclePart(row, dir) {
    const s = sel[selecting];
    const pool = unlockedBlades();
    if (row === 'blade')   s.blade   = (s.blade + dir + pool.length) % pool.length;
    if (row === 'ratchet') s.ratchet = (s.ratchet + dir + Parts.RATCHETS.length) % Parts.RATCHETS.length;
    if (row === 'bit')     s.bit     = (s.bit + dir + Parts.BITS.length) % Parts.BITS.length;
    AudioX.sfx.click();
    refreshSelect();
  }

  function selectReady() {
    combos[selecting] = currentCombo(selecting);
    AudioX.sfx.lock();
    if (mode === '2p' && selecting === 0) {
      beginSelect(1);
      return;
    }
    if (mode === 'cpu') {
      const pick = Parts.cpuPick(diff);
      cpuBlader = pick.blader;
      combos[1] = pick.combo;
    }
    startMatch();
  }

  /* ======================================================= MATCH FLOW == */
  function startMatch() {
    score = [0, 0];
    round = 0;
    roundLog = [];
    beys = [new Physics.Bey(combos[0], 0), new Physics.Bey(combos[1], 1)];
    cpuCtl = mode === 'cpu' ? new AI.Controller(diff) : null;

    // VS splash
    $('#vs-name-1').textContent = playerName(0);
    $('#vs-bey-1').textContent = combos[0].name;
    $('#vs-name-2').textContent = playerName(1);
    $('#vs-sub-2').textContent = mode === 'cpu' ? cpuBlader.title : '';
    $('#vs-bey-2').textContent = combos[1].name;
    showScreen('screen-vs');
    setState('vs');
    AudioX.sfx.go();
    setupHUD();
  }

  function setupHUD() {
    for (let i = 0; i < 2; i++) {
      $(`#p${i + 1}-name`).textContent = playerName(i);
      $(`#p${i + 1}-bey`).textContent = combos[i].name;
      const T = Parts.TYPES[combos[i].stats.type];
      const btn = $(`#p${i + 1}-special`);
      btn.textContent = T.special;
      btn.style.setProperty('--type-color', T.color);
      // burst click pips
      const cl = $(`#p${i + 1}-clicks`);
      cl.innerHTML = '';
      for (let c = 0; c < combos[i].stats.burstMax; c++) {
        const d = document.createElement('div');
        d.className = 'click-pip';
        cl.appendChild(d);
      }
      // score pips
      const sc = $(`#p${i + 1}-score`);
      sc.innerHTML = '';
      for (let c = 0; c < WIN_POINTS; c++) {
        const d = document.createElement('div');
        d.className = 'score-pip';
        sc.appendChild(d);
      }
    }
    $('#hud').classList.remove('hidden');
  }

  function startLaunchPhase() {
    round++;
    roundDeaths = [];
    events = [];
    Particles.clear();
    beys[0].reset(); beys[1].reset();
    launch.locked = [false, false];
    launch.val = [0, 0];
    launch.power = [0, 0];
    launch.cpuLockAt = cpuCtl ? cpuCtl.launchDelay() : 0;
    showScreen(''); // hide all fullscreen panels
    $('#hud').classList.remove('hidden');
    $('#launch-panel').classList.remove('hidden');
    $('#round-label').textContent = 'ROUND ' + round;
    $('#lm-hint-1').textContent = 'PRESS SPACE';
    $('#lm-hint-2').textContent = mode === '2p' ? 'PRESS ENTER' : cpuBlader.name.toUpperCase() + '…';
    setState('launch');
  }

  function lockLaunch(i, power) {
    if (launch.locked[i]) return;
    launch.locked[i] = true;
    launch.power[i] = power;
    launch.val[i] = power * 100;
    AudioX.sfx.lock();
    const hint = $(`#lm-hint-${i + 1}`);
    hint.textContent = Math.round(power * 100) + '%' + (power >= 0.97 ? ' MAX!' : '');
    if (launch.locked[0] && launch.locked[1]) {
      $('#launch-panel').classList.add('hidden');
      countStep = 0;
      setState('countdown');
    }
  }

  function spawnBeys() {
    // P1 left, P2 right, both orbiting the same direction
    beys[0].launch(-135, -10, launch.power[0]);
    beys[1].launch(135, 10, launch.power[1]);
    for (const b of beys) {
      Particles.ring(b.x, b.y, '#ffffff', 8, 70, 0.35, 5);
      Particles.sparks(b.x, b.y, 14, Parts.TYPES[b.stats.type].color, 220);
    }
    AudioX.sfx.launch();
    if (launch.power[0] >= 0.97 || launch.power[1] >= 0.97) banner('MAX LAUNCH!', 'minor', 700);
    shake = 6;
  }

  /* ------------------------------------------------- battle & events -- */
  function processEvents() {
    for (const ev of events) {
      switch (ev.type) {
        case 'clash': {
          const n = Math.round(6 + ev.power * 16);
          Particles.sparks(ev.x, ev.y, n, '#ffd66e', 200 + ev.power * 320);
          Particles.sparks(ev.x, ev.y, Math.round(n / 2), '#ffffff', 150 + ev.power * 220);
          if (ev.power > 0.55) Particles.ring(ev.x, ev.y, '#ffffff', 6, 60 + ev.power * 60, 0.3, 3);
          AudioX.sfx.clash(ev.power);
          shake = Math.max(shake, 3 + ev.power * (ev.dash ? 16 : 9));
          break;
        }
        case 'wall':
          Particles.sparks(ev.x, ev.y, 6, '#9fb4d8', 180);
          AudioX.sfx.clash(ev.power * 0.5);
          break;
        case 'railLock':
          AudioX.sfx.rail();
          Particles.ring(ev.x, ev.y, '#33e0ff', 10, 70, 0.35, 3);
          break;
        case 'railSpark':
          Particles.sparks(ev.x, ev.y, 2, '#33e0ff', 160);
          break;
        case 'dashRelease':
          AudioX.sfx.dash();
          banner('XTREME DASH!', 'minor xdash', 700);
          Particles.ring(ev.x, ev.y, '#33e0ff', 12, 110, 0.4, 5);
          shake = Math.max(shake, 7);
          break;
        case 'special': {
          const T = Parts.TYPES[ev.bey.stats.type];
          AudioX.sfx.special();
          banner(T.special + '!', 'minor', 800);
          Particles.ring(ev.x, ev.y, T.color, 14, 130, 0.45, 6);
          Particles.motes(ev.x, ev.y, 16, T.color, 120);
          break;
        }
        case 'die':
          onDeath(ev);
          break;
      }
    }
    events = [];
  }

  function onDeath(ev) {
    const bey = ev.bey;
    if (roundDeaths.some(d => d.bey === bey)) return;
    const info = FINISH_INFO[ev.kind];
    roundDeaths.push({ bey, kind: ev.kind });

    const winner = 1 - bey.owner;
    score[winner] += info.pts; // uncapped so sudden-death ties can resolve; HUD caps the pips
    roundLog.push({ round, winner, kind: ev.kind, pts: info.pts });

    switch (ev.kind) {
      case 'burst':
        AudioX.sfx.burst();
        Particles.flash(ev.x, ev.y, 'rgba(255,220,150,0.9)', 160, 0.35);
        Particles.debris(ev.x, ev.y, 22, bey.combo.blade.color);
        Particles.sparks(ev.x, ev.y, 30, '#ffd66e', 420);
        shake = Math.max(shake, 22);
        break;
      case 'spin':
        AudioX.sfx.topple();
        break;
      case 'over':
        AudioX.sfx.pocket();
        Particles.sparks(ev.x, ev.y, 12, '#ffb01f', 260);
        shake = Math.max(shake, 10);
        break;
      case 'xtreme':
        AudioX.sfx.pocket();
        AudioX.sfx.dash();
        Particles.flash(ev.x, ev.y, 'rgba(51,224,255,0.8)', 170, 0.4);
        Particles.sparks(ev.x, ev.y, 26, '#33e0ff', 380);
        shake = Math.max(shake, 18);
        break;
    }

    banner(info.label + '!', info.cls, 1600);
    timescale = 0.22;                 // dramatic slow-mo
    setTimeout(() => AudioX.sfx.point(), 900);

    if (state === 'battle') setState('roundend');
    updateHUD();
  }

  function endRound() {
    AudioX.bgmStop();
    // match over? (ties keep going — sudden death)
    const p1Won = score[0] >= WIN_POINTS, p2Won = score[1] >= WIN_POINTS;
    if ((p1Won || p2Won) && score[0] !== score[1]) {
      showResult(score[0] > score[1] ? 0 : 1);
    } else {
      if (p1Won && p2Won) banner('SUDDEN DEATH!', 'f-xtreme', 1400);
      startLaunchPhase();
    }
  }

  function showResult(winner) {
    setState('result');
    $('#hud').classList.add('hidden');
    showScreen('screen-result');

    const youWon = winner === 0;
    $('#result-title').textContent =
      mode === '2p' ? `PLAYER ${winner + 1} WINS THE MATCH!`
                    : (youWon ? 'YOU WIN THE MATCH!' : `${cpuBlader.name.toUpperCase()} WINS THE MATCH`);
    $('#result-title').className = youWon || mode === '2p' ? 'result-win' : 'result-lose';
    $('#result-score').textContent = `${score[0]}  —  ${score[1]}`;

    const log = $('#result-log');
    log.innerHTML = '';
    for (const r of roundLog) {
      const li = document.createElement('div');
      li.className = 'log-row';
      li.innerHTML = `<span>R${r.round}</span><span>${playerName(r.winner)}</span>` +
                     `<span class="${FINISH_INFO[r.kind].cls}">${FINISH_INFO[r.kind].label}</span><span>+${r.pts}</span>`;
      log.appendChild(li);
    }

    // record + unlocks (VS CPU only)
    const unlockBox = $('#result-unlock');
    unlockBox.classList.add('hidden');
    if (mode === 'cpu') {
      const before = unlockedBlades().length;
      if (youWon) save.wins++; else save.losses++;
      persist();
      const newBlades = Parts.BLADES.filter(b => b.unlock > (youWon ? save.wins - 1 : save.wins) && b.unlock <= save.wins);
      if (youWon && newBlades.length && unlockedBlades().length > before) {
        unlockBox.textContent = '🔓 NEW BLADE UNLOCKED: ' + newBlades.map(b => b.name).join(', ') + '!';
        unlockBox.classList.remove('hidden');
        setTimeout(() => AudioX.sfx.unlock(), 800);
      }
      setTimeout(() => (youWon ? AudioX.sfx.win() : AudioX.sfx.lose()), 300);
    } else {
      setTimeout(() => AudioX.sfx.win(), 300);
    }
    updateTitleRecord();
  }

  function updateTitleRecord() {
    $('#title-record').textContent =
      save.wins + save.losses > 0 ? `CAREER  ${save.wins}W — ${save.losses}L` : '';
  }

  /* -------------------------------------------------------------- HUD -- */
  function updateHUD() {
    for (let i = 0; i < 2; i++) {
      const b = beys[i];
      if (!b) continue;
      $(`#p${i + 1}-spin`).style.width = (b.dead ? 0 : b.spinFrac * 100) + '%';
      $(`#p${i + 1}-sp`).style.width = b.spGauge + '%';
      const btn = $(`#p${i + 1}-special`);
      btn.classList.toggle('ready', !b.dead && b.spGauge >= 100 && state === 'battle');
      const pips = $(`#p${i + 1}-clicks`).children;
      const filled = Math.min(pips.length, Math.floor(b.clicks));
      for (let c = 0; c < pips.length; c++) {
        pips[c].classList.toggle('hit', c < filled);
        pips[c].classList.toggle('danger', filled >= pips.length - 1);
      }
      const spips = $(`#p${i + 1}-score`).children;
      const shown = Math.min(WIN_POINTS, score[i]);
      for (let c = 0; c < spips.length; c++) {
        spips[c].classList.toggle('got', c < shown);
      }
    }
    if (state === 'battle' || state === 'roundend') {
      $('#battle-time').textContent = Math.max(0, Math.ceil(ROUND_LIMIT - roundTime));
    }
  }

  function triggerSpecial(i) {
    if (state !== 'battle') return;
    const b = beys[i];
    if (b && b.useSpecial(beys[1 - i], events)) processEvents();
  }

  /* ============================================================ UPDATE == */
  function update(dt) {
    globalT += dt;
    if (paused) return;
    stateT += dt;

    // ease slow-mo back to realtime
    if (timescale < 1) timescale = Math.min(1, timescale + dt * 0.9);
    shake = Math.max(0, shake - dt * 40);

    switch (state) {
      case 'vs':
        if (stateT > 2.4) startLaunchPhase();
        break;

      case 'launch': {
        // oscillate unlocked meters
        for (let i = 0; i < 2; i++) {
          if (!launch.locked[i]) {
            const solo = mode === 'cpu' && i === 1;
            if (!solo) launch.val[i] = (Math.sin(stateT * 4.6 + i * 1.7) * 0.5 + 0.5) * 100;
          }
        }
        // CPU locks automatically
        if (mode === 'cpu' && !launch.locked[1] && stateT >= launch.cpuLockAt) {
          lockLaunch(1, cpuCtl.launchPower());
        }
        // stragglers auto-lock after 6s
        if (stateT > 6) {
          for (let i = 0; i < 2; i++) if (!launch.locked[i]) lockLaunch(i, launch.val[i] / 100);
        }
        $('#lm-fill-1').style.height = launch.val[0] + '%';
        $('#lm-fill-2').style.height = launch.val[1] + '%';
        break;
      }

      case 'countdown': {
        const steps = [[0, '3'], [0.7, '2'], [1.4, '1'], [2.1, 'GO SHOOT!!']];
        while (countStep < steps.length && stateT >= steps[countStep][0]) {
          const txt = steps[countStep][1];
          banner(txt, countStep === 3 ? 'go' : 'count', countStep === 3 ? 900 : 550);
          if (countStep === 3) { AudioX.sfx.go(); spawnBeys(); }
          else AudioX.sfx.count();
          countStep++;
        }
        if (stateT >= 2.35) {
          roundTime = 0;
          setState('battle');
          AudioX.bgmStart();
        }
        break;
      }

      case 'battle': {
        const sdt = dt * timescale;
        roundTime += sdt;
        stepPhysics(sdt);

        // CPU special decisions
        if (cpuCtl && cpuCtl.update(sdt, beys[1], beys[0])) {
          if (beys[1].useSpecial(beys[0], events)) { /* handled below */ }
        }
        processEvents();

        // time-up judgment: higher remaining spin takes a Spin Finish point
        if (state === 'battle' && roundTime >= ROUND_LIMIT) {
          banner('TIME UP!', 'minor', 1000);
          const loser = beys[0].spinFrac >= beys[1].spinFrac ? 1 : 0;
          beys[loser].die('spin', events);
          processEvents();
        }
        updateHUD();
        break;
      }

      case 'roundend': {
        const sdt = dt * timescale;
        stepPhysics(sdt);
        processEvents();
        updateHUD();
        if (stateT > 2.6) endRound();
        break;
      }
    }

    Particles.update(dt * (state === 'battle' || state === 'roundend' ? timescale : 1));
  }

  function stepPhysics(sdt) {
    beys[0].update(sdt, beys[1], events);
    beys[1].update(sdt, beys[0], events);
    Physics.collide(beys[0], beys[1], events);
  }

  /* ============================================================== DRAW == */
  function draw(ctx) {
    const inArena = ['launch', 'countdown', 'battle', 'roundend'].includes(state);
    const railHot = inArena && beys.some(b => b && !b.dead && (b.state === 'rail' || b.dashT > 0));
    Renderer.drawArena(ctx, globalT, railHot);

    if (inArena && state !== 'launch' && state !== 'countdown') {
      // draw the losing/toppled bey under the live one
      const order = [...beys].sort((a, b) => (a.dead ? 0 : 1) - (b.dead ? 0 : 1));
      for (const b of order) Renderer.drawBey(ctx, b, globalT);
    } else if (state === 'countdown' && stateT >= 2.1) {
      for (const b of beys) Renderer.drawBey(ctx, b, globalT);
    }

    Particles.draw(ctx);

    // live previews on select / vs screens
    if (state === 'select') {
      Renderer.drawPreview($('#preview'), currentCombo(selecting), globalT);
    } else if (state === 'vs') {
      Renderer.drawPreview($('#vs-cv-1'), combos[0], globalT);
      Renderer.drawPreview($('#vs-cv-2'), combos[1], globalT);
    }
  }

  const getShake = () => shake;

  /* ============================================================= INPUT == */
  function key(e) {
    if (e.repeat) return;
    const code = e.code;

    // keep Space/Enter from re-triggering whatever button was last clicked
    if ((code === 'Space' || code === 'Enter') &&
        document.activeElement && document.activeElement.tagName === 'BUTTON') {
      document.activeElement.blur();
    }

    if (code === 'Escape' && ['launch', 'countdown', 'battle'].includes(state)) {
      togglePause();
      return;
    }
    if (paused) return;

    if (state === 'launch') {
      if (code === 'Space') { e.preventDefault(); lockLaunch(0, launch.val[0] / 100); }
      if (code === 'Enter' && mode === '2p') lockLaunch(1, launch.val[1] / 100);
      return;
    }
    if (state === 'battle') {
      if (code === 'Space') { e.preventDefault(); triggerSpecial(0); }
      if (code === 'Enter' && mode === '2p') triggerSpecial(1);
      return;
    }
    if (state === 'title' && (code === 'Space' || code === 'Enter')) {
      $('#btn-start').click();
    }
  }

  /** Canvas taps (touch/mouse): left half acts for P1, right half for P2. */
  function tap(clientX) {
    const rightSide = clientX > window.innerWidth / 2;
    const i = mode === '2p' && rightSide ? 1 : 0;
    if (state === 'launch') {
      if (mode === '2p' || i === 0) lockLaunch(i, launch.val[i] / 100);
    } else if (state === 'battle') {
      triggerSpecial(i);
    }
  }

  function togglePause() {
    paused = !paused;
    $('#modal-pause').classList.toggle('hidden', !paused);
    if (paused) AudioX.bgmStop(); else if (state === 'battle') AudioX.bgmStart();
  }

  function quitToMenu() {
    paused = false;
    $('#modal-pause').classList.add('hidden');
    $('#hud').classList.add('hidden');
    $('#launch-panel').classList.add('hidden');
    AudioX.bgmStop();
    Particles.clear();
    setState('mode');
    showScreen('screen-mode');
  }

  /* ============================================================== INIT == */
  function init() {
    loadSave();
    AudioX.setMuted(!!save.muted);
    updateTitleRecord();

    // ---- title / mode ----
    $('#btn-start').addEventListener('click', () => {
      AudioX.sfx.click();
      setState('mode');
      showScreen('screen-mode');
    });
    $$('.mode-btn').forEach(btn => btn.addEventListener('click', () => {
      AudioX.sfx.click();
      const m = btn.dataset.mode;
      if (m === '2p') { mode = '2p'; }
      else { mode = 'cpu'; diff = m.split('-')[1]; }
      setState('select');
      beginSelect(0);
    }));
    $('#btn-back-title').addEventListener('click', () => { AudioX.sfx.click(); setState('title'); showScreen('screen-title'); });

    // ---- select ----
    $$('.part-row').forEach(row => {
      row.querySelector('.arrow.prev').addEventListener('click', () => cyclePart(row.dataset.row, -1));
      row.querySelector('.arrow.next').addEventListener('click', () => cyclePart(row.dataset.row, 1));
    });
    $('#btn-ready').addEventListener('click', selectReady);
    $('#btn-select-back').addEventListener('click', () => {
      AudioX.sfx.click();
      if (mode === '2p' && selecting === 1) beginSelect(0);
      else { setState('mode'); showScreen('screen-mode'); }
    });

    // ---- battle HUD ----
    $('#p1-special').addEventListener('click', () => triggerSpecial(0));
    $('#p2-special').addEventListener('click', () => { if (mode === '2p') triggerSpecial(1); });

    // ---- result ----
    $('#btn-rematch').addEventListener('click', () => { AudioX.sfx.click(); startMatch(); });
    $('#btn-rebuild').addEventListener('click', () => { AudioX.sfx.click(); setState('select'); beginSelect(0); });
    $('#btn-menu').addEventListener('click', () => { AudioX.sfx.click(); setState('mode'); showScreen('screen-mode'); });

    // ---- help & pause & sound ----
    $('#btn-help').addEventListener('click', () => { AudioX.sfx.click(); $('#modal-help').classList.remove('hidden'); });
    $('#btn-help-close').addEventListener('click', () => { AudioX.sfx.click(); $('#modal-help').classList.add('hidden'); });
    $('#btn-mute').addEventListener('click', () => {
      save.muted = !save.muted;
      persist();
      AudioX.setMuted(save.muted);
      $('#btn-mute').textContent = save.muted ? 'SOUND: OFF' : 'SOUND: ON';
      if (!save.muted) AudioX.sfx.click();
    });
    $('#btn-mute').textContent = save.muted ? 'SOUND: OFF' : 'SOUND: ON';
    $('#btn-resume').addEventListener('click', togglePause);
    $('#btn-quit').addEventListener('click', quitToMenu);

    showScreen('screen-title');
  }

  return { init, update, draw, key, tap, getShake };
})();
