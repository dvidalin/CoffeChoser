import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { auth, googleProvider, isEmailAllowed } from "./firebase";
import { saveProfile } from "./data";
import NowBrewing from "./components/NowBrewing";
import Leaderboard from "./components/Leaderboard";
import AllCoffees from "./components/AllCoffees";

type Tab = "now" | "leaderboard" | "coffees";

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("now");
  const [error, setError] = useState<string>();

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        if (u && isEmailAllowed(u.email)) {
          saveProfile({
            uid: u.uid,
            displayName: u.displayName ?? u.email ?? "Someone",
            photoURL: u.photoURL ?? undefined,
          }).catch((e) => setError(String(e.message ?? e)));
        }
      }),
    [],
  );

  if (user === undefined) return <div className="center muted">Brewing…</div>;

  if (!user) {
    return (
      <div className="center signin">
        <div className="logo">☕</div>
        <h1>Coffee Chooser</h1>
        <p className="muted">Rate what's in the machine. Rank what you love.</p>
        <button
          className="btn primary"
          onClick={() =>
            signInWithPopup(auth, googleProvider).catch((e) => setError(e.message))
          }
        >
          Sign in with Google
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  if (!isEmailAllowed(user.email)) {
    return (
      <div className="center signin">
        <div className="logo">🚫</div>
        <p>{user.email} isn't on the guest list.</p>
        <button className="btn" onClick={() => signOut(auth)}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <span className="brand">☕ Coffee Chooser</span>
        <div className="me">
          {user.photoURL && <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />}
          <button className="link" onClick={() => signOut(auth)}>
            Sign out
          </button>
        </div>
      </header>

      <nav className="tabs">
        <button className={tab === "now" ? "active" : ""} onClick={() => setTab("now")}>
          In the machine
        </button>
        <button
          className={tab === "leaderboard" ? "active" : ""}
          onClick={() => setTab("leaderboard")}
        >
          Leaderboard
        </button>
        <button className={tab === "coffees" ? "active" : ""} onClick={() => setTab("coffees")}>
          All coffees
        </button>
      </nav>

      {error && <p className="error">{error}</p>}

      <main>
        {tab === "now" && <NowBrewing user={user} />}
        {tab === "leaderboard" && <Leaderboard user={user} />}
        {tab === "coffees" && <AllCoffees user={user} />}
      </main>
    </div>
  );
}
