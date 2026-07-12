/* ============================================================
   Fauna — Animal Encyclopedia
   Rendering, search, filtering, grouping, and detail modal
   ============================================================ */

(function () {
  "use strict";

  const STATUS_CLASS = {
    "Least Concern": "st-least",
    "Near Threatened": "st-near",
    "Vulnerable": "st-vulnerable",
    "Endangered": "st-endangered",
    "Critically Endangered": "st-critical",
    "Endangered (native range)": "st-endangered",
    "Domesticated": "st-domestic",
    "Not Evaluated": "st-unknown",
  };

  const statusClass = (s) => STATUS_CLASS[s] || "st-unknown";

  // --- State ---
  const state = {
    query: "",
    group: "All",
    sort: "genus",
  };

  // --- Elements ---
  const el = {
    search: document.getElementById("search"),
    chips: document.getElementById("chips"),
    sort: document.getElementById("sort"),
    results: document.getElementById("results"),
    meta: document.getElementById("result-meta"),
    headerCount: document.getElementById("header-count"),
    themeToggle: document.getElementById("theme-toggle"),
    statSpecies: document.getElementById("stat-species"),
    statGenera: document.getElementById("stat-genera"),
    statClasses: document.getElementById("stat-classes"),
    modalRoot: document.getElementById("modal-root"),
  };

  // --- Derived facts for hero + chips ---
  const groups = ["All", ...unique(ANIMALS.map((a) => a.group))];

  function unique(arr) {
    return [...new Set(arr)].sort();
  }

  // --- Build filter chips ---
  function renderChips() {
    el.chips.innerHTML = groups
      .map(
        (g) =>
          `<button class="chip${g === state.group ? " active" : ""}" data-group="${escapeAttr(
            g
          )}">${escapeHtml(g)}</button>`
      )
      .join("");
  }

  // --- Filtering / sorting ---
  function currentList() {
    const q = state.query.trim().toLowerCase();
    let list = ANIMALS.filter((a) => {
      if (state.group !== "All" && a.group !== state.group) return false;
      if (!q) return true;
      const hay = [
        a.name,
        a.scientificName,
        a.genus,
        a.family,
        a.order,
        a.class,
        a.group,
        a.habitat,
        a.diet,
        a.description,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });

    const collator = new Intl.Collator(undefined, { sensitivity: "base" });
    if (state.sort === "name") {
      list.sort((a, b) => collator.compare(a.name, b.name));
    } else if (state.sort === "class") {
      list.sort(
        (a, b) =>
          collator.compare(a.class, b.class) ||
          collator.compare(a.genus, b.genus) ||
          collator.compare(a.name, b.name)
      );
    } else {
      // by genus (default)
      list.sort(
        (a, b) =>
          collator.compare(a.genus, b.genus) || collator.compare(a.name, b.name)
      );
    }
    return list;
  }

  // --- Grouping for display ---
  function groupBy(list, keyFn) {
    const map = new Map();
    for (const item of list) {
      const key = keyFn(item);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return map;
  }

  function render() {
    const list = currentList();
    el.headerCount.textContent = `${ANIMALS.length} species`;

    if (list.length === 0) {
      el.meta.textContent = "";
      el.results.innerHTML = `
        <div class="empty">
          <div class="big">🔍🐾</div>
          <p>No animals match your search.</p>
          <button class="chip" id="clear-filters">Clear filters</button>
        </div>`;
      const clear = document.getElementById("clear-filters");
      if (clear)
        clear.addEventListener("click", () => {
          state.query = "";
          state.group = "All";
          el.search.value = "";
          renderChips();
          render();
        });
      return;
    }

    const generaShown = unique(list.map((a) => a.genus)).length;
    el.meta.textContent =
      `Showing ${list.length} species across ${generaShown} ` +
      `${generaShown === 1 ? "genus" : "genera"}` +
      (state.group !== "All" ? ` in ${state.group}` : "") +
      (state.query ? ` matching “${state.query}”` : "");

    // Group header depends on the active sort
    let keyFn, labelFn;
    if (state.sort === "name") {
      keyFn = (a) => a.name[0].toUpperCase();
      labelFn = (key, items) => ({
        title: key,
        path: "",
        count: items.length,
        italic: false,
      });
    } else if (state.sort === "class") {
      keyFn = (a) => a.class;
      labelFn = (key, items) => ({
        title: key,
        path: `${items[0].group}`,
        count: items.length,
        italic: false,
      });
    } else {
      keyFn = (a) => a.genus;
      labelFn = (key, items) => {
        const s = items[0];
        return {
          title: key,
          path: `${s.class} › ${s.order} › ${s.family}`,
          count: items.length,
          italic: true,
        };
      };
    }

    const grouped = groupBy(list, keyFn);
    const html = [...grouped.entries()]
      .map(([key, items]) => {
        const meta = labelFn(key, items);
        return `
        <section class="genus-group">
          <div class="genus-head">
            <h2${meta.italic ? "" : ' style="font-style:normal"'}>${escapeHtml(
          meta.title
        )}</h2>
            ${
              meta.path
                ? `<span class="taxon-path">${escapeHtml(meta.path)}</span>`
                : ""
            }
            <span class="genus-count">${meta.count} ${
          meta.count === 1 ? "species" : "species"
        }</span>
          </div>
          <div class="grid">
            ${items.map(cardHtml).join("")}
          </div>
        </section>`;
      })
      .join("");

    el.results.innerHTML = html;
  }

  function cardHtml(a) {
    const idx = ANIMALS.indexOf(a);
    return `
      <article class="card" data-idx="${idx}" tabindex="0" role="button"
               aria-label="View details for ${escapeAttr(a.name)}">
        <div class="card-media">
          <img loading="lazy" src="${escapeAttr(a.image)}" alt="${escapeAttr(
      a.name
    )}"
               onerror="this.onerror=null;this.src='${placeholder(a)}'">
          <span class="status-badge ${statusClass(a.status)}">${escapeHtml(
      a.status
    )}</span>
        </div>
        <div class="card-body">
          <h3>${escapeHtml(a.name)}</h3>
          <span class="sci">${escapeHtml(a.scientificName)}</span>
          <p class="blurb">${escapeHtml(a.description)}</p>
          <div class="card-tags">
            <span class="tag">${escapeHtml(a.group)}</span>
            <span class="tag">${escapeHtml(a.diet)}</span>
          </div>
        </div>
      </article>`;
  }

  // A group is given its own two-colour tint so the fallback art still reads
  // as intentional when a photo cannot load.
  const GROUP_TINT = {
    Mammals: ["#7c4a24", "#b9822f"],
    Birds: ["#1f6f8f", "#57b6c9"],
    Reptiles: ["#2f6b39", "#7aa43a"],
    Amphibians: ["#1f8f7a", "#63c58f"],
    Fish: ["#204f8f", "#4aa6c9"],
    Invertebrates: ["#5a2f8f", "#a25bc9"],
  };

  // Inline SVG fallback if an image fails to load. The whole SVG is
  // URL-encoded so it contains no quotes and is safe inside the single-quoted
  // onerror attribute in the card/modal markup.
  function placeholder(a) {
    const letter = (a.name[0] || "?").replace(/[&<>"']/g, "");
    const [c1, c2] = GROUP_TINT[a.group] || ["#243a2e", "#3d6b52"];
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>` +
      `</linearGradient></defs>` +
      `<rect width="100%" height="100%" fill="url(#g)"/>` +
      `<text x="50%" y="50%" font-size="150" fill="rgba(255,255,255,0.9)" ` +
      `text-anchor="middle" dominant-baseline="central" ` +
      `font-family="Georgia, serif" font-weight="bold">${letter}</text>` +
      `<text x="50%" y="86%" font-size="20" fill="rgba(255,255,255,0.7)" ` +
      `text-anchor="middle" letter-spacing="3" ` +
      `font-family="sans-serif">${escapeHtml(a.group).toUpperCase()}</text></svg>`;
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }

  // --- Modal ---
  function openModal(a) {
    const rows = [
      ["Conservation", a.status],
      ["Habitat", a.habitat],
      ["Range", a.range],
      ["Diet", a.diet],
      ["Size", a.size],
      ["Lifespan", a.lifespan],
    ];
    const factsHtml = (a.facts || [])
      .map((f) => `<li>${escapeHtml(f)}</li>`)
      .join("");

    el.modalRoot.innerHTML = `
      <div class="modal-backdrop" id="backdrop">
        <div class="modal" role="dialog" aria-modal="true" aria-label="${escapeAttr(
          a.name
        )}">
          <div class="modal-hero">
            <img src="${escapeAttr(a.image)}" alt="${escapeAttr(a.name)}"
                 onerror="this.onerror=null;this.src='${placeholder(a)}'">
            <div class="scrim"></div>
            <button class="modal-close" id="modal-close" aria-label="Close">×</button>
            <div class="titles">
              <h2>${escapeHtml(a.name)}</h2>
              <span class="sci">${escapeHtml(a.scientificName)}</span>
            </div>
          </div>
          <div class="modal-body">
            <div class="taxonomy-strip">
              ${taxonRank("Class", a.class)} <span class="sep">›</span>
              ${taxonRank("Order", a.order)} <span class="sep">›</span>
              ${taxonRank("Family", a.family)} <span class="sep">›</span>
              ${taxonRank("Genus", a.genus)}
            </div>
            <p class="lead">${escapeHtml(a.description)}</p>
            <div class="facts-grid">
              ${rows
                .map(
                  ([k, v]) => `
                <div class="fact-cell">
                  <div class="k">${escapeHtml(k)}</div>
                  <div class="v">${escapeHtml(v)}</div>
                </div>`
                )
                .join("")}
            </div>
            ${
              factsHtml
                ? `<div class="did-you-know">
                     <h4>Did you know?</h4>
                     <ul>${factsHtml}</ul>
                   </div>`
                : ""
            }
          </div>
        </div>
      </div>`;

    const backdrop = document.getElementById("backdrop");
    requestAnimationFrame(() => backdrop.classList.add("open"));
    document.body.style.overflow = "hidden";

    const close = () => closeModal();
    document.getElementById("modal-close").addEventListener("click", close);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });
  }

  function closeModal() {
    const backdrop = document.getElementById("backdrop");
    if (!backdrop) return;
    backdrop.classList.remove("open");
    document.body.style.overflow = "";
    setTimeout(() => {
      el.modalRoot.innerHTML = "";
    }, 200);
  }

  function taxonRank(rank, value) {
    return `<span class="rank">${rank}: <b>${escapeHtml(value)}</b></span>`;
  }

  // --- Theme ---
  function initTheme() {
    const saved = localStorage.getItem("fauna-theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    updateThemeIcon();
  }
  function toggleTheme() {
    const cur =
      document.documentElement.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark");
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("fauna-theme", next);
    updateThemeIcon();
  }
  function updateThemeIcon() {
    const cur =
      document.documentElement.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark");
    el.themeToggle.textContent = cur === "light" ? "🌙" : "☀️";
  }

  // --- Escaping helpers ---
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }
  function escapeAttr(str) {
    return escapeHtml(str);
  }

  // --- Hero stats ---
  function fillStats() {
    el.statSpecies.textContent = ANIMALS.length;
    el.statGenera.textContent = unique(ANIMALS.map((a) => a.genus)).length;
    el.statClasses.textContent = unique(ANIMALS.map((a) => a.class)).length;
  }

  // --- Events ---
  function bind() {
    let t;
    el.search.addEventListener("input", (e) => {
      clearTimeout(t);
      const v = e.target.value;
      t = setTimeout(() => {
        state.query = v;
        render();
      }, 120);
    });

    el.chips.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      state.group = btn.dataset.group;
      renderChips();
      render();
    });

    el.sort.addEventListener("change", (e) => {
      state.sort = e.target.value;
      render();
    });

    el.themeToggle.addEventListener("click", toggleTheme);

    // Card click / keyboard
    el.results.addEventListener("click", (e) => {
      const card = e.target.closest(".card");
      if (!card) return;
      openModal(ANIMALS[+card.dataset.idx]);
    });
    el.results.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target.closest(".card");
      if (!card) return;
      e.preventDefault();
      openModal(ANIMALS[+card.dataset.idx]);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
      if (e.key === "/" && document.activeElement !== el.search) {
        e.preventDefault();
        el.search.focus();
      }
    });
  }

  // --- Init ---
  initTheme();
  fillStats();
  renderChips();
  render();
  bind();
})();
