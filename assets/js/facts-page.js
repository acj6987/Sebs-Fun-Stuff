/* Fact Vault page */
window.pageInit = function () {
  "use strict";
  var SF = window.SF;

  var listEl = document.querySelector("[data-fact-list]");
  var countEl = document.querySelector("[data-fact-count]");
  var filterEl = document.getElementById("fact-topic-filter");
  var searchEl = document.getElementById("fact-search");
  var clearBtn = document.querySelector("[data-fact-clear]");

  /* topics, most facts first so the big ones are easy to find */
  var counts = {};
  SF.facts.forEach(function (fact) { counts[fact.topic] = (counts[fact.topic] || 0) + 1; });
  Object.keys(counts).sort(function (a, b) {
    return counts[b] - counts[a] || a.localeCompare(b);
  }).forEach(function (topic) {
    var option = document.createElement("option");
    option.value = topic;
    option.textContent = topic + " (" + counts[topic] + ")";
    filterEl.appendChild(option);
  });

  function render() {
    var chosen = filterEl.value;
    var query = searchEl.value.trim().toLowerCase();

    var list = SF.facts.filter(function (fact) {
      if (chosen && fact.topic !== chosen) return false;
      if (query && (fact.text + " " + fact.topic).toLowerCase().indexOf(query) === -1) return false;
      return true;
    });

    if (!list.length) {
      countEl.textContent = "";
      listEl.innerHTML = '<div class="empty-state"><div class="big">🔍</div>' +
        '<h3>No facts match that</h3><p>Try a shorter word, or clear the filters.</p></div>';
      return;
    }

    countEl.textContent = list.length === SF.facts.length
      ? "All " + list.length + " facts"
      : "Showing " + list.length + " of " + SF.facts.length + " facts";

    listEl.innerHTML = list.map(function (fact) {
      return '<div class="panel" style="margin:0">' +
        '<span class="tag">' + SF.esc(fact.topic) + '</span>' +
        '<p style="margin:12px 0 0">' + SF.esc(fact.text) + '</p></div>';
    }).join("");
  }

  filterEl.addEventListener("change", render);
  searchEl.addEventListener("input", render);
  clearBtn.addEventListener("click", function () {
    filterEl.value = "";
    searchEl.value = "";
    render();
  });

  render();
};
