/* =========================================================
   The lock on the private pages (My Video Desk and Publish).
   Both pages use this, so there is only one sign-in to look
   after. Signing in once unlocks both until you close the
   browser or press Sign out.
   ========================================================= */

(function () {
  "use strict";

  var SFAuth = window.SFAuth = {};

  var DEFAULT_HASH = "9a121fc874029e54c9a5cdc28436af9787e1b2351bc8236a3f88b105b0c08f45";
  var SESSION_KEY = "sciencefact.signedin";
  var MAX_TRIES = 5;
  var LOCK_SECONDS = 30;

  SFAuth.usingDefaultPassword = function () {
    return window.STUDIO_PASSWORD_SHA256 === DEFAULT_HASH;
  };

  /* localStorage and sessionStorage both throw in some private
     browsing modes, so every use goes through here. */
  SFAuth.store = function (kind) {
    try {
      var box = kind === "session" ? window.sessionStorage : window.localStorage;
      box.setItem("__test__", "1");
      box.removeItem("__test__");
      return box;
    } catch (error) {
      return null;
    }
  };

  SFAuth.alertHTML = function (kind, message) {
    return '<div class="alert alert-' + kind + '">' + message + "</div>";
  };

  SFAuth.mount = function (options) {
    var lockedBox = document.querySelector("[data-locked]");
    var unlockedBox = document.querySelector("[data-unlocked]");
    if (!lockedBox || !unlockedBox) return;

    lockedBox.innerHTML =
      '<div class="lock-card">' +
        '<div class="lock-icon" aria-hidden="true">🔒</div>' +
        '<h2>Sign in</h2>' +
        '<p>This part of the site is just for you. Visitors never need it &mdash; everything else is free and open.</p>' +
        '<div data-login-alert></div>' +
        '<form class="form-grid" data-login-form>' +
          '<div class="field">' +
            '<label for="studio-password">Password</label>' +
            '<input type="password" id="studio-password" autocomplete="current-password" required>' +
          '</div>' +
          '<div><button class="btn" type="submit">Unlock</button></div>' +
        '</form>' +
        '<p class="hint">Forgotten it? See "Your password" in README.md in the website folder.</p>' +
      '</div>';

    var form = lockedBox.querySelector("[data-login-form]");
    var alertBox = lockedBox.querySelector("[data-login-alert]");
    var input = lockedBox.querySelector("#studio-password");

    var tries = 0;
    var lockedUntil = 0;
    var started = false;

    function show(signedIn) {
      lockedBox.hidden = signedIn;
      unlockedBox.hidden = !signedIn;
      if (signedIn && !started) {
        started = true;
        if (SFAuth.usingDefaultPassword()) {
          unlockedBox.insertAdjacentHTML("afterbegin", SFAuth.alertHTML("bad",
            "<strong>You are still using the password this site came with.</strong> " +
            "Anyone who has seen the instructions can get in here. Change it on the " +
            '<a href="studio.html#password">Publish a video</a> page.'));
        }
        if (typeof options.onUnlock === "function") options.onUnlock();
      }
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var now = Date.now();
      if (now < lockedUntil) {
        alertBox.innerHTML = SFAuth.alertHTML("bad",
          "Too many wrong tries. Wait " + Math.ceil((lockedUntil - now) / 1000) + " seconds and try again.");
        return;
      }

      var typed = input.value;
      if (!typed) return;

      if (window.sha256Hex(typed) === window.STUDIO_PASSWORD_SHA256) {
        var session = SFAuth.store("session");
        if (session) session.setItem(SESSION_KEY, "yes");
        input.value = "";
        alertBox.innerHTML = "";
        tries = 0;
        show(true);
        return;
      }

      tries++;
      input.value = "";
      if (tries >= MAX_TRIES) {
        lockedUntil = Date.now() + LOCK_SECONDS * 1000;
        tries = 0;
        alertBox.innerHTML = SFAuth.alertHTML("bad",
          "That is " + MAX_TRIES + " wrong tries. Locked for " + LOCK_SECONDS + " seconds.");
      } else {
        alertBox.innerHTML = SFAuth.alertHTML("bad",
          "That is not the password. " + (MAX_TRIES - tries) + " tries left before a short lock.");
      }
    });

    var signOutButtons = document.querySelectorAll("[data-signout]");
    for (var i = 0; i < signOutButtons.length; i++) {
      signOutButtons[i].addEventListener("click", function () {
        var session = SFAuth.store("session");
        if (session) session.removeItem(SESSION_KEY);
        window.location.reload();
      });
    }

    var existing = SFAuth.store("session");
    show(!!(existing && existing.getItem(SESSION_KEY) === "yes"));
  };
})();
