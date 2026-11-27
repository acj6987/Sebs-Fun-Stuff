// ===== SebSearch =====
// To take REAL payments: make a Stripe Payment Link (stripe.com → Payment Links)
// and paste it here. Leave it empty to use the free demo unlock.
const PAYMENT_LINK = '';

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d = null) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stripTags = (s) => String(s ?? '').replace(/<[^>]*>/g, '');

// ---------- Tabs ----------
function showView(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === name));
  $('searchView').classList.toggle('hidden', name !== 'search');
  $('callView').classList.toggle('hidden', name !== 'call');
  if (name === 'call') refreshPro();
}
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => showView(t.dataset.view)));
$('homeLink').addEventListener('click', (e) => {
  e.preventDefault();
  showView('search');
  $('hero').classList.remove('compact');
  $('results').classList.add('hidden');
  $('q').value = '';
  history.replaceState(null, '', location.pathname);
});

// ---------- Settings ----------
$('settingsBtn').addEventListener('click', () => { $('ytKey').value = store.get('ytKey', ''); $('settings').showModal(); });
$('saveSettings').addEventListener('click', () => store.set('ytKey', $('ytKey').value.trim()));

// ---------- Search ----------
const ideas = ['How do volcanoes work?', 'Why is the sky blue?', 'How to draw a dragon', 'Biggest dinosaur ever', 'How do planes fly?', 'Minecraft redstone tips'];
$('chips').innerHTML = ideas.map((i) => `<button type="button">${esc(i)}</button>`).join('');
$('chips').addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') { $('q').value = e.target.textContent; runSearch(); } });
$('searchForm').addEventListener('submit', (e) => { e.preventDefault(); runSearch(); });

function runSearch() {
  const q = $('q').value.trim();
  if (!q) return;
  history.replaceState(null, '', '?q=' + encodeURIComponent(q));
  $('hero').classList.add('compact');
  $('results').classList.remove('hidden');
  $('answer').innerHTML = '<p class="muted">Thinking…</p>';
  $('videos').innerHTML = '<p class="muted">Finding videos…</p>';
  $('sites').innerHTML = '<p class="muted">Finding websites…</p>';
  loadVideos(q);
  loadWeb(q);
}

// Turn "how do volcanoes work?" into "volcanoes" for better encyclopedia matches.
function topicOf(q) {
  const stop = /\b(what|who|why|how|when|where|which|is|are|was|were|do|does|did|can|could|the|a|an|of|to|in|on|for|about|me|tell|explain|work|works|ever|make|made)\b/gi;
  const t = q.replace(/[?!.]/g, '').replace(stop, ' ').replace(/\s+/g, ' ').trim();
  return t || q;
}

async function wikiSearch(text, limit = 8) {
  const url = 'https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=' + limit + '&srsearch=' + encodeURIComponent(text);
  const r = await fetch(url);
  const j = await r.json();
  return j.query?.search ?? [];
}

async function loadWeb(q) {
  try {
    let hits = await wikiSearch(q);
    const topic = topicOf(q);
    if (topic !== q) {
      const more = await wikiSearch(topic, 4);
      // put the cleaner topic match first, avoid duplicates
      const seen = new Set(more.map((h) => h.title));
      hits = [...more, ...hits.filter((h) => !seen.has(h.title))];
    }
    if (!hits.length) throw new Error('none');

    // Answer card from the best match
    const best = hits[0].title;
    const s = await (await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(best))).json();
    const img = s.thumbnail?.source ? `<img src="${esc(s.thumbnail.source)}" alt="">` : '';
    $('answer').innerHTML = `${img}<div>
      <h3>${esc(s.title || best)}</h3>
      <p>${esc(s.extract || stripTags(hits[0].snippet))}</p>
      <a href="${esc(s.content_urls?.desktop?.page || 'https://en.wikipedia.org/wiki/' + encodeURIComponent(best))}" target="_blank" rel="noopener">Read more →</a>
    </div>`;

    const siteCards = hits.slice(0, 8).map((h) => {
      const link = 'https://en.wikipedia.org/wiki/' + encodeURIComponent(h.title.replace(/ /g, '_'));
      return site(h.title + ' – Wikipedia', link, stripTags(h.snippet) + '…');
    });
    $('sites').innerHTML = siteCards.join('') + moreSites(q);
  } catch {
    $('answer').innerHTML = `<div><h3>${esc(q)}</h3><p class="muted">No quick answer found. Try the videos and websites below.</p></div>`;
    $('sites').innerHTML = moreSites(q);
  }
}

function site(title, url, text) {
  return `<div class="card site">
    <div class="url">${esc(url)}</div>
    <a class="title" href="${esc(url)}" target="_blank" rel="noopener">${esc(title)}</a>
    <p>${esc(text)}</p>
  </div>`;
}

function moreSites(q) {
  const e = encodeURIComponent(q);
  return [
    site('Search the whole web (DuckDuckGo)', 'https://duckduckgo.com/?q=' + e, 'See every website about “' + q + '”.'),
    site('Britannica Kids & Encyclopedia', 'https://www.britannica.com/search?query=' + e, 'Trusted encyclopedia articles.'),
    site('BBC Bitesize', 'https://www.bbc.co.uk/bitesize/search?q=' + e, 'Learning guides and videos for school subjects.'),
    site('Simple English Wikipedia', 'https://simple.wikipedia.org/w/index.php?search=' + e, 'Easier-to-read encyclopedia articles.'),
  ].join('');
}

// ---------- Videos ----------
async function loadVideos(q) {
  const key = store.get('ytKey', '');
  if (key) {
    try {
      const url = 'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=9&safeSearch=strict&relevanceLanguage=en&q=' +
        encodeURIComponent(q) + '&key=' + encodeURIComponent(key);
      const j = await (await fetch(url)).json();
      if (j.error) throw new Error(j.error.message);
      $('videos').innerHTML = j.items.map((v) => videoCard(v.id.videoId, v.snippet)).join('') || '<p class="muted">No videos found.</p>';
      return;
    } catch (err) {
      console.warn('YouTube API failed:', err);
    }
  }
  // No key (or key failed): helpful buttons that open YouTube searches
  const angles = [
    ['', 'Top videos'],
    [' explained', 'Explained simply'],
    [' in detail full documentary', 'Detailed / documentary'],
    [' tutorial step by step', 'Step-by-step'],
    [' for kids', 'For kids'],
    [' facts', 'Cool facts'],
  ];
  $('videos').innerHTML = angles.map(([suffix, label]) => `
    <a class="video yt-link" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(q + suffix)}">
      <span>▶️</span><b>${esc(label)}</b><small class="muted">“${esc(q + suffix)}” on YouTube</small>
    </a>`).join('') +
    '<p class="fine" style="grid-column:1/-1">Tip: add a YouTube API key in ⚙️ Settings to watch videos right here.</p>';
}

function videoCard(id, sn) {
  const thumb = sn.thumbnails?.high?.url || sn.thumbnails?.medium?.url || '';
  return `<div class="video">
    <div class="frame" data-id="${esc(id)}">
      <img src="${esc(thumb)}" alt="">
      <button class="play" aria-label="Play">▶</button>
    </div>
    <div class="meta"><b>${esc(decodeEntities(sn.title))}</b><small>${esc(decodeEntities(sn.channelTitle))}</small></div>
  </div>`;
}
function decodeEntities(s) { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; }

$('videos').addEventListener('click', (e) => {
  const frame = e.target.closest('.frame[data-id]');
  if (!frame) return;
  frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(frame.dataset.id)}?autoplay=1"
    allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
});

// ---------- Pro / payments ----------
const isPro = () => store.get('sebPro') === 'yes';
if (new URLSearchParams(location.search).get('paid') === '1') store.set('sebPro', 'yes'); // Stripe redirect back
$('payNote').textContent = PAYMENT_LINK ? 'Secure checkout by Stripe.' : 'Demo mode: no real money is taken yet.';
$('buyBtn').addEventListener('click', () => {
  if (PAYMENT_LINK) { location.href = PAYMENT_LINK; return; }
  store.set('sebPro', 'yes');
  refreshPro();
});
function refreshPro() {
  $('paywall').classList.toggle('hidden', isPro());
  $('callRoom').classList.toggle('hidden', !isPro());
  if (isPro()) startPeer();
}

// ---------- Calling (PeerJS / WebRTC) ----------
let peer = null, currentCall = null, localStream = null, pendingCall = null;
const status = (t) => { $('callStatus').textContent = t; };
const shortId = () => Math.random().toString(36).slice(2, 8);

function startPeer() {
  if (peer || typeof Peer === 'undefined') {
    if (typeof Peer === 'undefined') status('Calling service did not load. Check your internet and refresh.');
    return;
  }
  let id = store.get('sebCallId') || shortId();
  peer = new Peer('sebsearch-' + id);
  peer.on('open', () => { store.set('sebCallId', id); $('myId').textContent = id; status('Ready. Share your ID to get calls.'); });
  peer.on('error', (err) => {
    if (err.type === 'unavailable-id') { store.set('sebCallId', shortId()); peer.destroy(); peer = null; startPeer(); return; }
    if (err.type === 'peer-unavailable') status('That ID is not online right now.');
    else status('Call error: ' + err.type);
  });
  peer.on('disconnected', () => { status('Reconnecting…'); peer.reconnect(); });
  peer.on('call', (call) => {
    pendingCall = call;
    $('callerId').textContent = call.peer.replace('sebsearch-', '');
    $('incoming').classList.remove('hidden');
  });
}

async function getMedia(video) {
  if (localStream) localStream.getTracks().forEach((t) => t.stop());
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
  $('localVideo').srcObject = localStream;
  return localStream;
}

function wireCall(call) {
  currentCall = call;
  $('hangupBtn').disabled = false;
  $('muteBtn').disabled = false;
  call.on('stream', (remote) => { $('remoteVideo').srcObject = remote; status('Connected with ' + call.peer.replace('sebsearch-', '') + ' 🎉'); });
  call.on('close', endCall);
  call.on('error', endCall);
}

async function placeCall(video) {
  const friend = $('friendId').value.trim().toLowerCase();
  if (!friend || !peer) return;
  try {
    status('Calling ' + friend + '…');
    const stream = await getMedia(video);
    wireCall(peer.call('sebsearch-' + friend, stream, { metadata: { video } }));
  } catch (err) {
    status('Could not use camera/microphone: ' + err.message);
  }
}
$('callForm').addEventListener('submit', (e) => { e.preventDefault(); placeCall(true); });
$('voiceBtn').addEventListener('click', () => { if ($('callForm').reportValidity()) placeCall(false); });

$('answerBtn').addEventListener('click', async () => {
  $('incoming').classList.add('hidden');
  if (!pendingCall) return;
  try {
    const stream = await getMedia(pendingCall.metadata?.video !== false);
    pendingCall.answer(stream);
    wireCall(pendingCall);
  } catch (err) {
    status('Could not use camera/microphone: ' + err.message);
  }
  pendingCall = null;
});
$('declineBtn').addEventListener('click', () => {
  $('incoming').classList.add('hidden');
  pendingCall?.close();
  pendingCall = null;
});

function endCall() {
  currentCall?.close();
  currentCall = null;
  localStream?.getTracks().forEach((t) => t.stop());
  localStream = null;
  $('remoteVideo').srcObject = null;
  $('localVideo').srcObject = null;
  $('hangupBtn').disabled = true;
  $('muteBtn').disabled = true;
  $('muteBtn').textContent = '🔇 Mute';
  status('Call ended.');
}
$('hangupBtn').addEventListener('click', endCall);
$('muteBtn').addEventListener('click', () => {
  const track = localStream?.getAudioTracks()[0];
  if (!track) return;
  track.enabled = !track.enabled;
  $('muteBtn').textContent = track.enabled ? '🔇 Mute' : '🔊 Unmute';
});
$('copyId').addEventListener('click', () => navigator.clipboard?.writeText($('myId').textContent));

// Open a search straight from the link (?q=...)
const startQ = new URLSearchParams(location.search).get('q');
if (startQ) { $('q').value = startQ; runSearch(); }
