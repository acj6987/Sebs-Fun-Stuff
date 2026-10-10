# Putting Seb's Fun Stuff on the internet

The website needs a computer somewhere on the internet to keep it running.
This guide uses **Render**, which has a free plan and takes about ten minutes.

When you're done you'll have a link like `https://sebs-fun-stuff.onrender.com`
that you can send to your friends, along with your passcode.

## The quick way

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/acj6987/Sebs-Fun-Stuff&branch=claude/funny-pasteur-3okvv8)

Press the button, sign in with GitHub, and let Render do the rest. If it asks
which repository it may see, choose **Sebs-Fun-Stuff**. Prefer doing it by hand?
The steps below are the same thing, slower.

## Step by step

1. Go to **<https://render.com>** and click **Get Started** — sign in with your
   GitHub account so Render can see your repositories.
2. Once you're in, click **New +** (top right) → **Blueprint**.
3. Pick the repository **`acj6987/Sebs-Fun-Stuff`** from the list. If you don't
   see it, click *Configure account* and give Render permission to that repo.
4. For the branch, choose the branch this code is on
   (`claude/funny-pasteur-3okvv8`), or merge it into `main` first and pick `main`.
5. Render reads `render.yaml` and fills everything in for you. Give the service
   a name if you want a nicer link, then click **Apply** / **Deploy**.
6. Wait a couple of minutes for the build to finish and the dot to go green.
7. Click the link at the top of the page — that's your website. 🎉

Send that link plus your passcode to your friends and you're all in the same room.

## Good to know

- **The free plan falls asleep.** If nobody has visited for about 15 minutes,
  the first person to open the link waits up to a minute while it wakes up.
  After that it's quick for everyone. Paid plans stay awake.
- **The microphone and camera need `https://`.** Render gives you that
  automatically, so calls will just work.
- **Every push updates the site.** Whenever the branch changes, Render
  rebuilds and redeploys on its own.
- **Some strict networks (school Wi-Fi, some mobile networks) block the
  direct connection calls use.** Messages and games still work. If calls fail
  for someone, add a TURN server (a free one from
  [Metered](https://www.metered.ca/tools/openrelay/) or
  [Twilio](https://www.twilio.com/docs/stun-turn) works) in Render under
  **Environment → Add Environment Variable**:

  | Key | Value |
  | --- | --- |
  | `ICE_SERVERS` | `[{"urls":"turn:your-server:3478","username":"user","credential":"pass"}]` |

## Other hosts

The same repo works anywhere that runs Node and allows websockets:

| Host | What to do |
| --- | --- |
| **Railway** | New Project → Deploy from GitHub repo. It detects Node; no settings needed. |
| **Fly.io** | `fly launch` in the project folder, then `fly deploy`. |
| **A Raspberry Pi at home** | `npm install && npm start`, then put it behind a tunnel such as Cloudflare Tunnel so friends can reach it over https. |

Everywhere: build with `npm ci`, start with `npm start`, and let the host pick
the port — the server reads `PORT` on its own.
