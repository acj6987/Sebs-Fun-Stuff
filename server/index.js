'use strict';

const http = require('http');
const path = require('path');
const express = require('express');
const { WebSocketServer } = require('ws');

const rooms = require('./rooms');
const games = require('./games');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const REACTIONS = ['😂', '🎉', '🔥', '❤️', '👍', '😮', '🤯', '👋'];

/**
 * STUN lets two browsers find each other through home routers. It is enough for
 * most networks; if you need calls to work everywhere, put a TURN server in
 * ICE_SERVERS (JSON, same shape as RTCConfiguration.iceServers).
 */
const DEFAULT_ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

function loadIceServers() {
  if (!process.env.ICE_SERVERS) return DEFAULT_ICE;
  try {
    const parsed = JSON.parse(process.env.ICE_SERVERS);
    if (Array.isArray(parsed) && parsed.length) return parsed;
    console.warn('ICE_SERVERS was not a non-empty array; using default STUN servers.');
  } catch (err) {
    console.warn('ICE_SERVERS is not valid JSON; using default STUN servers.', err.message);
  }
  return DEFAULT_ICE;
}

const iceServers = loadIceServers();

const app = express();
app.disable('x-powered-by');
app.use(express.static(PUBLIC_DIR, { extensions: ['html'], maxAge: '1h' }));
app.get('/config', (_req, res) => {
  res.json({ iceServers, games: games.listGames(), maxMembers: rooms.MAX_MEMBERS });
});
app.get('/healthz', (_req, res) => res.type('text').send('ok'));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 128 * 1024 });

/* ---------------------------------------------------------------- */
/* helpers                                                          */
/* ---------------------------------------------------------------- */

function send(socket, payload) {
  if (socket.readyState !== socket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

function broadcast(room, payload, { except } = {}) {
  const data = JSON.stringify(payload);
  for (const member of room.members.values()) {
    if (except && member.id === except) continue;
    if (member.socket.readyState === member.socket.OPEN) member.socket.send(data);
  }
}

function sendRoster(room) {
  broadcast(room, { t: 'roster', members: room.publicMembers() });
}

function syncGame(room, event) {
  broadcast(room, {
    t: 'game-state',
    game: room.game ? room.game.snapshot() : null,
    event: event || null,
  });
}

function gameContext(room) {
  return { room, sync: (event) => syncGame(room, event) };
}

function systemMessage(room, text) {
  const message = room.addMessage({ member: null, text, kind: 'system' });
  broadcast(room, { t: 'chat', message });
}

/** Cheap brute-force brake: a handful of room guesses per IP per minute. */
const joinAttempts = new Map();
function tooManyJoins(ip) {
  const now = Date.now();
  const entry = joinAttempts.get(ip) || { count: 0, resetAt: now + 60_000 };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 60_000;
  }
  entry.count += 1;
  joinAttempts.set(ip, entry);
  return entry.count > 30;
}

/* ---------------------------------------------------------------- */
/* websocket wiring                                                 */
/* ---------------------------------------------------------------- */

wss.on('connection', (socket, req) => {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
  /** @type {{room: any, member: any}} */
  const session = { room: null, member: null };
  socket.isAlive = true;
  socket.on('pong', () => {
    socket.isAlive = true;
  });

  socket.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg || typeof msg.t !== 'string') return;

    if (msg.t === 'join') return handleJoin(msg);
    if (!session.room || !session.member) return;

    const { room, member } = session;
    switch (msg.t) {
      case 'chat':
        handleChat(room, member, msg);
        break;
      case 'typing':
        broadcast(room, { t: 'typing', from: member.id, name: member.name }, { except: member.id });
        break;
      case 'reaction':
        if (REACTIONS.includes(msg.emoji)) {
          broadcast(room, { t: 'reaction', from: member.id, name: member.name, emoji: msg.emoji });
        }
        break;
      case 'call-join':
        handleCallJoin(room, member);
        break;
      case 'call-leave':
        handleCallLeave(room, member);
        break;
      case 'signal':
        handleSignal(room, member, msg);
        break;
      case 'media':
        member.media = {
          mic: Boolean(msg.mic),
          cam: Boolean(msg.cam),
        };
        sendRoster(room);
        break;
      case 'game-pick':
        handleGamePick(room, member, msg);
        break;
      case 'game-close':
        if (room.game) {
          room.game.destroy();
          room.game = null;
          systemMessage(room, `${member.name} closed the game.`);
          syncGame(room);
        }
        break;
      case 'game':
        if (room.game) room.game.action(member, msg);
        break;
      default:
        break;
    }
  });

  socket.on('close', () => {
    const { room, member } = session;
    if (!room || !member) return;
    session.room = null;
    session.member = null;

    const wasInCall = member.inCall;
    room.removeMember(member.id);
    if (room.game) room.game.leave(member.id);

    if (wasInCall) broadcast(room, { t: 'peer-left', id: member.id });
    systemMessage(room, `${member.name} left.`);
    sendRoster(room);
    if (room.game) syncGame(room);
  });

  socket.on('error', (err) => console.warn('socket error', err.message));

  function handleJoin(msg) {
    if (session.member) return;
    const code = rooms.normalizeCode(msg.code);
    if (code.length < 4) {
      send(socket, { t: 'join-error', reason: 'Passcodes need at least 4 characters.' });
      return;
    }
    if (tooManyJoins(ip)) {
      send(socket, { t: 'join-error', reason: 'Too many tries. Wait a minute and have another go.' });
      return;
    }

    const room = rooms.getRoom(code, { create: true });
    if (rooms.roomIsFull(room)) {
      send(socket, { t: 'join-error', reason: `That room is full (${rooms.MAX_MEMBERS} people max).` });
      return;
    }

    const member = room.addMember({ name: msg.name, socket });
    session.room = room;
    session.member = member;
    if (room.game) room.game.join(member);

    send(socket, {
      t: 'joined',
      you: { id: member.id, name: member.name, color: member.color },
      room: { code: room.code, createdAt: room.createdAt },
      members: room.publicMembers(),
      messages: room.messages,
      call: room.callMembers().map((m) => m.id),
      game: room.game ? room.game.snapshot() : null,
    });

    systemMessage(room, `${member.name} arrived.`);
    sendRoster(room);
    if (room.game) syncGame(room);
  }

  function handleChat(room, member, msg) {
    const text = String(msg.text || '').trim();
    if (!text) return;
    if (!room.allowChat(member)) {
      send(socket, { t: 'notice', text: 'Slow down a little!' });
      return;
    }
    const message = room.addMessage({ member, text });
    broadcast(room, { t: 'chat', message });
  }

  function handleCallJoin(room, member) {
    if (member.inCall) return;
    const peers = room.callMembers().map((m) => m.id);
    member.inCall = true;
    // The newcomer learns who is already on the call and dials each of them.
    send(socket, { t: 'call-ready', peers });
    broadcast(room, { t: 'peer-joined', id: member.id }, { except: member.id });
    systemMessage(room, `${member.name} joined the call.`);
    sendRoster(room);
  }

  function handleCallLeave(room, member) {
    if (!member.inCall) return;
    member.inCall = false;
    member.media = { mic: true, cam: false };
    broadcast(room, { t: 'peer-left', id: member.id }, { except: member.id });
    systemMessage(room, `${member.name} hung up.`);
    sendRoster(room);
  }

  function handleSignal(room, member, msg) {
    const target = room.members.get(String(msg.to || ''));
    if (!target || !msg.data) return;
    send(target.socket, { t: 'signal', from: member.id, data: msg.data });
  }

  function handleGamePick(room, member, msg) {
    const game = games.createGame(String(msg.game || ''), gameContext(room));
    if (!game) return;
    if (room.game) room.game.destroy();
    room.game = game;
    for (const m of room.members.values()) game.join(m);
    systemMessage(room, `${member.name} started ${game.constructor.title}.`);
    syncGame(room, { kind: 'game-opened' });
  }
});

/* Drop connections that stopped answering, and tidy empty rooms. */
const heartbeat = setInterval(() => {
  for (const socket of wss.clients) {
    if (!socket.isAlive) {
      socket.terminate();
      continue;
    }
    socket.isAlive = false;
    socket.ping();
  }
  rooms.sweepRooms();
}, 30_000);
heartbeat.unref();

server.listen(PORT, () => {
  console.log(`Seb's Fun Stuff is running at http://localhost:${PORT}`);
});

function shutdown() {
  clearInterval(heartbeat);
  for (const socket of wss.clients) socket.close(1001, 'server shutting down');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
