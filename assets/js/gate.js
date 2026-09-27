/* =========================================================
   The members' door.

   Runs before anything else on every page. If the site is
   locked and this browser has not been let in, the page is
   hidden and a sign-in card is shown instead.
   ========================================================= */

(function () {
  "use strict";

  var MEMBER_KEY = "sciencefact.member";
  var MAX_TRIES = 8;
  var LOCK_SECONDS = 30;

  function store() {
    try {
      window.localStorage.setItem("__test__", "1");
      window.localStorage.removeItem("__test__");
      return window.localStorage;
    } catch (error) {
      try {
        window.sessionStorage.setItem("__test__", "1");
        window.sessionStorage.removeItem("__test__");
        return window.sessionStorage;
      } catch (alsoError) {
        return null;
      }
    }
  }

  function letIn() {
    var box = store();
    if (box) {
      try { box.setItem(MEMBER_KEY, window.SITE_PASSWORD_SHA256); } catch (error) { /* just this visit then */ }
    }
  }

  function alreadyIn() {
    var box = store();
    if (!box) return false;
    try {
      /* Tied to the current password, so changing it shuts the door
         on everyone again. */
      return box.getItem(MEMBER_KEY) === window.SITE_PASSWORD_SHA256;
    } catch (error) {
      return false;
    }
  }

  window.SFGate = {
    signOut: function () {
      var box = store();
      if (box) {
        try { box.removeItem(MEMBER_KEY); } catch (error) { /* nothing to do */ }
      }
      window.location.reload();
    },
    isLocked: function () {
      return window.SITE_LOCKED === true && !alreadyIn();
    }
  };

  if (!window.SFGate.isLocked()) return;

  /* Hide the page immediately, before it has a chance to be drawn. */
  document.documentElement.className += " sf-gate-locked";

  document.addEventListener("DOMContentLoaded", function () {
    var gate = document.createElement("div");
    gate.className = "sf-gate";
    gate.innerHTML =
      '<div class="sf-gate-card">' +
        '<svg viewBox="0 0 48 48" aria-hidden="true" class="sf-gate-logo">' +
          '<ellipse cx="24" cy="24" rx="21" ry="9" fill="none" stroke="#2ad4e0" stroke-width="3"/>' +
          '<ellipse cx="24" cy="24" rx="21" ry="9" fill="none" stroke="#b8f13a" stroke-width="3" transform="rotate(60 24 24)"/>' +
          '<ellipse cx="24" cy="24" rx="21" ry="9" fill="none" stroke="#ff5ea8" stroke-width="3" transform="rotate(120 24 24)"/>' +
          '<circle cx="24" cy="24" r="5" fill="#ffffff"/>' +
        '</svg>' +
        '<h1>Science <em>Fact</em></h1>' +
        '<p>This site is for members. Type the password to come in.</p>' +
        '<div data-gate-alert></div>' +
        '<form data-gate-form>' +
          '<label class="sf-gate-label" for="member-password">Members’ password</label>' +
          '<input type="password" id="member-password" autocomplete="current-password" ' +
            'autocapitalize="off" autocorrect="off" spellcheck="false" required>' +
          '<label class="sf-gate-show">' +
            '<input type="checkbox" data-gate-show><span>Show me what I am typing</span>' +
          '</label>' +
          '<p class="sf-gate-caps" data-gate-caps hidden><strong>Caps Lock looks like it is on.</strong></p>' +
          '<button class="btn" type="submit">Come in</button>' +
        '</form>' +
        '<p class="sf-gate-foot">Not got the password? Ask whoever sent you here.</p>' +
      '</div>';
    document.body.appendChild(gate);

    var form = gate.querySelector("[data-gate-form]");
    var input = gate.querySelector("#member-password");
    var alertBox = gate.querySelector("[data-gate-alert]");
    var showBox = gate.querySelector("[data-gate-show]");
    var capsNote = gate.querySelector("[data-gate-caps]");
    var tries = 0;
    var lockedUntil = 0;

    input.focus();

    showBox.addEventListener("change", function () {
      input.type = showBox.checked ? "text" : "password";
      input.focus();
    });

    input.addEventListener("keyup", function (event) {
      if (!event.getModifierState) return;
      capsNote.hidden = !event.getModifierState("CapsLock");
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var now = Date.now();
      if (now < lockedUntil) {
        alertBox.innerHTML = '<div class="alert alert-bad">Too many tries. Wait ' +
          Math.ceil((lockedUntil - now) / 1000) + " seconds.</div>";
        return;
      }

      var typed = input.value.replace(/^\s+|\s+$/g, "");
      if (!typed) return;

      if (window.sha256Hex(typed) === window.SITE_PASSWORD_SHA256) {
        letIn();
        document.documentElement.className =
          document.documentElement.className.replace(/\s*sf-gate-locked/g, "");
        gate.parentNode.removeChild(gate);
        return;
      }

      tries++;
      input.value = "";
      if (tries >= MAX_TRIES) {
        lockedUntil = Date.now() + LOCK_SECONDS * 1000;
        tries = 0;
        alertBox.innerHTML = '<div class="alert alert-bad">Too many tries. Wait ' + LOCK_SECONDS + " seconds.</div>";
      } else {
        alertBox.innerHTML = '<div class="alert alert-bad"><strong>That is not the password.</strong> ' +
          'Tick "Show me what I am typing" and check the capital letters.</div>';
      }
    });
  });
})();
