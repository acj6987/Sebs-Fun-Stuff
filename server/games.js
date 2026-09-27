'use strict';

/**
 * Room games. Every game is server-authoritative: clients send small actions,
 * the server decides what happened and broadcasts a fresh snapshot. That keeps
 * the games honest and means a player who reloads simply picks the state back up.
 *
 * Each game gets a ctx: { room, sync(event) } where sync pushes the current
 * snapshot to everyone in the room.
 */

class BaseGame {
  constructor(ctx) {
    this.ctx = ctx;
    this.timers = new Set();
  }

  get room() {
    return this.ctx.room;
  }

  /** Players are simply the people in the room right now. */
  roster() {
    return this.room.publicMembers();
  }

  after(ms, fn) {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      try {
        fn();
      } catch (err) {
        console.error('game timer failed', err);
      }
    }, ms);
    this.timers.add(timer);
    return timer;
  }

  clearTimers() {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
  }

  sync(event) {
    this.ctx.sync(event);
  }

  join() {}
  leave() {}
  action() {}
  destroy() {
    this.clearTimers();
  }
}

/* ------------------------------------------------------------------ */
/* Hit the Button                                                      */
/* ------------------------------------------------------------------ */

const HTB_TILES = 9;
const HTB_ROUNDS = 12;
const HTB_TARGET_MS = 2200;
const HTB_PENALTY_MS = 700;

class HitTheButton extends BaseGame {
  static type = 'hit-the-button';
  static title = 'Hit the Button';
  static blurb = 'A button lights up. Whack it before your friends do.';

  constructor(ctx) {
    super(ctx);
    this.phase = 'lobby';
    this.round = 0;
    this.target = -1;
    this.targetAt = 0;
    this.scores = new Map();
    this.locks = new Map();
    this.flash = null;
  }

  scoreFor(id) {
    if (!this.scores.has(id)) this.scores.set(id, { hits: 0, misses: 0, best: null });
    return this.scores.get(id);
  }

  leave(id) {
    this.scores.delete(id);
    this.locks.delete(id);
  }

  action(member, msg) {
    if (msg.action === 'start') return this.start();
    if (msg.action === 'hit') return this.hit(member, Number(msg.tile));
    if (msg.action === 'reset') return this.reset();
  }

  start() {
    this.clearTimers();
    this.phase = 'playing';
    this.round = 1;
    this.scores = new Map();
    this.locks = new Map();
    this.flash = { kind: 'go' };
    for (const m of this.roster()) this.scoreFor(m.id);
    this.nextTarget();
  }

  reset() {
    this.clearTimers();
    this.phase = 'lobby';
    this.round = 0;
    this.target = -1;
    this.scores = new Map();
    this.flash = null;
    this.sync();
  }

  nextTarget() {
    let tile = Math.floor(Math.random() * HTB_TILES);
    if (tile === this.target) tile = (tile + 1 + Math.floor(Math.random() * (HTB_TILES - 1))) % HTB_TILES;
    this.target = tile;
    this.targetAt = Date.now();
    this.sync();
    this.after(HTB_TARGET_MS, () => {
      if (this.phase !== 'playing') return;
      this.flash = { kind: 'timeout' };
      this.advance();
    });
  }

  advance() {
    this.clearTimers();
    if (this.round >= HTB_ROUNDS) {
      this.phase = 'over';
      this.target = -1;
      this.sync();
      return;
    }
    this.round += 1;
    this.nextTarget();
  }

  hit(member, tile) {
    if (this.phase !== 'playing' || !Number.isInteger(tile)) return;
    const lockedUntil = this.locks.get(member.id) || 0;
    if (Date.now() < lockedUntil) return;
    const score = this.scoreFor(member.id);

    if (tile !== this.target) {
      score.misses += 1;
      this.locks.set(member.id, Date.now() + HTB_PENALTY_MS);
      this.flash = { kind: 'miss', by: member.id, name: member.name };
      this.sync();
      return;
    }

    const reaction = Date.now() - this.targetAt;
    score.hits += 1;
    if (score.best === null || reaction < score.best) score.best = reaction;
    this.flash = { kind: 'hit', by: member.id, name: member.name, reaction };
    this.advance();
  }

  snapshot() {
    const players = this.roster()
      .map((m) => {
        const s = this.scores.get(m.id) || { hits: 0, misses: 0, best: null };
        return { ...m, hits: s.hits, misses: s.misses, best: s.best, score: s.hits };
      })
      .sort((a, b) => b.score - a.score || (a.best ?? 1e9) - (b.best ?? 1e9));
    const winner = this.phase === 'over' && players.length && players[0].score > 0 ? players[0] : null;
    return {
      type: HitTheButton.type,
      title: HitTheButton.title,
      phase: this.phase,
      round: this.round,
      rounds: HTB_ROUNDS,
      tiles: HTB_TILES,
      target: this.phase === 'playing' ? this.target : -1,
      targetMs: HTB_TARGET_MS,
      flash: this.flash,
      players,
      winner,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Tic Tac Toe                                                         */
/* ------------------------------------------------------------------ */

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

class TicTacToe extends BaseGame {
  static type = 'tic-tac-toe';
  static title = 'Tic Tac Toe';
  static blurb = 'Two players, three in a row. Everyone else can heckle.';

  constructor(ctx) {
    super(ctx);
    this.board = Array(9).fill(null);
    this.turn = 'X';
    this.seats = { X: null, O: null };
    this.winner = null;
    this.line = null;
    this.wins = new Map();
  }

  join(member) {
    if (!this.seats.X) this.seats.X = member.id;
    else if (!this.seats.O && this.seats.X !== member.id) this.seats.O = member.id;
  }

  leave(id) {
    for (const seat of ['X', 'O']) {
      if (this.seats[seat] === id) this.seats[seat] = null;
    }
    this.wins.delete(id);
  }

  seatOf(id) {
    if (this.seats.X === id) return 'X';
    if (this.seats.O === id) return 'O';
    return null;
  }

  action(member, msg) {
    if (msg.action === 'sit') return this.sit(member, msg.seat);
    if (msg.action === 'stand') return this.stand(member);
    if (msg.action === 'move') return this.move(member, Number(msg.tile));
    if (msg.action === 'reset' || msg.action === 'start') return this.newRound();
  }

  sit(member, seat) {
    if (seat !== 'X' && seat !== 'O') return;
    if (this.seats[seat] && this.seats[seat] !== member.id) return;
    const other = seat === 'X' ? 'O' : 'X';
    if (this.seats[other] === member.id) this.seats[other] = null;
    this.seats[seat] = member.id;
    this.sync();
  }

  stand(member) {
    const seat = this.seatOf(member.id);
    if (!seat) return;
    this.seats[seat] = null;
    this.sync();
  }

  newRound() {
    this.board = Array(9).fill(null);
    this.winner = null;
    this.line = null;
    this.turn = 'X';
    this.sync();
  }

  move(member, tile) {
    const seat = this.seatOf(member.id);
    if (!seat || this.winner || seat !== this.turn) return;
    if (!Number.isInteger(tile) || tile < 0 || tile > 8 || this.board[tile]) return;
    this.board[tile] = seat;

    const line = LINES.find((l) => l.every((i) => this.board[i] === seat));
    if (line) {
      this.winner = seat;
      this.line = line;
      const id = this.seats[seat];
      if (id) this.wins.set(id, (this.wins.get(id) || 0) + 1);
    } else if (this.board.every(Boolean)) {
      this.winner = 'draw';
    } else {
      this.turn = seat === 'X' ? 'O' : 'X';
    }
    this.sync();
  }

  snapshot() {
    const members = new Map(this.roster().map((m) => [m.id, m]));
    const seat = (key) => {
      const id = this.seats[key];
      const m = id && members.get(id);
      return m ? { ...m, wins: this.wins.get(id) || 0 } : null;
    };
    return {
      type: TicTacToe.type,
      title: TicTacToe.title,
      board: this.board,
      turn: this.turn,
      winner: this.winner,
      line: this.line,
      seats: { X: seat('X'), O: seat('O') },
      players: this.roster().map((m) => ({ ...m, score: this.wins.get(m.id) || 0 })),
    };
  }
}

/* ------------------------------------------------------------------ */
/* Rock Paper Scissors                                                 */
/* ------------------------------------------------------------------ */

const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
const RPS_REVEAL_MS = 4000;

class RockPaperScissors extends BaseGame {
  static type = 'rock-paper-scissors';
  static title = 'Rock Paper Scissors';
  static blurb = 'Everyone throws at once. Beat as many friends as you can.';

  constructor(ctx) {
    super(ctx);
    this.phase = 'picking';
    this.picks = new Map();
    this.scores = new Map();
    this.roundScores = new Map();
    this.round = 1;
  }

  leave(id) {
    this.picks.delete(id);
    this.scores.delete(id);
    this.roundScores.delete(id);
  }

  action(member, msg) {
    if (msg.action === 'pick') return this.pick(member, msg.choice);
    if (msg.action === 'next') return this.newRound();
    if (msg.action === 'reset') {
      this.scores = new Map();
      this.round = 1;
      return this.newRound();
    }
  }

  pick(member, choice) {
    if (this.phase !== 'picking' || !BEATS[choice]) return;
    this.picks.set(member.id, choice);
    const everyone = this.roster();
    if (everyone.length > 1 && everyone.every((m) => this.picks.has(m.id))) {
      this.reveal();
      return;
    }
    this.sync();
  }

  reveal() {
    this.clearTimers();
    this.phase = 'reveal';
    this.roundScores = new Map();
    const entries = [...this.picks.entries()];
    for (const [id, choice] of entries) {
      let points = 0;
      for (const [otherId, otherChoice] of entries) {
        if (otherId === id) continue;
        if (BEATS[choice] === otherChoice) points += 1;
      }
      this.roundScores.set(id, points);
      this.scores.set(id, (this.scores.get(id) || 0) + points);
    }
    this.sync();
    this.after(RPS_REVEAL_MS, () => this.newRound());
  }

  newRound() {
    this.clearTimers();
    this.phase = 'picking';
    this.picks = new Map();
    this.roundScores = new Map();
    this.round += 1;
    this.sync();
  }

  snapshot() {
    const reveal = this.phase === 'reveal';
    return {
      type: RockPaperScissors.type,
      title: RockPaperScissors.title,
      phase: this.phase,
      round: this.round,
      revealMs: RPS_REVEAL_MS,
      players: this.roster()
        .map((m) => ({
          ...m,
          score: this.scores.get(m.id) || 0,
          gained: this.roundScores.get(m.id) || 0,
          ready: this.picks.has(m.id),
          choice: reveal ? this.picks.get(m.id) || null : null,
        }))
        .sort((a, b) => b.score - a.score),
    };
  }
}

const GAMES = [HitTheButton, TicTacToe, RockPaperScissors];
const BY_TYPE = new Map(GAMES.map((G) => [G.type, G]));

function listGames() {
  return GAMES.map((G) => ({ type: G.type, title: G.title, blurb: G.blurb }));
}

function createGame(type, ctx) {
  const Game = BY_TYPE.get(type);
  if (!Game) return null;
  return new Game(ctx);
}

module.exports = { listGames, createGame };
