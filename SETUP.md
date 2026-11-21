# Code Code – setup (for a grown-up)

The website with real logins is in `docs/index.html`. It uses the Firebase project **sebs-chat**.
Two one-time steps are needed.

## 1. Paste the security rules into Firebase (important)

These rules make sure only people Seb or Freddie made a login for can see anything.

1. Open https://console.firebase.google.com and choose **sebs-chat**.
2. Go to **Firestore Database** > **Rules**.
3. Delete what is there, paste in the whole of the `firestore.rules` file from this repository, and press **Publish**.

## 2. Put the website online with GitHub Pages

1. On GitHub, open the **Sebs-Fun-Stuff** repository > **Settings** > **Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Pick the branch `claude/practical-brahmagupta-dnervm` (or `main` once this is merged) and the folder **/docs**, then **Save**.
4. After a minute or two the address appears at the top of that page, e.g. `https://acj6987.github.io/Sebs-Fun-Stuff/`.

GitHub Pages on the free plan needs the repository to be **public**. The code holds no passwords:
logins and messages live in Firebase and are protected by the rules above. The Firebase `apiKey`
in the page is meant to be public.

## 3. First logins

1. Open the website and press **"Seb or Freddie, first time here?"**.
2. Seb picks **Seb** and chooses a password. Freddie does the same on his device. Do this straight away.
3. Logged in as Seb or Freddie, scroll to **Logins** to make a username and password for each friend.
   Friends don't need an email address or any account of their own.

## Notes

- Seb and Freddie are the bosses (see `ADMINS` in `docs/index.html` and the emails in `firestore.rules`).
- To stop a friend logging in, press **Turn off** next to their login.
- 6 wrong passwords for a username sets off the alarm and blocks that username until a boss presses **Let back in**.
- Calls use https://meet.ffmuc.net (free, no account).
