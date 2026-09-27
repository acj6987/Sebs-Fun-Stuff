/* =============================================================
   MEMBERS' DOOR
   -------------------------------------------------------------
   With this switched on, nobody can see the website at all until
   they type the members' password.

   The password is:

       Seb1234

   Capital letters do not matter here, so seb1234 and SEB1234 get
   people in too. That is on purpose: phone keyboards change
   capitals by themselves, and this door is only meant to keep
   ordinary visitors out.

   Give the password to the people you want to let in.

   To let everybody in without a password (so that anyone finding
   you on Google can look round), change true to false below:

       window.SITE_LOCKED = false;

   To change the password: sign in, go to "Put a video on the
   site", and use the "Change the members' password" box at the
   bottom. It gives you a new line to paste over the last line
   of this file.
   =============================================================*/

window.SITE_LOCKED = true;

/* the fingerprint of the password in small letters */
window.SITE_PASSWORD_SHA256 = "bb3a052bf85b9bde35321761a5180129b3a02e33d2f1def324dba6ad9754c588";
