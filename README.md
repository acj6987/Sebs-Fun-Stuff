# 🎈 Seb's Fun Stuff

A little hangout website for you and your friends. You pick a secret passcode,
give it to your mates, and everyone who types it in lands in the same room —
where you can send messages, jump on a group call, and play games while you talk.

## What's inside

- **A passcode door.** The passcode *is* the room. Type `tree-house` and so do
  your friends, and you all end up together. Nobody without the passcode can see
  the room, and made-up passcodes work best.
- **Messages.** Live chat with everyone in the room, plus flying emoji reactions
  and a "someone is typing…" line.
- **Group calls.** Voice by default, camera whenever you want it, up to 12 people
  in a room. It's peer-to-peer, so nothing goes through a middle-man server.
- **Games while you talk.** When you're on a call without video, the Games tab is
  right there:
  - **Hit the Button** — a button lights up, whack it before your friends do. 12
    rounds, reaction times, winner at the end.
  - **Tic Tac Toe** — two players, everyone else watches.
  - **Rock Paper Scissors** — everyone throws at once, a point for every friend
    you beat.

## Run it

```bash
npm install
npm start
```

Then open <http://localhost:3000>. Use `PORT=8080 npm start` to run it somewhere else.

To play with a friend on the same Wi-Fi, tell them your computer's address
(something like `http://192.168.1.24:3000`) and the passcode.

## Putting it on the internet

Any host that runs Node works (Render, Railway, Fly, a Raspberry Pi at home…).
Two things to know:

1. **It has to be HTTPS.** Browsers only hand over the microphone and camera on
   `https://` pages (or on `localhost`). Most hosts give you HTTPS for free.
2. **Tricky networks may need a TURN server.** Calls find their own way through
   most home routers using the free STUN servers baked in. If two people still
   can't connect, add a TURN server:

   ```bash
   ICE_SERVERS='[{"urls":"turn:your-turn-server:3478","username":"user","credential":"pass"}]' npm start
   ```

| Variable | Default | What it does |
| --- | --- | --- |
| `PORT` | `3000` | Port the website listens on |
| `ICE_SERVERS` | Google STUN | JSON array of ICE servers for calls |

## How it works

```
server/
  index.js   web server + websocket hub (join, chat, call signalling, games)
  rooms.js   rooms, members, message history, flood protection
  games.js   the game rules — the server decides, so nobody can cheat
public/
  index.html the passcode door and the hangout
  style.css  all the styling
  js/main.js wiring: screens, chat, people, tabs
  js/rtc.js  the group call (WebRTC mesh + perfect negotiation)
  js/games.js how each game is drawn
  js/net.js  websocket with automatic reconnect
  js/sfx.js  little synthesised blips
```

Everything lives in memory: rooms disappear 30 minutes after the last person
leaves, and nothing is written to disk. Chat history is the last 200 messages of
a room, so a friend who joins late can see what they missed.

Calls are a **mesh** — each person connects straight to each other person. That's
perfect for a few friends; a big crowd would need a media server instead.

## Adding your own game

1. Add a class to `server/games.js` with a `type`, `title`, `blurb`, and the
   methods `action(member, msg)` and `snapshot()`. Call `this.sync()` whenever
   something changes, and add it to the `GAMES` list at the bottom.
2. Add a matching draw function to `public/js/games.js` and pop it in `RENDERERS`.

That's it — it shows up in the Games tab for everybody.

## Being sensible

- Share your passcode only with people you actually want in the room.
- Anyone with the passcode can read the room's recent messages and join the call.
- If a room ever feels wrong, everyone can just leave and pick a new passcode.
