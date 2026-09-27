/* =========================================================
   SCIENCE FACT - shared helpers
   ========================================================= */

(function () {
  "use strict";

  var SF = window.SF = {};

  /* ---- safety: never drop raw text into HTML ---- */
  SF.esc = function (value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  /* A YouTube id is 11 characters of letters, numbers, - and _.
     Anything else is rejected so a bad paste cannot break the page. */
  SF.cleanYouTubeId = function (raw) {
    var value = String(raw || "").trim();
    var match;
    if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
    match = value.match(/[?&]v=([A-Za-z0-9_-]{11})/);
    if (match) return match[1];
    match = value.match(/(?:youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
    if (match) return match[1];
    return "";
  };

  SF.experiments = window.EXPERIMENTS || [];
  SF.facts = window.FACTS || [];

  /* Published videos from data/videos.js, cleaned up and newest first. */
  SF.videos = (window.VIDEOS || [])
    .map(function (video, index) {
      return {
        id: video.id || ("video-" + (index + 1)),
        title: video.title || "Untitled video",
        date: video.date || "",
        youtubeId: SF.cleanYouTubeId(video.youtubeId),
        experiment: video.experiment || "",
        description: video.description || ""
      };
    })
    .filter(function (video) { return video.youtubeId !== ""; })
    .sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });

  SF.findExperiment = function (id) {
    for (var i = 0; i < SF.experiments.length; i++) {
      if (SF.experiments[i].id === id) return SF.experiments[i];
    }
    return null;
  };

  SF.videoForExperiment = function (experimentId) {
    for (var i = 0; i < SF.videos.length; i++) {
      if (SF.videos[i].experiment === experimentId) return SF.videos[i];
    }
    return null;
  };

  /* An experiment can point at its own video, or a video can point back. */
  SF.experimentVideoId = function (experiment) {
    var own = SF.cleanYouTubeId(experiment.videoId);
    if (own) return own;
    var linked = SF.videoForExperiment(experiment.id);
    return linked ? linked.youtubeId : "";
  };

  SF.prettyDate = function (iso) {
    if (!iso) return "";
    var parts = String(iso).split("-");
    if (parts.length !== 3) return iso;
    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(date.getTime())) return iso;
    var months = ["January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"];
    return date.getDate() + " " + months[date.getMonth()] + " " + date.getFullYear();
  };

  SF.difficultyClass = function (difficulty) {
    var key = String(difficulty || "").toLowerCase();
    if (key === "easy") return "tag tag-easy";
    if (key === "medium") return "tag tag-medium";
    if (key === "tricky") return "tag tag-tricky";
    return "tag";
  };

  var ICONS = {
    "Liquids": "🧪",
    "Chemistry": "⚗️",
    "Forces": "🚀",
    "Electricity": "⚡",
    "Weather": "⛅",
    "Materials": "🥼",
    "Plants and Water": "🌱"
  };

  SF.topicIcon = function (topic) { return ICONS[topic] || "🔭"; };

  /* ---- one experiment card ---- */
  SF.cardHTML = function (experiment) {
    var hasVideo = SF.experimentVideoId(experiment) !== "";
    return '' +
      '<a class="exp-card" href="experiment.html?id=' + encodeURIComponent(experiment.id) + '">' +
        '<div class="thumb" aria-hidden="true">' + SF.topicIcon(experiment.topic) +
          (hasVideo ? '<span class="has-video">Video</span>' : '') +
        '</div>' +
        '<div class="body">' +
          '<h3>' + SF.esc(experiment.title) + '</h3>' +
          '<p class="blurb">' + SF.esc(experiment.blurb) + '</p>' +
          '<div class="tag-row">' +
            '<span class="' + SF.difficultyClass(experiment.difficulty) + '">' + SF.esc(experiment.difficulty) + '</span>' +
            '<span class="tag">' + SF.esc(experiment.topic) + '</span>' +
            '<span class="tag">Ages ' + SF.esc(experiment.ages) + '</span>' +
          '</div>' +
        '</div>' +
      '</a>';
  };

  SF.renderCards = function (target, list) {
    if (!target) return;
    if (!list.length) {
      target.innerHTML = '<div class="empty-state"><div class="big">🔍</div>' +
        '<h3>Nothing matches that yet</h3><p>Try clearing a filter or searching for something shorter.</p></div>';
      return;
    }
    target.innerHTML = list.map(SF.cardHTML).join("");
  };

  /* n different facts, picked at random */
  SF.pickFacts = function (wanted) {
    var pool = SF.facts.slice();
    var picked = [];
    while (picked.length < wanted && pool.length) {
      picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return picked;
  };

  /* ---- fact of the day ---- */
  SF.factOfTheDay = function () {
    if (!SF.facts.length) return null;
    var start = new Date(2026, 0, 1);
    var today = new Date();
    var days = Math.floor((today - start) / 86400000);
    return SF.facts[((days % SF.facts.length) + SF.facts.length) % SF.facts.length];
  };

  SF.mountFact = function (root) {
    if (!root) return;
    var textEl = root.querySelector("[data-fact-text]");
    var topicEl = root.querySelector("[data-fact-topic]");
    var button = root.querySelector("[data-fact-next]");
    var index = SF.facts.indexOf(SF.factOfTheDay());
    if (index < 0) index = 0;

    function show() {
      var fact = SF.facts[index];
      if (!fact) return;
      if (textEl) textEl.textContent = fact.text;
      if (topicEl) topicEl.textContent = fact.topic;
    }
    show();

    if (button) {
      button.addEventListener("click", function () {
        index = (index + 1) % SF.facts.length;
        show();
      });
    }
  };

  /* ---- mobile nav ---- */
  function setupNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("site-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---- mark the current page in the nav ---- */
  function markCurrentPage() {
    var here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    if (here === "") here = "index.html";
    var links = document.querySelectorAll("#site-nav a");
    for (var i = 0; i < links.length; i++) {
      var target = (links[i].getAttribute("href") || "").toLowerCase();
      var sameSection =
        (here === "experiment.html" && target === "experiments.html") ||
        (here === "studio.html" && target === "desk.html");
      if (target === here || sameSection) {
        links[i].setAttribute("aria-current", "page");
      }
    }
  }

  /* No videos up yet? Then the Videos link is just a dead end, so it waits. */
  function tidyNav() {
    if (SF.videos.length) return;
    var links = document.querySelectorAll('#site-nav a[href="videos.html"]');
    for (var i = 0; i < links.length; i++) {
      var item = links[i].parentNode;
      if (item && item.parentNode) item.parentNode.removeChild(item);
    }
    var footerLinks = document.querySelectorAll('.site-footer a[href="videos.html"]');
    for (var j = 0; j < footerLinks.length; j++) {
      var row = footerLinks[j].parentNode;
      if (row && row.parentNode) row.parentNode.removeChild(row);
    }
  }

  /* When the members' door is on, offer a way to shut it again on
     this device - handy for checking what a visitor would see. */
  function addLockLink() {
    if (!window.SITE_LOCKED || !window.SFGate) return;
    var strip = document.querySelector(".footer-bottom");
    if (!strip) return;
    var link = document.createElement("a");
    link.href = "#";
    link.textContent = "Lock this device out again";
    link.style.cssText = "width:100%;font-size:.82rem;opacity:.75";
    link.addEventListener("click", function (event) {
      event.preventDefault();
      window.SFGate.signOut();
    });
    strip.appendChild(link);
  }

  function setYear() {
    var slots = document.querySelectorAll("[data-year]");
    for (var i = 0; i < slots.length; i++) slots[i].textContent = new Date().getFullYear();
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupNav();
    markCurrentPage();
    tidyNav();
    addLockLink();
    setYear();
    SF.mountFact(document.querySelector("[data-fact-card]"));
    if (typeof window.pageInit === "function") window.pageInit();
  });
})();
