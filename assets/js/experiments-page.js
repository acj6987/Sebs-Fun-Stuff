/* Experiments list page: search and filters */
window.pageInit = function () {
  "use strict";
  var SF = window.SF;

  var grid = document.querySelector("[data-grid]");
  var countEl = document.querySelector("[data-count]");
  var searchEl = document.getElementById("f-search");
  var topicEl = document.getElementById("f-topic");
  var difficultyEl = document.getElementById("f-difficulty");
  var videoEl = document.getElementById("f-video");
  var clearBtn = document.querySelector("[data-clear]");

  function fillOptions(select, values) {
    values.forEach(function (value) {
      var option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  }

  function unique(key) {
    var seen = [];
    SF.experiments.forEach(function (experiment) {
      if (seen.indexOf(experiment[key]) === -1) seen.push(experiment[key]);
    });
    return seen;
  }

  fillOptions(topicEl, unique("topic").sort());
  fillOptions(difficultyEl, ["Easy", "Medium", "Tricky"].filter(function (level) {
    return unique("difficulty").indexOf(level) !== -1;
  }));

  /* let the home page link straight to a topic */
  var fromUrl = new URLSearchParams(location.search).get("topic");
  if (fromUrl && unique("topic").indexOf(fromUrl) !== -1) topicEl.value = fromUrl;

  function matches(experiment) {
    if (topicEl.value && experiment.topic !== topicEl.value) return false;
    if (difficultyEl.value && experiment.difficulty !== difficultyEl.value) return false;

    var hasVideo = SF.experimentVideoId(experiment) !== "";
    if (videoEl.value === "yes" && !hasVideo) return false;
    if (videoEl.value === "no" && hasVideo) return false;

    var query = searchEl.value.trim().toLowerCase();
    if (query) {
      var haystack = [
        experiment.title, experiment.blurb, experiment.topic, experiment.science, experiment.fact,
        (experiment.materials || []).join(" ")
      ].join(" ").toLowerCase();
      if (haystack.indexOf(query) === -1) return false;
    }
    return true;
  }

  function render() {
    var list = SF.experiments.filter(matches);
    SF.renderCards(grid, list);
    countEl.textContent = list.length === SF.experiments.length
      ? "Showing all " + list.length + " experiments"
      : "Showing " + list.length + " of " + SF.experiments.length + " experiments";
  }

  [searchEl, topicEl, difficultyEl, videoEl].forEach(function (input) {
    input.addEventListener("input", render);
    input.addEventListener("change", render);
  });

  clearBtn.addEventListener("click", function () {
    searchEl.value = "";
    topicEl.value = "";
    difficultyEl.value = "";
    videoEl.value = "";
    render();
  });

  render();
};
