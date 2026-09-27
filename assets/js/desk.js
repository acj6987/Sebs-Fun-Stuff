/* =========================================================
   My Video Desk: plan the videos you are going to make, tick
   them off as you film and edit, then send a finished one to
   the publisher.

   Everything here is saved in this browser only. It is your
   own workspace - visitors never see any of it.
   ========================================================= */

window.pageInit = function () {
  "use strict";

  var SF = window.SF;
  var PLAN_KEY = "sciencefact.plans";
  var HANDOFF_KEY = "sciencefact.handoff";

  var STAGES = [
    { id: "idea",    label: "Idea",        colour: "tag" },
    { id: "filming", label: "Filming",     colour: "tag tag-medium" },
    { id: "editing", label: "Editing",     colour: "tag tag-medium" },
    { id: "ready",   label: "Ready to go", colour: "tag tag-easy" }
  ];

  var SHOTS = [
    "Say hello and show what we are making",
    "Show all the kit on the table",
    "Do the experiment, slowly enough to follow",
    "Show the exciting bit again, close up",
    "Explain why it happens",
    "Remind everyone about the safety bits",
    "Say goodbye and what is coming next week"
  ];

  window.SFAuth.mount({ onUnlock: startDesk });

  function startDesk() {
    var listBox = document.querySelector("[data-plan-list]");
    var countBox = document.querySelector("[data-plan-counts]");
    var form = document.querySelector("[data-plan-form]");
    var titleEl = document.getElementById("p-title");
    var experimentEl = document.getElementById("p-experiment");
    var dateEl = document.getElementById("p-date");
    var notesEl = document.getElementById("p-notes");
    var formAlert = document.querySelector("[data-plan-alert]");
    var suggestBox = document.querySelector("[data-suggestions]");
    var liveBox = document.querySelector("[data-live-videos]");

    SF.experiments.forEach(function (experiment) {
      var option = document.createElement("option");
      option.value = experiment.id;
      option.textContent = experiment.title;
      experimentEl.appendChild(option);
    });

    /* ---------- saving ---------- */

    function readPlans() {
      var box = window.SFAuth.store("local");
      if (!box) return [];
      try {
        var parsed = JSON.parse(box.getItem(PLAN_KEY) || "[]");
        return Object.prototype.toString.call(parsed) === "[object Array]" ? parsed : [];
      } catch (error) {
        return [];
      }
    }

    function writePlans(plans) {
      var box = window.SFAuth.store("local");
      if (!box) return false;
      try {
        box.setItem(PLAN_KEY, JSON.stringify(plans));
        return true;
      } catch (error) {
        return false;
      }
    }

    function updatePlan(key, change) {
      var plans = readPlans();
      for (var i = 0; i < plans.length; i++) {
        if (plans[i].key === key) {
          change(plans[i]);
          break;
        }
      }
      writePlans(plans);
      render();
    }

    /* ---------- adding ---------- */

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var title = titleEl.value.trim();
      if (!title) {
        formAlert.innerHTML = window.SFAuth.alertHTML("bad", "Give your video idea a name first.");
        return;
      }
      addPlan(title, experimentEl.value, dateEl.value, notesEl.value.trim());
      form.reset();
      formAlert.innerHTML = window.SFAuth.alertHTML("good", "Added to your desk.");
    });

    function addPlan(title, experimentId, date, notes) {
      var plans = readPlans();
      plans.unshift({
        key: "plan-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        title: title,
        experiment: experimentId || "",
        date: date || "",
        notes: notes || "",
        stage: "idea",
        shots: []
      });
      if (!writePlans(plans)) {
        formAlert.innerHTML = window.SFAuth.alertHTML("info",
          "This browser will not let the site save anything, so your plan will disappear when you leave the page.");
      }
      render();
    }

    /* ---------- drawing the desk ---------- */

    function stageInfo(id) {
      for (var i = 0; i < STAGES.length; i++) if (STAGES[i].id === id) return STAGES[i];
      return STAGES[0];
    }

    function planHTML(plan, index) {
      var stage = stageInfo(plan.stage);
      var experiment = SF.findExperiment(plan.experiment);
      var ticked = plan.shots || [];

      var shotList = SHOTS.map(function (shot, shotIndex) {
        var isOn = ticked.indexOf(shotIndex) !== -1;
        return '<label style="display:flex;gap:10px;align-items:flex-start;padding:5px 0;cursor:pointer">' +
          '<input type="checkbox" data-shot="' + index + ':' + shotIndex + '"' + (isOn ? " checked" : "") + '>' +
          '<span' + (isOn ? ' style="opacity:.55;text-decoration:line-through"' : '') + '>' + SF.esc(shot) + '</span>' +
        '</label>';
      }).join("");

      var moves = STAGES.map(function (option) {
        if (option.id === plan.stage) return "";
        return '<button class="btn btn-small" type="button" data-stage="' + index + ':' + option.id + '" ' +
          'style="background:#fff;box-shadow:inset 0 0 0 2px #e0e3f2;color:#101436">' + option.label + '</button>';
      }).join("");

      return '' +
        '<div class="panel" style="margin:0 0 18px">' +
          '<div style="display:flex;gap:12px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap">' +
            '<div>' +
              '<h3 style="margin-bottom:6px">' + SF.esc(plan.title) + '</h3>' +
              '<div class="tag-row">' +
                '<span class="' + stage.colour + '">' + SF.esc(stage.label) + '</span>' +
                (experiment ? '<span class="tag">' + SF.esc(experiment.title) + '</span>' : '') +
                (plan.date ? '<span class="tag">' + SF.esc(SF.prettyDate(plan.date)) + '</span>' : '') +
                '<span class="tag">' + ticked.length + ' of ' + SHOTS.length + ' filmed</span>' +
              '</div>' +
            '</div>' +
            '<button class="btn btn-small btn-pink" type="button" data-delete="' + index + '">Delete</button>' +
          '</div>' +

          (plan.notes ? '<p style="margin:16px 0 0">' + SF.esc(plan.notes) + '</p>' : '') +

          '<details style="margin-top:16px">' +
            '<summary style="cursor:pointer;font-weight:bold">What to film</summary>' +
            '<div style="margin-top:10px">' + shotList + '</div>' +
          '</details>' +

          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:18px;align-items:center">' +
            '<span class="hint" style="margin:0">Move to:</span>' + moves +
            '<button class="btn btn-small" type="button" data-publish="' + index + '">Put it on the site &rarr;</button>' +
          '</div>' +
        '</div>';
    }

    function render() {
      var plans = readPlans();

      /* the counters along the top */
      var tally = { idea: 0, filming: 0, editing: 0, ready: 0 };
      plans.forEach(function (plan) { tally[plan.stage] = (tally[plan.stage] || 0) + 1; });
      countBox.innerHTML =
        '<div class="hero-stats" style="border:0;margin:0;padding:0">' +
          '<div><b style="color:#7c5cff">' + plans.length + '</b><span style="color:#3b4170">On your desk</span></div>' +
          '<div><b style="color:#7c5cff">' + tally.ready + '</b><span style="color:#3b4170">Ready to go up</span></div>' +
          '<div><b style="color:#7c5cff">' + SF.videos.length + '</b><span style="color:#3b4170">Already on the site</span></div>' +
        '</div>';

      if (!plans.length) {
        listBox.innerHTML = '<div class="empty-state"><div class="big">💡</div>' +
          '<h3>Nothing planned yet</h3>' +
          '<p>Add your first video idea above, or pick one from the suggestions underneath.</p></div>';
      } else {
        listBox.innerHTML = plans.map(planHTML).join("");
      }

      wireUp(plans);
      renderSuggestions();
    }

    function wireUp(plans) {
      listBox.querySelectorAll("[data-delete]").forEach(function (button) {
        button.addEventListener("click", function () {
          var plan = plans[Number(button.getAttribute("data-delete"))];
          if (!plan) return;
          if (!window.confirm('Delete "' + plan.title + '" from your desk?')) return;
          writePlans(readPlans().filter(function (other) { return other.key !== plan.key; }));
          render();
        });
      });

      listBox.querySelectorAll("[data-stage]").forEach(function (button) {
        button.addEventListener("click", function () {
          var bits = button.getAttribute("data-stage").split(":");
          var plan = plans[Number(bits[0])];
          if (!plan) return;
          updatePlan(plan.key, function (target) { target.stage = bits[1]; });
        });
      });

      listBox.querySelectorAll("[data-shot]").forEach(function (box) {
        box.addEventListener("change", function () {
          var bits = box.getAttribute("data-shot").split(":");
          var plan = plans[Number(bits[0])];
          var shotIndex = Number(bits[1]);
          if (!plan) return;
          updatePlan(plan.key, function (target) {
            var shots = target.shots || [];
            var at = shots.indexOf(shotIndex);
            if (at === -1) shots.push(shotIndex); else shots.splice(at, 1);
            target.shots = shots;
          });
        });
      });

      listBox.querySelectorAll("[data-publish]").forEach(function (button) {
        button.addEventListener("click", function () {
          var plan = plans[Number(button.getAttribute("data-publish"))];
          if (!plan) return;
          var box = window.SFAuth.store("local");
          if (box) {
            try {
              box.setItem(HANDOFF_KEY, JSON.stringify({
                title: plan.title,
                experiment: plan.experiment,
                date: plan.date,
                description: plan.notes
              }));
            } catch (error) { /* publishing still works, just without the pre-filling */ }
          }
          window.location.href = "studio.html";
        });
      });
    }

    /* ---------- what to film next ---------- */

    var withoutVideo = SF.experiments.filter(function (experiment) {
      return SF.experimentVideoId(experiment) === "";
    });

    function renderSuggestions() {
      var planned = {};
      readPlans().forEach(function (plan) { planned[plan.experiment] = true; });

      var choices = withoutVideo.filter(function (experiment) { return !planned[experiment.id]; }).slice(0, 6);
      if (!choices.length) {
        suggestBox.innerHTML = '<p class="hint">Every experiment is either filmed or already planned. Nice work.</p>';
        return;
      }
      suggestBox.innerHTML = choices.map(function (experiment) {
        return '<div class="draft-item">' +
            '<div><div class="draft-title">' + SF.esc(experiment.title) + '</div>' +
            '<small>' + SF.esc(experiment.difficulty) + ' &middot; ' + SF.esc(experiment.time) + '</small></div>' +
            '<button class="btn btn-small" type="button" data-suggest="' + SF.esc(experiment.id) + '">Plan this one</button>' +
          '</div>';
      }).join("");

      suggestBox.querySelectorAll("[data-suggest]").forEach(function (button) {
        button.addEventListener("click", function () {
          var experiment = SF.findExperiment(button.getAttribute("data-suggest"));
          if (!experiment) return;
          addPlan(experiment.title, experiment.id, "", experiment.blurb);
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      });
    }

    /* ---------- what is already live ---------- */

    if (!SF.videos.length) {
      liveBox.innerHTML = '<p class="hint">Nothing published yet. Your first video will show up here once you have added it.</p>';
    } else {
      liveBox.innerHTML = SF.videos.map(function (video) {
        return '<div class="draft-item">' +
            '<div><div class="draft-title">' + SF.esc(video.title) + '</div>' +
            '<small>' + SF.esc(SF.prettyDate(video.date)) + '</small></div>' +
            '<a class="btn btn-small" href="videos.html">View</a>' +
          '</div>';
      }).join("");
    }

    render();
  }
};
