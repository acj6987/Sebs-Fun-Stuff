/* Videos page */
window.pageInit = function () {
  "use strict";
  var SF = window.SF;

  var listEl = document.querySelector("[data-video-list]");
  var countEl = document.querySelector("[data-video-count]");

  if (!SF.videos.length) {
    countEl.textContent = "";
    listEl.innerHTML =
      '<div class="empty-state">' +
        '<div class="big">🎬</div>' +
        '<h3>No videos up here yet</h3>' +
        '<p>The first one is coming soon, and then there will be a new one every week. ' +
        'Every experiment already has full written instructions, so you can start now.</p>' +
        '<p><a class="btn btn-small" href="experiments.html">Browse the experiments</a></p>' +
      '</div>';
    return;
  }

  countEl.textContent = SF.videos.length === 1 ? "1 video so far" : SF.videos.length + " videos so far";

  listEl.innerHTML = SF.videos.map(function (video, index) {
    var experiment = SF.findExperiment(video.experiment);
    return '' +
      '<article class="video-item">' +
        '<div class="video-frame">' +
          '<iframe src="https://www.youtube-nocookie.com/embed/' + SF.esc(video.youtubeId) + '" ' +
            'title="' + SF.esc(video.title) + '" loading="' + (index === 0 ? "eager" : "lazy") + '" allowfullscreen ' +
            'allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>' +
        '</div>' +
        '<div>' +
          '<p class="video-date">' + (index === 0 ? "Latest &middot; " : "") + SF.esc(SF.prettyDate(video.date)) + '</p>' +
          '<h3>' + SF.esc(video.title) + '</h3>' +
          '<p>' + SF.esc(video.description) + '</p>' +
          (experiment
            ? '<a class="btn btn-small" href="experiment.html?id=' + encodeURIComponent(experiment.id) + '">Instructions for this one</a>'
            : '') +
        '</div>' +
      '</article>';
  }).join("");
};
