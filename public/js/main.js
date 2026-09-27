import { createNet } from './net.js';
import { CallManager, micError } from './rtc.js';
import { renderGame, renderPicker, el } from './games.js';
import { sfx } from './sfx.js';

/* ---------------- elements ---------------- */

const $ = (sel) => document.querySelector(sel);
const gate = $('#gate');
const gateForm = $('#gate-form');
const gateError = $('#gate-error');
const gateSubmit = $('#gate-submit');
const nameInput = $('#name-input');
const codeInput = $('#code-input');

const app = $('#app');
const codeChip = $('#code-chip');
const codeText = $('#code-text');
const meName = $('#me-name');
const peoplePane = $('#people-pane');
const peopleList = $('#people-list');
const peopleCount = $('#people-count');
const callStatus = $('#call-status');
const callBtn = $('#call-btn');
const callControls = $('#call-controls');
const micBtn = $('#mic-btn');
const camBtn = $('#cam-btn');
const hangupBtn = $('#hangup-btn');
const stage = $('#stage');
const tilesBox = $('#tiles');
const audioHint = $('#audio-hint');
const messagesBox = $('#messages');
const typingBox = $('#typing');
const reactionsBox = $('#reactions');
const chatForm = $('#chat-form');
const chatInput = $('#chat-input');
const gameBanner = $('#game-banner');
const gamePicker = $('#game-picker');
const gameView = $('#game-view');
const toasts = $('#toasts');
const emojiLayer = $('#emoji-layer');

const REACTIONS = ['😂', '🎉', '🔥', '❤️', '👍', '😮', '🤯', '👋'];
const STORE_KEY = 'sebs-fun-stuff';

/* ---------------- state ---------------- */

const state = {
  me: null,
  room: null,
  members: [],
  game: null,
  gameList: [],
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  seenMessages: new Set(),
  typing: new Map(),
  lastFlash: '',
  nudgedToGames: false,
  tab: 'chat',
};

const net = createNet();
const call = new CallManager({
  send: (payload) => net.send(payload),
  iceServers: state.iceServers,
  onChange: () => {
    renderTiles();
    renderCallBox();
  },
  onToast: toast,
});

/* ---------------- helpers ---------------- */

function toast(text, ms = 3200) {
  const node = el('div', { class: 'toast', text });
  toasts.append(node);
  setTimeout(() => node.remove(), ms);
}

function initials(name) {
  return (name || '?').trim().slice(0, 1).toUpperCase();
}

function timeLabel(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function remember(values) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(values));
  } catch {
    /* private mode — no harm done */
  }
}

function recall() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
  } catch {
    return {};
  }
}

function floatEmoji(emoji) {
  const node = el('div', { class: 'float-emoji', text: emoji });
  node.style.left = `${10 + Math.random() * 80}%`;
  emojiLayer.append(node);
  setTimeout(() => node.remove(), 2500);
}

function setTab(tab) {
  state.tab = tab;
  for (const btn of document.querySelectorAll('.tab')) {
    btn.classList.toggle('is-active', btn.dataset.tab === tab);
  }
  for (const view of document.querySelectorAll('.tab-view')) {
    view.classList.toggle('is-active', view.dataset.view === tab);
  }
  peoplePane.classList.toggle('is-shown', tab === 'people');
  if (tab === 'chat') {
    chatInput.focus({ preventScroll: true });
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }
}

/* ---------------- rendering ---------------- */

function renderPeople() {
  peopleCount.textContent = String(state.members.length);
  peopleList.replaceChildren(
    ...state.members.map((m) =>
      el('li', { class: `person${state.me && m.id === state.me.id ? ' is-me' : ''}` }, [
        el('span', { class: 'avatar', style: `background:${m.color}`, text: initials(m.name) }),
        el('span', { class: 'person-name', text: m.name + (state.me && m.id === state.me.id ? ' (you)' : '') }),
        el('span', { class: 'person-tags' }, [
          m.inCall ? el('span', { title: 'on the call', text: '📞' }) : null,
          m.inCall && m.media && !m.media.mic ? el('span', { title: 'muted', text: '🔇' }) : null,
          m.inCall && m.media && m.media.cam ? el('span', { title: 'camera on', text: '📷' }) : null,
        ]),
      ])
    )
  );
}

function renderCallBox() {
  const onCall = state.members.filter((m) => m.inCall);
  const others = onCall.filter((m) => !state.me || m.id !== state.me.id);

  if (call.inCall) {
    callStatus.textContent = others.length
      ? `On the call with ${others.map((m) => m.name).join(', ')}`
      : 'You are on the call. Waiting for someone to join…';
  } else if (onCall.length) {
    callStatus.textContent = `${onCall.map((m) => m.name).join(', ')} ${onCall.length === 1 ? 'is' : 'are'} on a call.`;
  } else {
    callStatus.textContent = 'Nobody is on the call yet.';
  }

  callBtn.hidden = call.inCall;
  callBtn.textContent = onCall.length && !call.inCall ? '📞 Join the call' : '📞 Start a call';
  callControls.hidden = !call.inCall;
  stage.hidden = !call.inCall;

  micBtn.textContent = call.micOn ? '🎤 Mic on' : '🔇 Muted';
  micBtn.setAttribute('aria-pressed', String(call.micOn));
  camBtn.textContent = call.camOn ? '📷 Camera on' : '📷 Camera off';
  camBtn.setAttribute('aria-pressed', String(call.camOn));

  const audioOnly = call.inCall && !call.camOn;
  gameBanner.hidden = !audioOnly;
  if (audioOnly) {
    gameBanner.textContent = '🎮 No video? Perfect — pick a game below and play while you talk.';
    if (!state.nudgedToGames) {
      state.nudgedToGames = true;
      toast('On a call without video? Try the Games tab 🎮');
    }
  }
}

/** Video tiles are reused between renders so streams never flicker. */
const tileNodes = new Map();

function renderTiles() {
  if (!call.inCall) {
    tilesBox.replaceChildren();
    tileNodes.clear();
    return;
  }

  const onCall = state.members.filter((m) => m.inCall);
  const wanted = new Set(onCall.map((m) => m.id));
  for (const [id, node] of tileNodes) {
    if (!wanted.has(id)) {
      node.root.remove();
      tileNodes.delete(id);
    }
  }

  for (const member of onCall) {
    const isMe = state.me && member.id === state.me.id;
    let tile = tileNodes.get(member.id);
    if (!tile) {
      const video = el('video', { autoplay: true, playsinline: true, muted: isMe });
      video.muted = Boolean(isMe);
      const face = el('div', { class: 'tile-face' });
      const label = el('span', { class: 'tile-label' });
      const root = el('div', { class: `tile${isMe ? ' is-me' : ''}` }, [video, face, label]);
      tile = { root, video, face, label, streamId: null };
      tileNodes.set(member.id, tile);
      tilesBox.append(root);
    }

    const stream = isMe ? call.localStream : (call.peers.get(member.id) || {}).stream;
    if (stream && tile.streamId !== stream.id) {
      tile.video.srcObject = stream;
      tile.streamId = stream.id;
      tile.video.play().catch(() => {
        audioHint.hidden = false;
      });
    }

    const camOn = isMe ? call.camOn : Boolean(member.media && member.media.cam);
    const hasVideo = Boolean(stream && stream.getVideoTracks().some((t) => t.readyState === 'live'));
    const showVideo = camOn && hasVideo;
    tile.video.hidden = !showVideo;
    tile.face.hidden = showVideo;
    tile.face.textContent = initials(member.name);
    tile.face.style.background = member.color;
    tile.label.textContent =
      `${member.name}${isMe ? ' (you)' : ''}` +
      (member.media && !member.media.mic ? ' 🔇' : '') +
      (!isMe && !call.peers.has(member.id) ? ' …connecting' : '');
    tile.root.classList.toggle('is-talking', call.speaking.has(member.id));
  }
}

function addMessage(message) {
  if (state.seenMessages.has(message.id)) return;
  state.seenMessages.add(message.id);

  const nearBottom = messagesBox.scrollHeight - messagesBox.scrollTop - messagesBox.clientHeight < 80;
  const node =
    message.kind === 'system'
      ? el('li', { class: 'msg is-system', text: message.text })
      : el('li', { class: 'msg' }, [
          el('span', { class: 'avatar', style: `background:${message.color}`, text: initials(message.name) }),
          el('div', { class: 'msg-body' }, [
            el('div', { class: 'msg-head' }, [
              el('span', { class: 'msg-name', style: `color:${message.color}`, text: message.name }),
              el('span', { class: 'msg-time', text: timeLabel(message.ts) }),
            ]),
            el('div', { class: 'msg-text', text: message.text }),
          ]),
        ]);
  messagesBox.append(node);
  if (nearBottom) messagesBox.scrollTop = messagesBox.scrollHeight;
}

function renderTyping() {
  const now = Date.now();
  const names = [...state.typing.entries()]
    .filter(([, ts]) => now - ts < 2500)
    .map(([name]) => name);
  typingBox.textContent = names.length
    ? `${names.slice(0, 3).join(', ')} ${names.length === 1 ? 'is' : 'are'} typing…`
    : '';
}
setInterval(renderTyping, 1000);

function renderGames() {
  renderPicker(gamePicker, state.gameList, state.game ? state.game.type : null, (payload) => net.send(payload));
  renderGame(gameView, state.game, {
    meId: state.me ? state.me.id : null,
    send: (payload) => net.send(payload),
  });
}

/* ---------------- sounds for game events ---------------- */

function playGameSounds(game) {
  if (!game) return;
  const flash = game.flash;
  const key = flash ? `${game.round}:${flash.kind}:${flash.by || ''}` : '';
  if (key && key !== state.lastFlash) {
    state.lastFlash = key;
    if (flash.kind === 'hit') (flash.by === (state.me && state.me.id) ? sfx.hit : sfx.ping)();
    else if (flash.kind === 'miss') sfx.miss();
  }
  if (game.phase === 'over' && state.lastFlash !== 'over') {
    state.lastFlash = 'over';
    sfx.win();
  }
}

/* ---------------- server messages ---------------- */

net.on('joined', (msg) => {
  const rejoined = Boolean(state.me);
  state.me = msg.you;
  state.room = msg.room;
  state.members = msg.members;
  state.game = msg.game;
  state.seenMessages = new Set();
  call.setMyId(msg.you.id);

  if (rejoined && call.inCall) {
    call.leave();
    toast('Call dropped while you were offline — tap Join the call again.');
  }

  gate.hidden = true;
  app.hidden = false;
  codeText.textContent = msg.room.code;
  meName.textContent = `Hi ${msg.you.name}`;
  location.hash = encodeURIComponent(msg.room.code);

  messagesBox.replaceChildren();
  for (const message of msg.messages) addMessage(message);
  renderPeople();
  renderCallBox();
  renderGames();
  if (!rejoined) {
    setTab('chat');
    sfx.join();
  }
});

net.on('join-error', (msg) => {
  gateError.hidden = false;
  gateError.textContent = msg.reason || 'Could not get you in.';
  gateSubmit.disabled = false;
  gateSubmit.textContent = 'Let me in →';
});

net.on('roster', (msg) => {
  state.members = msg.members;
  renderPeople();
  renderCallBox();
  renderTiles();
  if (state.game) renderGames();
});

net.on('chat', (msg) => {
  addMessage(msg.message);
  const mine = state.me && msg.message.from === state.me.id;
  if (!mine && msg.message.kind === 'chat') {
    sfx.ping();
    if (state.tab !== 'chat') toast(`${msg.message.name}: ${msg.message.text.slice(0, 40)}`);
  }
});

net.on('typing', (msg) => {
  state.typing.set(msg.name, Date.now());
  renderTyping();
});

net.on('reaction', (msg) => {
  for (let i = 0; i < 4; i += 1) setTimeout(() => floatEmoji(msg.emoji), i * 120);
});

net.on('notice', (msg) => toast(msg.text));

net.on('call-ready', (msg) => {
  call.dial(msg.peers);
  renderTiles();
});

net.on('peer-joined', (msg) => {
  // They dial us, so there is nothing to do but wait for their offer.
  if (call.inCall) toast('Someone joined the call 📞');
  void msg;
});

net.on('peer-left', (msg) => {
  call.removePeer(msg.id);
});

net.on('signal', (msg) => {
  call.handleSignal(msg.from, msg.data);
});

net.on('game-state', (msg) => {
  state.game = msg.game;
  renderGames();
  playGameSounds(msg.game);
  if (msg.event && msg.event.kind === 'game-opened' && state.tab !== 'games') {
    toast(`🎮 ${msg.game.title} started — check the Games tab`);
  }
});

net.on('closed', () => {
  if (state.me) toast('Lost the connection… trying again');
});

net.on('rejoining', () => toast('Back online 🎉'));

/* ---------------- user interface events ---------------- */

gateForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  const code = codeInput.value.trim();
  if (!name || code.length < 4) {
    gateError.hidden = false;
    gateError.textContent = 'Pop in a name and a passcode of at least 4 characters.';
    return;
  }
  gateError.hidden = true;
  gateSubmit.disabled = true;
  gateSubmit.textContent = 'Opening the door…';
  sfx.unlock();
  remember({ name, code });
  net.join({ name, code });
});

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  net.send({ t: 'chat', text });
  chatInput.value = '';
});

let typingSentAt = 0;
chatInput.addEventListener('input', () => {
  const now = Date.now();
  if (chatInput.value && now - typingSentAt > 1500) {
    typingSentAt = now;
    net.send({ t: 'typing' });
  }
});

reactionsBox.replaceChildren(
  ...REACTIONS.map((emoji) =>
    el('button', {
      class: 'reaction-btn',
      text: emoji,
      'aria-label': `Send ${emoji}`,
      onclick: () => net.send({ t: 'reaction', emoji }),
    })
  )
);

callBtn.addEventListener('click', async () => {
  callBtn.disabled = true;
  try {
    sfx.unlock();
    await call.join();
    toast('You are on the call 🎧');
  } catch (err) {
    toast(micError(err), 5000);
  } finally {
    callBtn.disabled = false;
  }
});

hangupBtn.addEventListener('click', () => {
  call.leave();
  audioHint.hidden = true;
});

micBtn.addEventListener('click', () => call.setMicEnabled(!call.micOn));
camBtn.addEventListener('click', () => call.setCamEnabled(!call.camOn));

for (const btn of document.querySelectorAll('.tab')) {
  btn.addEventListener('click', () => setTab(btn.dataset.tab));
}

codeChip.addEventListener('click', async () => {
  const code = state.room ? state.room.code : '';
  try {
    await navigator.clipboard.writeText(code);
    codeChip.classList.add('copied');
    toast('Passcode copied — send it to your friends!');
    setTimeout(() => codeChip.classList.remove('copied'), 1500);
  } catch {
    toast(`Your passcode is: ${code}`);
  }
});

$('#leave-btn').addEventListener('click', () => {
  if (call.inCall) call.leave();
  net.close();
  location.hash = '';
  location.reload();
});

document.addEventListener(
  'click',
  () => {
    audioHint.hidden = true;
    for (const tile of tileNodes.values()) tile.video.play().catch(() => {});
  },
  { capture: true }
);

window.addEventListener('beforeunload', () => {
  if (call.inCall) call.leave();
});

/* A handle for poking around in the browser console when something misbehaves. */
window.funStuff = { state, call, net };

/* ---------------- boot ---------------- */

async function boot() {
  const saved = recall();
  if (saved.name) nameInput.value = saved.name;
  const fromLink = decodeURIComponent(location.hash.replace(/^#/, ''));
  codeInput.value = fromLink || saved.code || '';
  (nameInput.value ? codeInput : nameInput).focus();

  try {
    const res = await fetch('/config');
    const config = await res.json();
    if (Array.isArray(config.iceServers) && config.iceServers.length) {
      state.iceServers = config.iceServers;
      call.iceServers = config.iceServers;
    }
    state.gameList = config.games || [];
  } catch (err) {
    console.warn('could not load config', err);
    state.gameList = [];
  }
  renderPicker(gamePicker, state.gameList, null, (payload) => net.send(payload));
}

boot();
