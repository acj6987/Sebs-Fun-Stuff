/** Rendering for the room games. The server owns the rules; this just draws. */

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2), value);
    } else if (value === true) node.setAttribute(key, '');
    else if (value !== false && value != null) node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

function initials(name) {
  return (name || '?').trim().slice(0, 1).toUpperCase();
}

function avatar(person, size = 24) {
  return el('span', {
    class: 'avatar',
    style: `background:${person.color};width:${size}px;height:${size}px;font-size:${Math.round(size / 2.2)}px`,
    text: initials(person.name),
  });
}

function scoreboard(players, meId, { label = 'points', extra } = {}) {
  return el(
    'ol',
    { class: 'scoreboard' },
    players.map((p) =>
      el('li', { class: `score-row${p.id === meId ? ' is-me' : ''}` }, [
        avatar(p),
        el('span', { text: p.name }),
        extra ? el('span', { class: 'score-meta', text: extra(p) }) : null,
        el('span', { class: 'score-val', text: `${p.score} ${label}` }),
      ])
    )
  );
}

function head(title, note, buttons = []) {
  return el('div', { class: 'game-head' }, [
    el('h3', { text: title }),
    note ? el('span', { class: 'game-note', text: note }) : null,
    ...buttons,
  ]);
}

/* ---------------- Hit the Button ---------------- */

function renderHitTheButton(game, { meId, send }) {
  const playing = game.phase === 'playing';
  const note = playing
    ? `Round ${game.round} of ${game.rounds}`
    : game.phase === 'over'
      ? game.winner
        ? `${game.winner.name} wins with ${game.winner.score}!`
        : 'Nobody hit a single one. Rude.'
      : 'Hit the glowing button before anyone else.';

  const buttons = [];
  if (!playing) {
    buttons.push(
      el('button', {
        class: 'pill',
        text: game.phase === 'over' ? 'Play again' : 'Start!',
        onclick: () => send({ t: 'game', action: 'start' }),
      })
    );
  } else {
    buttons.push(
      el('button', { class: 'pill', text: 'Stop', onclick: () => send({ t: 'game', action: 'reset' }) })
    );
  }

  const board = el(
    'div',
    { class: 'board' },
    Array.from({ length: game.tiles }, (_, i) =>
      el('button', {
        class: `board-cell${playing && game.target === i ? ' is-target' : ''}`,
        text: playing && game.target === i ? '🎯' : '',
        'aria-label': `Button ${i + 1}`,
        disabled: !playing,
        onclick: () => send({ t: 'game', action: 'hit', tile: i }),
      })
    )
  );

  const flash = game.flash;
  const flashLine =
    flash && flash.kind === 'hit'
      ? `⚡ ${flash.name} got it in ${flash.reaction}ms`
      : flash && flash.kind === 'miss'
        ? `💤 ${flash.name} hit the wrong one`
        : flash && flash.kind === 'timeout'
          ? '⏰ Too slow — nobody got that one'
          : '';

  return [
    head(game.title, note, buttons),
    board,
    el('p', { class: 'game-note', text: flashLine, style: 'text-align:center;min-height:22px' }),
    scoreboard(game.players, meId, {
      label: 'hits',
      extra: (p) => (p.best ? `best ${p.best}ms` : p.misses ? `${p.misses} misses` : ''),
    }),
  ];
}

/* ---------------- Tic Tac Toe ---------------- */

function renderTicTacToe(game, { meId, send }) {
  const mySeat = game.seats.X && game.seats.X.id === meId ? 'X' : game.seats.O && game.seats.O.id === meId ? 'O' : null;
  const note = game.winner
    ? game.winner === 'draw'
      ? "It's a draw!"
      : `${game.winner} wins!`
    : mySeat
      ? mySeat === game.turn
        ? 'Your turn!'
        : 'Waiting for the other player…'
      : `${game.turn} to play`;

  const seatButton = (seat) => {
    const taken = game.seats[seat];
    if (taken) {
      const isMe = taken.id === meId;
      return el('button', {
        class: 'pill',
        text: `${seat}: ${taken.name}${isMe ? ' (you)' : ''} · ${taken.wins} won`,
        onclick: () => isMe && send({ t: 'game', action: 'stand' }),
        title: isMe ? 'Click to give up your seat' : '',
      });
    }
    return el('button', {
      class: 'pill',
      text: `Play as ${seat}`,
      onclick: () => send({ t: 'game', action: 'sit', seat }),
    });
  };

  const board = el(
    'div',
    { class: 'board' },
    game.board.map((value, i) =>
      el('button', {
        class: `board-cell${game.line && game.line.includes(i) ? ' is-win' : ''}`,
        text: value || '',
        'aria-label': value ? `${value} on square ${i + 1}` : `Empty square ${i + 1}`,
        disabled: Boolean(value) || Boolean(game.winner) || mySeat !== game.turn,
        onclick: () => send({ t: 'game', action: 'move', tile: i }),
      })
    )
  );

  return [
    head(game.title, note, [
      el('button', { class: 'pill', text: 'New round', onclick: () => send({ t: 'game', action: 'reset' }) }),
    ]),
    el('div', { class: 'seat-row' }, [seatButton('X'), seatButton('O')]),
    board,
  ];
}

/* ---------------- Rock Paper Scissors ---------------- */

const RPS = [
  { key: 'rock', emoji: '🪨' },
  { key: 'paper', emoji: '📄' },
  { key: 'scissors', emoji: '✂️' },
];

function renderRps(game, { meId, send }) {
  const me = game.players.find((p) => p.id === meId);
  const reveal = game.phase === 'reveal';
  const waiting = game.players.filter((p) => !p.ready).length;
  const note = reveal
    ? 'Next round in a moment…'
    : me && me.ready
      ? `Locked in. Waiting for ${waiting} more…`
      : 'Pick one — everyone throws at the same time.';

  const choices = el(
    'div',
    { class: 'choice-row' },
    RPS.map((c) =>
      el('button', {
        class: `choice-btn${me && me.ready && !reveal ? ' is-picked' : ''}`,
        text: c.emoji,
        'aria-label': c.key,
        disabled: reveal,
        onclick: () => send({ t: 'game', action: 'pick', choice: c.key }),
      })
    )
  );

  const throws = reveal
    ? el(
        'div',
        { class: 'choice-row' },
        game.players.map((p) =>
          el('div', { class: 'score-row' }, [
            avatar(p),
            el('span', { text: p.name }),
            el('span', {
              style: 'font-size:26px',
              text: p.choice ? RPS.find((c) => c.key === p.choice).emoji : '😴',
            }),
            el('span', { class: 'score-val', text: p.gained ? `+${p.gained}` : '' }),
          ])
        )
      )
    : null;

  return [
    head(game.title, note, [
      el('button', { class: 'pill', text: 'Reset scores', onclick: () => send({ t: 'game', action: 'reset' }) }),
    ]),
    reveal ? throws : choices,
    scoreboard(game.players, meId, { label: 'pts', extra: (p) => (!reveal && p.ready ? 'ready' : '') }),
  ];
}

const RENDERERS = {
  'hit-the-button': renderHitTheButton,
  'tic-tac-toe': renderTicTacToe,
  'rock-paper-scissors': renderRps,
};

export function renderGame(container, game, ctx) {
  container.replaceChildren();
  if (!game) {
    container.append(
      el('p', { class: 'game-note', text: 'Pick a game above and everyone in the room joins in.' })
    );
    return;
  }
  const renderer = RENDERERS[game.type];
  if (!renderer) {
    container.append(el('p', { class: 'game-note', text: 'That game is not available.' }));
    return;
  }
  container.append(...renderer(game, ctx));
}

export function renderPicker(container, list, activeType, send) {
  // Once a game is running the cards shrink out of the way.
  container.classList.toggle('is-compact', Boolean(activeType));
  const cards = list.map((g) =>
    el(
      'button',
      {
        class: `game-card${g.type === activeType ? ' is-active' : ''}`,
        onclick: () => send({ t: 'game-pick', game: g.type }),
      },
      [el('h3', { text: g.title }), el('p', { text: g.blurb })]
    )
  );
  if (activeType) {
    cards.push(
      el('button', { class: 'game-card is-close', onclick: () => send({ t: 'game-close' }) }, [
        el('h3', { text: '✖ Close game' }),
        el('p', { text: 'Back to just chatting.' }),
      ])
    );
  }
  container.replaceChildren(...cards);
}
