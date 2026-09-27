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

  /* latest video, or a friendly "coming soon" box */
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
  } else if (slot) {
    slot.innerHTML =
      '<div class="empty-state">' +
        '<div class="big">🎥</div>' +
        '<h3>The first video is on its way</h3>' +
        '<p>New videos land here every week. In the meantime, every experiment below has full written instructions.</p>' +
        '<p><a class="btn btn-small" href="experiments.html">Start experimenting</a></p>' +
      '</div>';
  }

  /* six featured experiments: prefer ones with a video, then easy ones */
  var featured = SF.experiments.slice().sort(function (a, b) {
    var videoDiff = (SF.experimentVideoId(b) ? 1 : 0) - (SF.experimentVideoId(a) ? 1 : 0);
    if (videoDiff !== 0) return videoDiff;
    var order = { Easy: 0, Medium: 1, Tricky: 2 };
    return (order[a.difficulty] || 3) - (order[b.difficulty] || 3);
  }).slice(0, 6);
  SF.renderCards(document.querySelector("[data-featured]"), featured);

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
