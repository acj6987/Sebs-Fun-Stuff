/* Single experiment page */
window.pageInit = function () {
  "use strict";
  var SF = window.SF;

  var id = new URLSearchParams(location.search).get("id");
  var experiment = id ? SF.findExperiment(id) : null;

  var titleEl = document.querySelector("[data-title]");
  var blurbEl = document.querySelector("[data-blurb]");
  var mainEl = document.querySelector("[data-main]");
  var sideEl = document.querySelector("[data-side]");

  if (!experiment) {
    titleEl.textContent = "Experiment not found";
    blurbEl.textContent = "That link does not match anything in the library.";
    mainEl.innerHTML = '<div class="empty-state"><div class="big">🧭</div>' +
      '<h3>Let us get you back on track</h3>' +
      '<p><a class="btn btn-small" href="experiments.html">See all experiments</a></p></div>';
    sideEl.innerHTML = "";
    document.title = "Experiment not found | Science Fact";
    return;
  }

  document.title = experiment.title + " | Science Fact";
  titleEl.textContent = experiment.title;
  blurbEl.textContent = experiment.blurb;

  var list = function (items) {
    return (items || []).map(function (item) { return "<li>" + SF.esc(item) + "</li>"; }).join("");
  };

  var videoId = SF.experimentVideoId(experiment);
  var videoBlock = videoId
    ? '<div class="panel print-hide"><h2>Watch me do it</h2>' +
        '<div class="video-frame">' +
          '<iframe src="https://www.youtube-nocookie.com/embed/' + SF.esc(videoId) + '" ' +
            'title="' + SF.esc(experiment.title) + ' video" loading="lazy" allowfullscreen ' +
            'allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>' +
        '</div></div>'
    : '<div class="panel print-hide"><h2>Watch me do it</h2>' +
        '<div class="no-video"><p><strong>No video for this one yet.</strong></p>' +
        '<p>A new experiment goes up every week, so check back. The written steps below tell you everything you need.</p>' +
        '<p><a class="btn btn-small" href="videos.html">See the videos that are up</a></p></div></div>';

  mainEl.innerHTML =
    videoBlock +
    '<div class="panel panel-safety"><h2>Safety first</h2><ul class="ticklist">' + list(experiment.safety) +
      '<li>A grown-up should be with you for the whole thing. <a href="safety.html">Full safety rules</a></li></ul></div>' +
    '<div class="panel"><h2>What you need</h2><ul class="ticklist">' + list(experiment.materials) + '</ul></div>' +
    '<div class="panel"><h2>What to do</h2><ol class="steps">' + list(experiment.steps) + '</ol></div>' +
    '<div class="panel panel-science"><h2>Why does that happen?</h2><p>' + SF.esc(experiment.science) + '</p></div>' +
    '<div class="fact-card"><div class="fact-label">Take it further</div>' +
      '<p class="fact-text">' + SF.esc(experiment.fact) + '</p></div>';

  sideEl.innerHTML =
    '<div class="panel"><h2>At a glance</h2><ul class="meta-list">' +
      '<li><b>Topic</b><span>' + SF.topicIcon(experiment.topic) + " " + SF.esc(experiment.topic) + '</span></li>' +
      '<li><b>How tricky</b><span class="' + SF.difficultyClass(experiment.difficulty) + '">' + SF.esc(experiment.difficulty) + '</span></li>' +
      '<li><b>Ages</b><span>' + SF.esc(experiment.ages) + '</span></li>' +
      '<li><b>Time</b><span>' + SF.esc(experiment.time) + '</span></li>' +
      '<li><b>Mess</b><span>' + SF.esc(experiment.mess) + '</span></li>' +
      '<li><b>Video</b><span>' + (videoId ? "Yes" : "Not yet") + '</span></li>' +
    '</ul>' +
    '<p class="print-hide" style="margin:18px 0 0"><button class="btn btn-small" type="button" data-print>Print the steps</button></p></div>' +
    '<div class="panel print-hide"><h2>Try next</h2><div data-related></div></div>';

  var printBtn = sideEl.querySelector("[data-print]");
  if (printBtn) printBtn.addEventListener("click", function () { window.print(); });

  /* three more from the same topic, then anything else */
  var related = SF.experiments.filter(function (other) {
    return other.id !== experiment.id && other.topic === experiment.topic;
  });
  SF.experiments.forEach(function (other) {
    if (other.id !== experiment.id && related.indexOf(other) === -1) related.push(other);
  });
  var relatedBox = sideEl.querySelector("[data-related]");
  relatedBox.innerHTML = related.slice(0, 3).map(function (other) {
    return '<p style="margin:0 0 10px"><a href="experiment.html?id=' + encodeURIComponent(other.id) + '">' +
      SF.esc(other.title) + '</a><br><small style="color:#3b4170">' + SF.esc(other.blurb) + '</small></p>';
  }).join("");
};
