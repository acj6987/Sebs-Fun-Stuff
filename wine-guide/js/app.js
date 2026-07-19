// ============================================================
// Seb's Complete Wine Guide — rendering, search, filters, modal
// All illustrations are generated SVG, so the site works
// completely offline with zero external assets.
// ============================================================

(function () {
  "use strict";

  // ---------- Glass geometry per wine category ----------
  // Each glass is described by a few control values; the bowl is a
  // smooth cubic path and the wine is a gradient rect clipped to it.
  const GLASS = {
    red:       { rim: 34, belly: 46, bowlH: 78,  rimY: 48,  fill: 0.30, stemH: 52, foot: 34 },
    white:     { rim: 27, belly: 35, bowlH: 74,  rimY: 52,  fill: 0.32, stemH: 56, foot: 30 },
    rose:      { rim: 26, belly: 33, bowlH: 76,  rimY: 50,  fill: 0.30, stemH: 56, foot: 30 },
    sparkling: { rim: 15, belly: 19, bowlH: 104, rimY: 34,  fill: 0.14, stemH: 44, foot: 28 },
    dessert:   { rim: 20, belly: 27, bowlH: 58,  rimY: 70,  fill: 0.30, stemH: 50, foot: 26 },
    fortified: { rim: 18, belly: 26, bowlH: 62,  rimY: 66,  fill: 0.28, stemH: 48, foot: 26 },
    orange:    { rim: 28, belly: 37, bowlH: 74,  rimY: 52,  fill: 0.30, stemH: 56, foot: 30 }
  };

  // Grape bunch colour per category
  const GRAPE = {
    red: "#5b1e3f", white: "#a8b558", rose: "#b86478", sparkling: "#a8b558",
    dessert: "#c9a23f", fortified: "#5b1e3f", orange: "#c98c3f"
  };

  function bowlPath(g, cx) {
    const { rim, belly, bowlH, rimY } = g;
    const bottom = rimY + bowlH;
    return `M ${cx - rim} ${rimY}
            C ${cx - belly} ${rimY + bowlH * 0.42}, ${cx - belly} ${rimY + bowlH * 0.78}, ${cx} ${bottom}
            C ${cx + belly} ${rimY + bowlH * 0.78}, ${cx + belly} ${rimY + bowlH * 0.42}, ${cx + rim} ${rimY} Z`;
  }

  function grapeBunch(cx, cy, color, scale) {
    const s = scale || 1;
    const r = 5.2 * s;
    const rows = [[0], [-1, 1], [-1.7, 0, 1.7], [-1, 1], [0]];
    let out = `<g>`;
    // little stalk + leaf
    out += `<path d="M ${cx} ${cy - 8 * s} q ${3 * s} ${-7 * s} ${8 * s} ${-9 * s}" stroke="#6d5a33" stroke-width="${1.6 * s}" fill="none" stroke-linecap="round"/>`;
    out += `<path d="M ${cx + 7 * s} ${cy - 16 * s} q ${9 * s} ${-5 * s} ${13 * s} ${2 * s} q ${-8 * s} ${5 * s} ${-13 * s} ${-2 * s} Z" fill="#7d9450" opacity="0.9"/>`;
    rows.forEach((row, i) => {
      row.forEach((x) => {
        out += `<circle cx="${cx + x * r * 1.55}" cy="${cy + i * r * 1.5}" r="${r}" fill="${color}"/>
                <circle cx="${cx + x * r * 1.55 - r * 0.3}" cy="${cy + i * r * 1.5 - r * 0.3}" r="${r * 0.28}" fill="#ffffff" opacity="0.35"/>`;
      });
    });
    return out + `</g>`;
  }

  function bubbles(cx, fillY, bottom, uid) {
    let out = `<g clip-path="url(#bowl-${uid})">`;
    const seeds = [0.15, 0.35, 0.55, 0.72, 0.9, 0.25, 0.62, 0.45, 0.8, 0.08];
    seeds.forEach((s, i) => {
      const x = cx - 12 + (i % 5) * 6 + s * 4;
      const y = bottom - s * (bottom - fillY - 6);
      out += `<circle cx="${x}" cy="${y}" r="${1 + (i % 3) * 0.6}" fill="#fff" opacity="${0.35 + s * 0.3}"/>`;
    });
    return out + `</g>`;
  }

  // ---------- The illustration: bottle + pouring glass + grapes ----------
  function wineIllustration(wine, big) {
    const uid = wine.id + (big ? "-big" : "");
    const g = GLASS[wine.category];
    const W = 230, H = 250;
    const cx = 132;
    const bottomBowl = g.rimY + g.bowlH;
    const fillY = g.rimY + g.bowlH * g.fill;
    const stemTop = bottomBowl - 2;
    const stemBot = stemTop + g.stemH;
    const [c1, c2] = wine.hue;
    const glow = c1;

    // Bottle behind the glass
    const bx = 52, bTop = 38, bW = 34, bBot = 218;
    const bottle = `
      <g opacity="0.92">
        <path d="M ${bx - bW / 2} ${bBot} L ${bx - bW / 2} ${bTop + 62}
                 C ${bx - bW / 2} ${bTop + 44}, ${bx - 7} ${bTop + 40}, ${bx - 7} ${bTop + 26}
                 L ${bx - 7} ${bTop} L ${bx + 7} ${bTop} L ${bx + 7} ${bTop + 26}
                 C ${bx + 7} ${bTop + 40}, ${bx + bW / 2} ${bTop + 44}, ${bx + bW / 2} ${bTop + 62}
                 L ${bx + bW / 2} ${bBot} Z"
              fill="url(#bottle-${uid})" stroke="rgba(255,255,255,0.14)" stroke-width="1"/>
        <rect x="${bx - 7}" y="${bTop - 8}" width="14" height="10" rx="2" fill="#8a2b33"/>
        <rect x="${bx - bW / 2 + 4}" y="${bTop + 92}" width="${bW - 8}" height="52" rx="4"
              fill="rgba(244,236,215,0.92)"/>
        <rect x="${bx - bW / 2 + 8}" y="${bTop + 100}" width="${bW - 16}" height="3" rx="1.5" fill="${c1}"/>
        <rect x="${bx - bW / 2 + 8}" y="${bTop + 108}" width="${bW - 16}" height="2" rx="1" fill="#9a8f76"/>
        <rect x="${bx - bW / 2 + 8}" y="${bTop + 114}" width="${bW - 22}" height="2" rx="1" fill="#9a8f76"/>
        <rect x="${bx - bW / 2 + 8}" y="${bTop + 126}" width="${bW - 16}" height="10" rx="2" fill="${c1}" opacity="0.85"/>
        <path d="M ${bx - bW / 2 + 5} ${bTop + 58} L ${bx - bW / 2 + 5} ${bBot - 10}"
              stroke="rgba(255,255,255,0.25)" stroke-width="3" stroke-linecap="round"/>
      </g>`;

    const isSparkling = wine.category === "sparkling";

    return `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img"
         aria-label="Illustration of a glass and bottle of ${esc(wine.name)}" class="wine-art${big ? " wine-art-big" : ""}">
      <defs>
        <radialGradient id="glow-${uid}" cx="50%" cy="42%" r="65%">
          <stop offset="0%" stop-color="${glow}" stop-opacity="0.34"/>
          <stop offset="100%" stop-color="${glow}" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="wine-${uid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="100%" stop-color="${c2}"/>
        </linearGradient>
        <linearGradient id="bottle-${uid}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#20343a"/>
          <stop offset="55%" stop-color="#33535c"/>
          <stop offset="100%" stop-color="#16262b"/>
        </linearGradient>
        <clipPath id="bowl-${uid}"><path d="${bowlPath(g, cx)}"/></clipPath>
      </defs>

      <rect x="0" y="0" width="${W}" height="${H}" rx="18" fill="url(#glow-${uid})"/>
      <!-- distant hills -->
      <path d="M 0 216 Q 55 196 115 212 T 230 208 L 230 250 L 0 250 Z" fill="rgba(255,255,255,0.05)"/>
      <ellipse cx="118" cy="232" rx="98" ry="7" fill="rgba(0,0,0,0.28)"/>

      ${bottle}

      <!-- wine inside the bowl -->
      <g clip-path="url(#bowl-${uid})">
        <rect x="${cx - g.belly - 2}" y="${fillY}" width="${(g.belly + 2) * 2}" height="${g.bowlH}" fill="url(#wine-${uid})"/>
        <ellipse cx="${cx}" cy="${fillY}" rx="${g.belly * 0.97}" ry="4.5" fill="#ffffff" opacity="0.22"/>
      </g>
      ${isSparkling ? bubbles(cx, fillY, bottomBowl, uid) : ""}

      <!-- glass bowl outline & shine -->
      <path d="${bowlPath(g, cx)}" fill="rgba(255,255,255,0.05)"
            stroke="rgba(255,255,255,0.65)" stroke-width="2.2"/>
      <path d="M ${cx - g.rim + 5} ${g.rimY + 8} C ${cx - g.belly + 4} ${g.rimY + g.bowlH * 0.4},
               ${cx - g.belly + 6} ${g.rimY + g.bowlH * 0.6}, ${cx - g.rim + 12} ${g.rimY + g.bowlH * 0.72}"
            stroke="rgba(255,255,255,0.5)" stroke-width="2.4" fill="none" stroke-linecap="round"/>

      <!-- stem & foot -->
      <line x1="${cx}" y1="${stemTop}" x2="${cx}" y2="${stemBot}"
            stroke="rgba(255,255,255,0.65)" stroke-width="3.4" stroke-linecap="round"/>
      <ellipse cx="${cx}" cy="${stemBot + 3}" rx="${g.foot}" ry="5.5"
               fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.6)" stroke-width="2"/>

      ${grapeBunch(196, 176, GRAPE[wine.category], 0.85)}
    </svg>`;
  }

  // ---------- Helpers ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function statDots(value) {
    let out = "";
    for (let i = 1; i <= 5; i++) {
      out += `<span class="dot${i <= value ? " on" : ""}"></span>`;
    }
    return `<span class="dots">${out}</span>`;
  }

  const STAT_LABELS = { body: "Body", sweetness: "Sweetness", tannin: "Tannin", acidity: "Acidity" };

  // ---------- Rendering ----------
  const state = { query: "", category: "all" };
  const $grid = document.getElementById("sections");
  const $count = document.getElementById("result-count");
  const $search = document.getElementById("search");
  const $chips = document.getElementById("chips");
  const $modal = document.getElementById("modal");
  const $modalBody = document.getElementById("modal-body");

  function matches(wine) {
    if (state.category !== "all" && wine.category !== state.category) return false;
    if (!state.query) return true;
    const q = state.query.toLowerCase();
    const hay = [
      wine.name, wine.tagline, wine.origin, wine.description,
      wine.regions.join(" "), wine.flavors.join(" "), wine.pairings.join(" ")
    ].join(" ").toLowerCase();
    return hay.includes(q);
  }

  function card(wine) {
    return `
      <article class="card" data-id="${wine.id}" tabindex="0" role="button"
               aria-label="Open details for ${esc(wine.name)}">
        <div class="card-art">${wineIllustration(wine, false)}</div>
        <div class="card-info">
          <h3>${esc(wine.name)}</h3>
          <p class="tagline">${esc(wine.tagline)}</p>
          <p class="origin">📍 ${esc(wine.origin)}</p>
          <div class="mini-stats">
            <span title="Body">Body ${statDots(wine.body)}</span>
            <span title="Sweetness">Sweet ${statDots(wine.sweetness)}</span>
          </div>
        </div>
      </article>`;
  }

  function render() {
    const cats = state.category === "all" ? Object.keys(CATEGORIES) : [state.category];
    let total = 0;
    let html = "";
    cats.forEach((cat) => {
      const wines = WINES.filter((w) => w.category === cat && matches(w));
      if (!wines.length) return;
      total += wines.length;
      html += `
        <section class="cat-section" id="cat-${cat}">
          <header class="cat-header">
            <h2>${esc(CATEGORIES[cat].label)} <span class="cat-count">${wines.length}</span></h2>
            <p>${esc(CATEGORIES[cat].blurb)}</p>
          </header>
          <div class="grid">${wines.map(card).join("")}</div>
        </section>`;
    });
    $grid.innerHTML = html || `<p class="no-results">No wines match “${esc(state.query)}” — try another search.</p>`;
    $count.textContent = `${total} wine${total === 1 ? "" : "s"} shown of ${WINES.length}`;
  }

  // ---------- Modal ----------
  function openModal(wine) {
    const stats = ["body", "sweetness", "tannin", "acidity"]
      .map((k) => `<div class="stat-row"><span class="stat-label">${STAT_LABELS[k]}</span>${statDots(wine[k])}</div>`)
      .join("");

    $modalBody.innerHTML = `
      <div class="modal-hero">
        <div class="modal-art">${wineIllustration(wine, true)}</div>
        <div class="modal-title">
          <span class="cat-pill">${esc(CATEGORIES[wine.category].label)}</span>
          <h2>${esc(wine.name)}</h2>
          <p class="pron">/ ${esc(wine.pronounce)} /</p>
          <p class="tagline">${esc(wine.tagline)}</p>
          <div class="stats">${stats}</div>
        </div>
      </div>

      <p class="desc">${esc(wine.description)}</p>

      <div class="fact-grid">
        <div class="fact-box"><h4>🌍 Origin</h4><p>${esc(wine.origin)}</p></div>
        <div class="fact-box"><h4>🍷 Alcohol</h4><p>${esc(wine.abv)}</p></div>
        <div class="fact-box"><h4>🌡️ Serve at</h4><p>${esc(wine.servingTemp)}</p></div>
        <div class="fact-box"><h4>🥂 Glass</h4><p>${esc(wine.glassware)}</p></div>
      </div>

      <h3 class="sec">Key regions</h3>
      <div class="chip-row">${wine.regions.map((r) => `<span class="chip">${esc(r)}</span>`).join("")}</div>

      <h3 class="sec">What it tastes like</h3>
      <div class="chip-row">${wine.flavors.map((f) => `<span class="chip flavor">${esc(f)}</span>`).join("")}</div>

      <h3 class="sec">Perfect pairings</h3>
      <div class="chip-row">${wine.pairings.map((p) => `<span class="chip pairing">${esc(p)}</span>`).join("")}</div>

      <h3 class="sec">Fascinating facts</h3>
      <ul class="facts">${wine.facts.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>`;

    $modal.classList.add("open");
    document.body.classList.add("modal-open");
    $modal.querySelector(".modal-card").scrollTop = 0;
    $modal.querySelector(".modal-close").focus();
  }

  function closeModal() {
    $modal.classList.remove("open");
    document.body.classList.remove("modal-open");
  }

  // ---------- Events ----------
  $search.addEventListener("input", (e) => { state.query = e.target.value.trim(); render(); });

  $chips.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-cat]");
    if (!btn) return;
    state.category = btn.dataset.cat;
    $chips.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });

  $grid.addEventListener("click", (e) => {
    const el = e.target.closest(".card");
    if (!el) return;
    const wine = WINES.find((w) => w.id === el.dataset.id);
    if (wine) openModal(wine);
  });
  $grid.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const el = e.target.closest(".card");
    if (!el) return;
    e.preventDefault();
    const wine = WINES.find((w) => w.id === el.dataset.id);
    if (wine) openModal(wine);
  });

  $modal.addEventListener("click", (e) => {
    if (e.target === $modal || e.target.closest(".modal-close")) closeModal();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  // ---------- Build the filter chips & first render ----------
  $chips.innerHTML =
    `<button data-cat="all" class="active">All wines</button>` +
    Object.entries(CATEGORIES)
      .map(([id, c]) => `<button data-cat="${id}">${esc(c.label)}</button>`)
      .join("");

  document.getElementById("wine-total").textContent = WINES.length;
  render();
})();
