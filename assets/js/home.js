/* Home page */
window.pageInit = function () {
  "use strict";
  var SF = window.SF;

  function setText(selector, value) {
    var nodes = document.querySelectorAll(selector);
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = value;
  }

  setText("[data-stat-experiments]", SF.experiments.length);
  setText("[data-stat-videos]", SF.videos.length);
  setText("[data-stat-facts]", SF.facts.length);
  setText("[data-count-experiments]", SF.experiments.length);
  setText("[data-fact-total]", SF.facts.length);

  /* Everything about videos stays hidden until the first one is published.
     Add a video to data/videos.js and it all appears on its own. */
  var videoBits = document.querySelectorAll("[data-video-only]");
  for (var i = 0; i < videoBits.length; i++) videoBits[i].hidden = SF.videos.length === 0;

  var slot = document.querySelector("[data-latest-video]");
  var latest = SF.videos[0];
  if (slot && latest) {
    var experiment = SF.findExperiment(latest.experiment);
    slot.innerHTML =
      '<div class="video-item">' +
        '<div class="video-frame">' +
          '<iframe src="https://www.youtube-nocookie.com/embed/' + SF.esc(latest.youtubeId) + '" ' +
            'title="' + SF.esc(latest.title) + '" loading="lazy" allowfullscreen ' +
            'allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>' +
        '</div>' +
        '<div>' +
          '<p class="video-date">' + SF.esc(SF.prettyDate(latest.date)) + '</p>' +
          '<h3>' + SF.esc(latest.title) + '</h3>' +
          '<p>' + SF.esc(latest.description) + '</p>' +
          (experiment
            ? '<a class="btn btn-small" href="experiment.html?id=' + encodeURIComponent(experiment.id) + '">Get the instructions</a>'
            : '<a class="btn btn-small" href="experiments.html">Browse experiments</a>') +
        '</div>' +
      '</div>';
  }

  /* six featured experiments: ones with a video first, then the easy ones */
  var featured = SF.experiments.slice().sort(function (a, b) {
    var videoDiff = (SF.experimentVideoId(b) ? 1 : 0) - (SF.experimentVideoId(a) ? 1 : 0);
    if (videoDiff !== 0) return videoDiff;
    var order = { Easy: 0, Medium: 1, Tricky: 2 };
    return (order[a.difficulty] || 3) - (order[b.difficulty] || 3);
  }).slice(0, 6);
  SF.renderCards(document.querySelector("[data-featured]"), featured);

  /* a handful of facts, reshuffled on request */
  var tasterBox = document.querySelector("[data-fact-taster]");

  function showTaster() {
    if (!tasterBox) return;
    var picked = SF.pickFacts(6);
    tasterBox.innerHTML = picked.map(function (fact) {
      return '<div class="panel" style="margin:0">' +
        '<span class="tag">' + SF.esc(fact.topic) + '</span>' +
        '<p style="margin:12px 0 0">' + SF.esc(fact.text) + '</p></div>';
    }).join("");
  }
  showTaster();

  var reshuffle = document.querySelector("[data-fact-reshuffle]");
  if (reshuffle) reshuffle.addEventListener("click", showTaster);

  /* topic links */
  var topicBox = document.querySelector("[data-topic-links]");
  if (topicBox) {
    var counts = {};
    SF.experiments.forEach(function (experiment) {
      counts[experiment.topic] = (counts[experiment.topic] || 0) + 1;
    });
    topicBox.innerHTML = Object.keys(counts).sort().map(function (topic) {
      return '<a class="btn btn-small" style="background:#fff;box-shadow:inset 0 0 0 2px #e0e3f2;color:#101436" ' +
        'href="experiments.html?topic=' + encodeURIComponent(topic) + '">' +
        SF.topicIcon(topic) + " " + SF.esc(topic) + " (" + counts[topic] + ")</a>";
    }).join("");
  }
};
