# Science Fact

A free science website: experiments people can follow at home, and a video
from you every week.

There is no server, no database and nothing to pay for. It is plain HTML,
CSS and JavaScript, so it will run on any free web host, and it works if you
just double-click `index.html` on your own computer too.

---

## What is on the site

| Page | What it does |
| --- | --- |
| `index.html` | Home page: fact of the day, this week's video, six featured experiments |
| `experiments.html` | Every experiment, with search and filters |
| `experiment.html` | One experiment: video, safety, kit list, steps, the science |
| `videos.html` | All your weekly videos, newest first |
| `facts.html` | The Fact Vault |
| `safety.html` | Safety rules, and a section for grown-ups |
| `studio.html` | **Creator Studio** - password protected, where you add a video |

Everything a visitor sees is free and needs no account. Only the Creator
Studio asks for a password.

---

## Putting a new video up each week

1. Upload your video to YouTube as normal and copy the link.
2. Open **Creator Studio** on the site and sign in.
3. Fill in the title, paste the link, pick the date, and choose which
   experiment it goes with.
4. Press **Make the code**. You get a small block of text.
5. Open the file `data/videos.js` in any text editor (Notepad works).
6. Find the line that says `window.VIDEOS = [` and paste the block on the
   line straight after it, so the newest video is at the top.
7. Save the file and upload it to your web host.

That is it. The video now shows up on the home page, on the Videos page, and
on the experiment page you linked it to.

> **Why the copy and paste step?** A website with no server cannot save
> anything by itself. The Studio does all the fiddly typing for you and
> checks the link is valid, but the one file has to be saved by you. The
> Studio also keeps a draft in your browser so you never lose your typing -
> but a draft is only on your computer, not on the website.

If you would rather the site saved videos on its own, you need a host that
runs code as well as pages (Netlify, Vercel, Cloudflare Pages and similar
all have free tiers with this). That is a bigger job than this site needs,
but it is the honest answer to "can it just save it for me".

---

## Your password

The password that this site ships with is:

```
ChangeMe2026
```

**Change it before the site goes online.** Sign in, scroll to *Change your
password* at the bottom of the Studio, type a new one, and it gives you a
line to paste over the last line of `assets/js/studio-config.js`.

### How safe is the password?

Be realistic about this. The site has no server, so the password check
happens in the visitor's browser. The file `assets/js/studio-config.js`
holds a SHA-256 fingerprint of your password, never the password itself, so
nobody can read your password out of the site. But someone who knows how
websites work can see that file, and could try to guess passwords against
that fingerprint on their own computer, or simply edit their own copy of the
page to skip the lock.

What this lock is good for: keeping the Studio out of the way of visitors,
and stopping a curious child clicking about and changing things.

What it is not: real security. So -
* Do not reuse a password you use anywhere else.
* Make it long. A few random words is better than one clever word.
* Never put anything private in the Studio. It only builds text for you to
  paste - nothing sensitive goes in there.

Nothing on the public part of the site can be changed by a visitor anyway.
The only way to change what is published is to edit the files and upload
them, which needs access to your web host.

---

## Adding a new experiment

Open `data/experiments.js`, copy one of the blocks, paste it at the end of
the list, and change the words. The comments at the top of the file explain
each line. Keep the commas and quote marks where they are.

* `id` must be unique and have no spaces, e.g. `"fizzy-rocket"`.
* `difficulty` should be `"Easy"`, `"Medium"` or `"Tricky"` so it colours
  correctly.
* `videoId` can be left as `""` - if a video in `data/videos.js` points at
  this experiment, the site links them up on its own.

Adding a fact is the same, in `data/facts.js`.

---

## Putting the site online for free

Any of these will host it for nothing:

**GitHub Pages** (this repository is already on GitHub)
1. Go to the repository on github.com.
2. Settings -> Pages.
3. Under *Source* choose the branch, folder `/ (root)`, and Save.
4. A couple of minutes later your site is at
   `https://<your-username>.github.io/<repository-name>/`.

**Netlify or Cloudflare Pages** - make a free account and drag the whole
folder onto their upload box. Both give you a web address straight away and
let you point your own domain at it later.

To update the site afterwards, upload the changed files again (or commit and
push, if you are using GitHub).

---

## Working on it on your own computer

Double-click `index.html` and it opens in your browser. Everything works
this way, including the Studio.

If you would rather run it like a real website, open a terminal in this
folder and run:

```
python3 -m http.server 8000
```

Then go to `http://localhost:8000` in your browser.

---

## How the files fit together

```
index.html, experiments.html, ...   the pages
assets/css/style.css                all the styling, colours at the top
assets/js/app.js                    shared bits: nav, fact of the day, cards
assets/js/home.js                   one file per page
assets/js/studio.js                 the Creator Studio
assets/js/studio-config.js          your password fingerprint - edit this
assets/js/sha256.js                 does the password maths
data/experiments.js                 the experiments      <- edit these
data/facts.js                       the facts            <- edit these
data/videos.js                      your weekly videos   <- edit these
```

The colours all live at the top of `assets/css/style.css` under `:root`, so
you can change the whole look by editing a handful of lines.

---

## Safety note

The experiments are written for children working with an adult, and every
one lists its own hazards, an age guide, and what a grown-up has to do.
`safety.html` carries the general rules. If you add your own experiments,
please fill in the `safety` list properly - it is the part that matters most.
