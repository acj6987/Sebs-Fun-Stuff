/* Fact Vault page */
window.pageInit = function () {
  "use strict";
  var SF = window.SF;

  var listEl = document.querySelector("[data-fact-list]");
  var filterEl = document.getElementById("fact-topic-filter");

  var topics = [];
  SF.facts.forEach(function (fact) {
    if (topics.indexOf(fact.topic) === -1) topics.push(fact.topic);
  });
  topics.sort().forEach(function (topic) {
    var option = document.createElement("option");
    option.value = topic;
    option.textContent = topic;
    filterEl.appendChild(option);
  });

  function render() {
    var chosen = filterEl.value;
    var list = SF.facts.filter(function (fact) { return !chosen || fact.topic === chosen; });
    listEl.innerHTML = list.map(function (fact) {
      return '<div class="panel" style="margin:0">' +
        '<span class="tag">' + SF.esc(fact.topic) + '</span>' +
        '<p style="margin:12px 0 0">' + SF.esc(fact.text) + '</p></div>';
    }).join("");
  }

  filterEl.addEventListener("change", render);
  render();
};
