# ☕ Coffee Chooser

A tiny web app for two people to rate the coffee in the machine.

- **Sign in with Google** (Firebase Auth), restricted to an allowlist of emails.
- **In the machine**: shows the coffee that's in the machine right now. Rate it with 1–5 stars and add notes. Add a new coffee or switch back to one you've had before.
- **Leaderboard**: each person drags their rated coffees into their own ranking from favorite to least favorite. You can also view your partner's leaderboard (read-only).
- **All coffees**: every coffee you've had, with the average rating. Rate older coffees here, or put one back in the machine.

Built with React, Vite and TypeScript on Firebase (Auth, Firestore and Hosting, all on the free Spark plan).

## One-time setup

1. **Create a Firebase project** at <https://console.firebase.google.com>.
2. **Enable Google sign-in**: Build → Authentication → Get started → Sign-in method → Google → Enable.
3. **Create Firestore**: Build → Firestore Database → Create database (production mode, any region).
4. **Register a web app**: Project settings → General → Your apps → `</>`. Copy the config values.
5. **Configure locally**:
   ```bash
   cp .env.example .env.local   # paste the config values, plus your two emails in VITE_ALLOWED_EMAILS
   ```
6. **Set who's allowed**: edit `firestore.rules` and replace `you@gmail.com` / `wife@gmail.com` with your real Google accounts. This is the actual security boundary; `VITE_ALLOWED_EMAILS` only hides the UI from others.

## Run locally

```bash
npm install
npm run dev
```

`localhost` is an authorized sign-in domain by default.

## Deploy

```bash
npm install -g firebase-tools
firebase login
firebase use --add            # pick your project
npm run build
firebase deploy               # deploys hosting + firestore.rules
```

The app will be live at `https://<project-id>.web.app`. If you host it on another domain, add that domain under Authentication → Settings → Authorized domains.

## Data model (Firestore)

| Collection        | Doc id              | Contents                                   |
| ----------------- | ------------------- | ------------------------------------------ |
| `coffees`         | auto                | `name, roaster, origin, roast, addedBy`    |
| `machine/current` | `current`           | `coffeeId, setBy, setAt`                   |
| `ratings`         | `${uid}_${coffeeId}` | `uid, coffeeId, rating (1–5), notes`      |
| `rankings`        | `uid`               | `order: coffeeId[]` (your stack ranking)   |
| `users`           | `uid`               | `displayName, photoURL`                    |

When you rate a new coffee, it gets placed on your leaderboard next to coffees with the same star count. Move it with drag-and-drop or the ▲▼ buttons, which also work on phones.
