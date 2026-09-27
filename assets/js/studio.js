/* =========================================================
   Putting a video on the site: builds the block of code that
   goes into data/videos.js.
   ========================================================= */

window.pageInit = function () {
  "use strict";

  var SF = window.SF;
  var DRAFT_KEY = "sciencefact.drafts";
  var HANDOFF_KEY = "sciencefact.handoff";

  window.SFAuth.mount({ onUnlock: startStudio });

  function startStudio() {
    var unlockedBox = document.querySelector("[data-unlocked]");
    var form = document.querySelector("[data-video-form]");
    var titleEl = document.getElementById("v-title");
    var linkEl = document.getElementById("v-link");
    var dateEl = document.getElementById("v-date");
    var experimentEl = document.getElementById("v-experiment");
    var descriptionEl = document.getElementById("v-description");
    var formAlert = document.querySelector("[data-form-alert]");
    var outputBox = document.querySelector("[data-output]");
    var codeEl = document.querySelector("[data-code]");
    var previewOut = document.querySelector("[data-preview-out]");

    SF.experiments.forEach(function (experiment) {
      var option = document.createElement("option");
      option.value = experiment.id;
      option.textContent = experiment.title;
      experimentEl.appendChild(option);
    });

    var today = new Date();
    dateEl.value = today.getFullYear() + "-" +
      ("0" + (today.getMonth() + 1)).slice(-2) + "-" +
      ("0" + today.getDate()).slice(-2);

    /* Did you send a video over from the desk? Then fill it in. */
    var box = window.SFAuth.store("local");
    if (box) {
      var waiting = null;
      try {
        waiting = JSON.parse(box.getItem(HANDOFF_KEY) || "null");
      } catch (error) {
        waiting = null;
      }
      if (waiting && waiting.title) {
        titleEl.value = waiting.title;
        if (waiting.experiment) experimentEl.value = waiting.experiment;
        if (waiting.date) dateEl.value = waiting.date;
        if (waiting.description) descriptionEl.value = waiting.description;
        formAlert.innerHTML = window.SFAuth.alertHTML("good",
          "Brought over from your desk. Just paste the YouTube link in and you are done.");
        linkEl.focus();
        try { box.removeItem(HANDOFF_KEY); } catch (error) { /* nothing to do */ }
      }
    }

    var lastBuilt = null;

    /* Text going into a .js file must not be able to close the string
       it sits in, so quotes and backslashes are escaped. */
    function forJsString(value) {
      return String(value == null ? "" : value)
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\r?\n/g, " ")
        .replace(/<\/?script/gi, "<\\/script");
    }

    function nextVideoId() {
      var used = {};
      SF.videos.forEach(function (video) { used[video.id] = true; });
      var week = 1;
      while (used["week-" + ("0" + week).slice(-2)]) week++;
      return "week-" + ("0" + week).slice(-2);
    }

    function buildCode(video) {
      return "    {\n" +
        '      id: "' + forJsString(video.id) + '",\n' +
        '      title: "' + forJsString(video.title) + '",\n' +
        '      date: "' + forJsString(video.date) + '",\n' +
        '      youtubeId: "' + forJsString(video.youtubeId) + '",\n' +
        '      experiment: "' + forJsString(video.experiment) + '",\n' +
        '      description: "' + forJsString(video.description) + '"\n' +
        "    },";
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      formAlert.innerHTML = "";

      var title = titleEl.value.trim();
      var youtubeId = SF.cleanYouTubeId(linkEl.value);
      var date = dateEl.value;

      if (!title) {
        formAlert.innerHTML = window.SFAuth.alertHTML("bad", "Give the video a title first.");
        return;
      }
      if (!youtubeId) {
        formAlert.innerHTML = window.SFAuth.alertHTML("bad",
          "That does not look like a YouTube link. Copy the whole thing from the address bar, " +
          "for example <code>https://www.youtube.com/watch?v=dQw4w9WgXcQ</code>.");
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        formAlert.innerHTML = window.SFAuth.alertHTML("bad", "Pick a date for the video.");
        return;
      }

      lastBuilt = {
        id: nextVideoId(),
        title: title,
        date: date,
        youtubeId: youtubeId,
        experiment: experimentEl.value,
        description: descriptionEl.value.trim()
      };

      codeEl.textContent = buildCode(lastBuilt);
      outputBox.hidden = false;
      previewOut.innerHTML = "";
      saveDraft(lastBuilt);
      formAlert.innerHTML = window.SFAuth.alertHTML("good", "Done. The code is below, and a draft is saved on this computer.");
      outputBox.scrollIntoView({ block: "start" });
    });

    document.querySelector("[data-reset]").addEventListener("click", function () {
      form.reset();
      outputBox.hidden = true;
      formAlert.innerHTML = "";
      previewOut.innerHTML = "";
    });

    document.querySelector("[data-copy]").addEventListener("click", function (event) {
      var button = event.currentTarget;
      var done = function () {
        button.textContent = "Copied";
        window.setTimeout(function () { button.textContent = "Copy the code"; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(codeEl.textContent).then(done, selectCode);
      } else {
        selectCode();
      }
    });

    function selectCode() {
      var range = document.createRange();
      range.selectNodeContents(codeEl);
      var selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      formAlert.innerHTML = window.SFAuth.alertHTML("info",
        "Copying is blocked in this browser. The code is selected &mdash; press Ctrl+C (or Cmd+C).");
    }

    document.querySelector("[data-preview]").addEventListener("click", function () {
      if (!lastBuilt) return;
      previewOut.innerHTML =
        '<p class="hint">This is how it will look on the Videos page:</p>' +
        '<div class="video-item">' +
          '<div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/' +
            SF.esc(lastBuilt.youtubeId) + '" title="' + SF.esc(lastBuilt.title) +
            '" allowfullscreen loading="lazy"></iframe></div>' +
          '<div><p class="video-date">' + SF.esc(SF.prettyDate(lastBuilt.date)) + '</p>' +
          '<h3>' + SF.esc(lastBuilt.title) + '</h3>' +
          '<p>' + SF.esc(lastBuilt.description) + '</p></div>' +
        '</div>';
    });

    /* ---------------- drafts ---------------- */

    var draftsBox = document.querySelector("[data-drafts]");

    function readDrafts() {
      var store = window.SFAuth.store("local");
      if (!store) return [];
      try {
        var parsed = JSON.parse(store.getItem(DRAFT_KEY) || "[]");
        return Object.prototype.toString.call(parsed) === "[object Array]" ? parsed : [];
      } catch (error) {
        return [];
      }
    }

    function writeDrafts(drafts) {
      var store = window.SFAuth.store("local");
      if (!store) return;
      try {
        store.setItem(DRAFT_KEY, JSON.stringify(drafts));
      } catch (error) {
        formAlert.innerHTML = window.SFAuth.alertHTML("info",
          "The draft could not be saved on this computer, but the code below is still fine to use.");
      }
    }

    function saveDraft(video) {
      var drafts = readDrafts().filter(function (draft) { return draft.youtubeId !== video.youtubeId; });
      drafts.unshift(video);
      writeDrafts(drafts.slice(0, 20));
      renderDrafts();
    }

    function renderDrafts() {
      var drafts = readDrafts();
      if (!window.SFAuth.store("local")) {
        draftsBox.innerHTML = '<p class="hint">This browser will not let the site save drafts, so copy the code as soon as you make it.</p>';
        return;
      }
      if (!drafts.length) {
        draftsBox.innerHTML = '<p class="hint">No drafts yet.</p>';
        return;
      }
      draftsBox.innerHTML = drafts.map(function (draft, index) {
        return '<div class="draft-item">' +
            '<div><div class="draft-title">' + SF.esc(draft.title) + '</div>' +
            '<small>' + SF.esc(SF.prettyDate(draft.date)) + ' &middot; ' + SF.esc(draft.youtubeId) + '</small></div>' +
            '<div style="display:flex;gap:8px">' +
              '<button class="btn btn-small" type="button" data-draft-load="' + index + '">Code</button>' +
              '<button class="btn btn-small btn-pink" type="button" data-draft-delete="' + index + '">Delete</button>' +
            '</div>' +
          '</div>';
      }).join("");

      draftsBox.querySelectorAll("[data-draft-load]").forEach(function (button) {
        button.addEventListener("click", function () {
          var draft = readDrafts()[Number(button.getAttribute("data-draft-load"))];
          if (!draft) return;
          lastBuilt = draft;
          codeEl.textContent = buildCode(draft);
          outputBox.hidden = false;
          previewOut.innerHTML = "";
          outputBox.scrollIntoView({ block: "start" });
        });
      });

      draftsBox.querySelectorAll("[data-draft-delete]").forEach(function (button) {
        button.addEventListener("click", function () {
          var drafts = readDrafts();
          drafts.splice(Number(button.getAttribute("data-draft-delete")), 1);
          writeDrafts(drafts);
          renderDrafts();
        });
      });
    }

    renderDrafts();

    /* ---------------- change the password ---------------- */

    unlockedBox.insertAdjacentHTML("beforeend",
      '<div class="panel" id="password">' +
        '<h2>Change your password</h2>' +
        '<p>Type a new password and this gives you one line to paste over the last line of ' +
          '<code>assets/js/studio-config.js</code>. The password itself is never saved anywhere.</p>' +
        '<div class="form-grid">' +
          '<div class="field">' +
            '<label for="new-password">New password</label>' +
            '<input type="text" id="new-password" autocomplete="off" placeholder="at least 10 characters">' +
            '<p class="hint">Shown as you type so you can check it. Write it down somewhere safe &mdash; it cannot be recovered from the website.</p>' +
          '</div>' +
          '<div><button class="btn" type="button" data-make-hash>Make the new line</button></div>' +
        '</div>' +
        '<div data-hash-alert></div>' +
        '<div class="codeblock" data-hash-out hidden></div>' +
      '</div>' +
      '<div class="panel" id="members-password">' +
        '<h2>Change the members\u2019 password</h2>' +
        '<p>This is the one people type to get into the website at all. ' +
          'Changing it gives you a line to paste over the last line of ' +
          '<code>assets/js/site-config.js</code>, and everybody has to type the new one next time. ' +
          'Capital letters do not matter on this one.</p>' +
        '<div class="form-grid">' +
          '<div class="field">' +
            '<label for="new-member-password">New members\u2019 password</label>' +
            '<input type="text" id="new-member-password" autocomplete="off" placeholder="at least 6 characters">' +
          '</div>' +
          '<div><button class="btn" type="button" data-make-member-hash>Make the new line</button></div>' +
        '</div>' +
        '<div data-member-alert></div>' +
        '<div class="codeblock" data-member-out hidden></div>' +
      '</div>');

    var newPasswordEl = document.getElementById("new-password");
    var hashOut = document.querySelector("[data-hash-out]");
    var hashAlert = document.querySelector("[data-hash-alert]");

    document.querySelector("[data-make-hash]").addEventListener("click", function () {
      var typed = newPasswordEl.value;
      hashAlert.innerHTML = "";
      if (typed.length < 10) {
        hashOut.hidden = true;
        hashAlert.innerHTML = window.SFAuth.alertHTML("bad", "Make it at least 10 characters long.");
        return;
      }
      hashOut.textContent = 'window.STUDIO_PASSWORD_SHA256 = "' + window.sha256Hex(typed) + '";';
      hashOut.hidden = false;
      hashAlert.innerHTML = window.SFAuth.alertHTML("good",
        "Paste that over the last line of <code>assets/js/studio-config.js</code>, save it, " +
        "and upload the file. Your new password works from then on.");
    });

    var memberOut = document.querySelector("[data-member-out]");
    var memberAlert = document.querySelector("[data-member-alert]");

    document.querySelector("[data-make-member-hash]").addEventListener("click", function () {
      /* stored in small letters, because the door ignores capitals */
      var typed = document.getElementById("new-member-password").value.replace(/^\s+|\s+$/g, "").toLowerCase();
      memberAlert.innerHTML = "";
      if (typed.length < 6) {
        memberOut.hidden = true;
        memberAlert.innerHTML = window.SFAuth.alertHTML("bad", "Make it at least 6 characters long.");
        return;
      }
      memberOut.textContent = 'window.SITE_PASSWORD_SHA256 = "' + window.sha256Hex(typed) + '";';
      memberOut.hidden = false;
      memberAlert.innerHTML = window.SFAuth.alertHTML("good",
        "Paste that over the last line of <code>assets/js/site-config.js</code>. " +
        "Remember to tell your members the new password, including anyone already signed in.");
    });

    if (window.location.hash === "#password") {
      document.getElementById("password").scrollIntoView({ block: "start" });
    }
  }
};
