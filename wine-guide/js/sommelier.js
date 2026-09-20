// ============================================================
// Ask the Sommelier — instant answers to wine questions.
//
// Two brains, one box:
//  1. When the page runs as a claude.ai Artifact, questions go to
//     Claude (the viewer's own account) with the guide's wine data
//     as context, streamed live into the page.
//  2. Everywhere else — or if Claude is unavailable/declined — a
//     built-in answerer replies straight from the data in wines.js.
// ============================================================

(function () {
  "use strict";

  const $form = document.getElementById("ask-form");
  const $input = document.getElementById("ask-input");
  const $btn = document.getElementById("ask-btn");
  const $stop = document.getElementById("ask-stop");
  const $out = document.getElementById("ask-answer");
  const $source = document.getElementById("ask-source");
  const $suggest = document.getElementById("ask-suggestions");

  // ---------- Wine name matching ----------
  // Every alias a visitor might type for each wine.
  function aliases(w) {
    const names = new Set();
    w.name.split("/").forEach((part) => {
      const p = part.replace(/\(.*?\)/g, "").trim().toLowerCase();
      if (p) names.add(p);
    });
    names.add(w.id.replace(/-/g, " "));
    // A few extras people actually say
    const extra = {
      "syrah": ["shiraz"], "pinot-grigio": ["pinot gris"], "grenache": ["garnacha"],
      "mourvedre": ["monastrell", "mataro"], "moscato": ["muscat"], "ice-wine": ["eiswein", "icewine"],
      "gamay": ["beaujolais"], "orange-wine": ["skin contact", "amber wine", "qvevri"],
      "tokaji": ["tokay"], "sparkling-rose": ["pink champagne"], "rosato-rosado": ["rosato", "rosado", "tavel"]
    };
    (extra[w.id] || []).forEach((a) => names.add(a));
    return [...names];
  }

  function findWines(q) {
    const hits = [];
    WINES.forEach((w) => {
      const hit = aliases(w).find((a) => q.includes(a));
      if (hit) hits.push({ wine: w, alias: hit });
    });
    // Prefer longer (more specific) matches: "cabernet sauvignon" beats "sauvignon blanc"'s partial
    hits.sort((a, b) => b.alias.length - a.alias.length);
    // Drop wines whose matched alias is wholly contained in a longer match at the same spot
    const kept = [];
    hits.forEach((h) => {
      if (!kept.some((k) => k.alias.includes(h.alias) && k.alias !== h.alias)) kept.push(h);
    });
    return kept.map((h) => h.wine);
  }

  // ---------- Local answerer (no Claude needed) ----------
  const SWEET_WORDS = ["bone dry", "dry", "off-dry", "medium-sweet", "sweet", "lusciously sweet"];

  function describeSweetness(w) {
    return SWEET_WORDS[Math.min(w.sweetness, 5)] || "dry";
  }

  function localAnswer(question) {
    const q = " " + question.toLowerCase().replace(/[?!.]/g, " ") + " ";
    const wines = findWines(q);
    const topic = {
      pairing: /pair|food|eat |dinner|goes with|drink with|match|serve with|cheese|steak|fish|dessert(?!\swine)/.test(q),
      temp: /temperature|chill|cold|warm|how.*serve|serve at/.test(q),
      abv: /alcohol|abv|strong|units|percent/.test(q),
      sweet: / sweet|how dry| dry |sugar/.test(q),
      origin: /where|origin|come from|from\?|region|country|grown|made in/.test(q),
      taste: /taste|flavou?r|smell|aroma|notes|what.*like/.test(q),
      glass: /glass/.test(q),
      facts: /fact|interesting|history|story|old|invent|why|who|when|tell me about/.test(q),
      compare: /difference|versus| vs |compared|better|or a |which/.test(q)
    };

    // Two wines + comparison words → side-by-side
    if (wines.length >= 2 && topic.compare) {
      const [a, b] = wines;
      return {
        text:
`${a.name} vs ${b.name}:

• ${a.name} — ${CATEGORIES[a.category].label.replace(/s$/, "").toLowerCase()}, ${describeSweetness(a)}, ${a.abv} alcohol, from ${a.origin}. Tastes of ${a.flavors.slice(0, 3).join(", ").toLowerCase()}. ${a.tagline}.
• ${b.name} — ${CATEGORIES[b.category].label.replace(/s$/, "").toLowerCase()}, ${describeSweetness(b)}, ${b.abv} alcohol, from ${b.origin}. Tastes of ${b.flavors.slice(0, 3).join(", ").toLowerCase()}. ${b.tagline}.

In short: go ${a.name} for ${a.pairings[0].toLowerCase()}, ${b.name} for ${b.pairings[0].toLowerCase()}.`
      };
    }

    if (wines.length) {
      const w = wines[0];
      const parts = [];
      if (topic.pairing) parts.push(`${w.name} pairs beautifully with ${w.pairings.join(", ").toLowerCase()}.`);
      if (topic.temp) parts.push(`Serve ${w.name} at ${w.servingTemp}, ideally in a ${w.glassware.toLowerCase()}.`);
      if (topic.abv) parts.push(`${w.name} is typically ${w.abv} alcohol.`);
      if (topic.sweet) parts.push(`${w.name} is ${describeSweetness(w)} (sweetness ${w.sweetness}/5), with acidity ${w.acidity}/5 and body ${w.body}/5.`);
      if (topic.origin) parts.push(`${w.name} comes from ${w.origin}. Key regions today: ${w.regions.join("; ")}.`);
      if (topic.taste) parts.push(`Expect ${w.flavors.join(", ").toLowerCase()} — ${w.tagline.toLowerCase()}.`);
      if (topic.glass) parts.push(`${w.name} is best from a ${w.glassware.toLowerCase()}, served at ${w.servingTemp}.`);
      if (topic.facts || !parts.length) {
        parts.push(w.description);
        parts.push("Did you know? " + w.facts[0]);
      }
      return { text: parts.join("\n\n") };
    }

    // No wine named — try to recommend by food/flavour keywords
    const words = q.split(/\s+/).filter((x) => x.length > 3);
    const scored = WINES.map((w) => {
      const hay = (w.pairings.join(" ") + " " + w.flavors.join(" ") + " " + w.regions.join(" ") + " " + w.description).toLowerCase();
      const score = words.reduce((s, word) => s + (hay.includes(word) ? 1 : 0), 0);
      return { w, score };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

    if (scored.length) {
      return {
        text: "Based on the guide, I'd suggest:\n\n" + scored.map(({ w }) =>
          `• ${w.name} — ${w.tagline.toLowerCase()}; great with ${w.pairings.slice(0, 2).join(" and ").toLowerCase()}.`
        ).join("\n") + "\n\nClick any of those wines above for the full story."
      };
    }

    return {
      text: "I couldn't match that to the guide. Try naming a wine (e.g. “How sweet is Riesling?”), a food (“What goes with steak?”), or two wines to compare (“Champagne vs Prosecco”)."
    };
  }

  // ---------- Claude-powered answerer (Artifact viewer only) ----------
  let sample = null;
  const samplePromise = (window.claude && window.claude.use)
    ? window.claude.use("sample").then((s) => { sample = s; return s; }).catch(() => null)
    : Promise.resolve(null);
  let claudeDisabled = false;

  function compactWine(w) {
    return {
      name: w.name, type: CATEGORIES[w.category].label, tagline: w.tagline,
      origin: w.origin, regions: w.regions, abv: w.abv,
      profile: `sweetness ${w.sweetness}/5, body ${w.body}/5, tannin ${w.tannin}/5, acidity ${w.acidity}/5`,
      servingTemp: w.servingTemp, glass: w.glassware,
      flavors: w.flavors, pairings: w.pairings, about: w.description, facts: w.facts
    };
  }

  function buildPrompt(question) {
    const matched = findWines(" " + question.toLowerCase() + " ").slice(0, 4);
    const context = matched.length
      ? JSON.stringify(matched.map(compactWine))
      : "Wine index: " + WINES.map((w) => `${w.name} (${w.category})`).join("; ");
    return (
      "You are the friendly sommelier of “Seb's Complete Wine Guide”, a website covering 53 wine types. " +
      "Answer the visitor's question conversationally in 2-6 short sentences of plain text (no markdown, no headings). " +
      "Ground your answer in the guide data below when it is relevant; you may add general wine knowledge. " +
      "If the question is not about wine or drinks, gently steer back to wine.\n\n" +
      "GUIDE DATA: " + context + "\n\n" +
      "VISITOR'S QUESTION: " + question
    );
  }

  const ERROR_COPY = {
    rate_limited: "Claude is getting a lot of questions right now — here's what the guide itself says:",
    session_expired: "Your Claude session expired — answering from the guide's data instead:",
    refused: "Claude passed on that one — here's what the guide itself says:",
    upstream_error: "Couldn't reach Claude just now — answering from the guide's data instead:"
  };
  const DISABLE_CODES = ["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"];

  // ---------- UI wiring ----------
  let ctl = null;

  function setBusy(busy) {
    $btn.disabled = busy;
    $stop.hidden = !busy;
    $input.disabled = busy;
  }

  function showAnswer(text, sourceLabel) {
    $out.hidden = false;
    $out.textContent = text;
    $source.textContent = sourceLabel;
  }

  async function ask(question) {
    if (!question.trim()) return;
    $out.hidden = false;
    $out.textContent = "Thinking…";
    $source.textContent = "";
    setBusy(true);

    await samplePromise;

    if (sample && !claudeDisabled) {
      ctl = new AbortController();
      try {
        const { text } = await sample(buildPrompt(question), {
          modelTier: "quick",
          signal: ctl.signal,
          onText: ({ text }) => { $out.textContent = text; }
        });
        showAnswer(text, "Answered by Claude · using the guide's data");
        setBusy(false);
        return;
      } catch (e) {
        if (e && e.code === "cancelled") {
          showAnswer(e.text || "Stopped.", e.text ? "Answer stopped early" : "");
          setBusy(false);
          return;
        }
        if (e && DISABLE_CODES.includes(e.code)) claudeDisabled = true;
        const note = (e && ERROR_COPY[e.code]) || (claudeDisabled ? "" : ERROR_COPY.upstream_error);
        const local = localAnswer(question);
        showAnswer((note ? note + "\n\n" : "") + local.text, "Answered from the guide's data");
        setBusy(false);
        return;
      }
    }

    // Local mode
    const local = localAnswer(question);
    showAnswer(local.text, "Answered from the guide's data");
    setBusy(false);
  }

  $form.addEventListener("submit", (e) => {
    e.preventDefault();
    ask($input.value);
  });

  $stop.addEventListener("click", () => { if (ctl) ctl.abort(); });

  $suggest.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-q]");
    if (!b) return;
    $input.value = b.dataset.q;
    ask(b.dataset.q);
  });
})();
