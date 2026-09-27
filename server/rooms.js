'use strict';

const crypto = require('crypto');

const MAX_MESSAGES = 200;
const MAX_MEMBERS = 12;
const EMPTY_ROOM_TTL_MS = 1000 * 60 * 30;

const COLORS = [
  '#ff5d73', '#ffb020', '#3ecf8e', '#4aa8ff', '#b982ff',
  '#ff8ac4', '#31d2d2', '#ffd23f', '#7c7cff', '#ff7043',
];

/** @type {Map<string, Room>} */
const rooms = new Map();

/**
 * A passcode is the room: whoever types the same passcode lands in the same
 * place. Codes are normalised so "Tree House" and "tree-house" match.
 */
function normalizeCode(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 40);
}

function cleanName(raw) {
  const name = String(raw || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 20);
  return name || 'Someone';
}

function newId() {
  return crypto.randomBytes(8).toString('hex');
}

class Room {
  constructor(code) {
    this.code = code;
    this.createdAt = Date.now();
    this.members = new Map();
    this.messages = [];
    this.game = null;
    this.emptySince = Date.now();
  }

  get size() {
    return this.members.size;
  }

  addMember({ name, socket }) {
    const used = new Set([...this.members.values()].map((m) => m.color));
    const color = COLORS.find((c) => !used.has(c)) || COLORS[this.members.size % COLORS.length];
    const member = {
      id: newId(),
      name: cleanName(name),
      color,
      socket,
      joinedAt: Date.now(),
      inCall: false,
      media: { mic: true, cam: false },
      chat: { tokens: 12, last: Date.now() },
    };
    this.members.set(member.id, member);
    this.emptySince = null;
    return member;
  }

  removeMember(id) {
    const member = this.members.get(id);
    this.members.delete(id);
    if (this.members.size === 0) this.emptySince = Date.now();
    return member;
  }

  /** Members currently on the call, in join order. */
  callMembers() {
    return [...this.members.values()].filter((m) => m.inCall);
  }

  publicMembers() {
    return [...this.members.values()]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((m) => ({
        id: m.id,
        name: m.name,
        color: m.color,
        inCall: m.inCall,
        media: { ...m.media },
      }));
  }

  addMessage({ member, text, kind = 'chat' }) {
    const message = {
      id: newId(),
      kind,
      from: member ? member.id : null,
      name: member ? member.name : 'Room',
      color: member ? member.color : '#8892a6',
      text: String(text).slice(0, 800),
      ts: Date.now(),
    };
    this.messages.push(message);
    if (this.messages.length > MAX_MESSAGES) {
      this.messages.splice(0, this.messages.length - MAX_MESSAGES);
    }
    return message;
  }

  /**
   * Simple token bucket so nobody can flood the room (accidentally or not).
   * Returns true when the message is allowed.
   */
  allowChat(member) {
    const now = Date.now();
    const bucket = member.chat;
    bucket.tokens = Math.min(12, bucket.tokens + (now - bucket.last) / 1000);
    bucket.last = now;
    if (bucket.tokens < 1) return false;
    bucket.tokens -= 1;
    return true;
  }
}

function getRoom(code, { create = false } = {}) {
  let room = rooms.get(code);
  if (!room && create) {
    room = new Room(code);
    rooms.set(code, room);
  }
  return room || null;
}

function roomIsFull(room) {
  return room.size >= MAX_MEMBERS;
}

/** Drop rooms that nobody has used for a while, so memory stays flat. */
function sweepRooms() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (room.size === 0 && room.emptySince && now - room.emptySince > EMPTY_ROOM_TTL_MS) {
      if (room.game && typeof room.game.destroy === 'function') room.game.destroy();
      rooms.delete(code);
    }
  }
}

module.exports = {
  MAX_MEMBERS,
  normalizeCode,
  cleanName,
  newId,
  getRoom,
  roomIsFull,
  sweepRooms,
  rooms,
};
