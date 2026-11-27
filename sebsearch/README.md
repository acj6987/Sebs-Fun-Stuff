# SebSearch

A search website: ask a question and get an answer, YouTube videos and websites.
It also has a **Pro calling area** for video and voice calls with friends.

## Open it
Open `index.html` in a browser, or turn on GitHub Pages (repo Settings → Pages → deploy from branch)
and visit `/sebsearch/`.

## Real videos inside the page
Click ⚙️ and paste a free **YouTube Data API v3** key from console.cloud.google.com.
Without a key, the video buttons open YouTube searches.

## Real payments for Pro
Make a Stripe Payment Link (set its "after payment" redirect to `.../sebsearch/?paid=1`)
and paste the link into `PAYMENT_LINK` at the top of `app.js`.
Until then, "Get Pro" is a free demo unlock.

## Calls
Calls run peer-to-peer (WebRTC through PeerJS). Each person gets a short call ID to share.
Camera and microphone need the site to be on `https://` (GitHub Pages is fine).
