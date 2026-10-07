import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { ratingId, saveRating, useRatings, useUsers } from "../data";
import type { Coffee } from "../types";
import Stars from "./Stars";

export default function RatingEditor({ user, coffee }: { user: User; coffee: Coffee }) {
  const ratings = useRatings();
  const users = useUsers();
  const mine = ratings.find((r) => r.id === ratingId(user.uid, coffee.id));

  const [stars, setStars] = useState(0);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Load the saved rating once it arrives (or when switching coffee).
  useEffect(() => {
    setStars(mine?.rating ?? 0);
    setNotes(mine?.notes ?? "");
    setStatus("idle");
  }, [coffee.id, mine?.updatedAt?.seconds]);

  const dirty = stars !== (mine?.rating ?? 0) || notes !== (mine?.notes ?? "");

  async function save() {
    if (!stars) return;
    setStatus("saving");
    try {
      await saveRating(user.uid, coffee.id, stars, notes.trim());
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  const others = ratings.filter((r) => r.coffeeId === coffee.id && r.uid !== user.uid);
  const nameOf = (uid: string) =>
    users.find((u) => u.id === uid)?.displayName.split(" ")[0] ?? "Someone";

  return (
    <div className="rating-editor">
      <label className="label">Your rating</label>
      <Stars value={stars} onChange={setStars} size="lg" />
      <label className="label" htmlFor={`notes-${coffee.id}`}>
        Notes
      </label>
      <textarea
        id={`notes-${coffee.id}`}
        rows={3}
        placeholder="Tasting notes, grind size, how you brewed it…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="row">
        <button className="btn primary" disabled={!stars || !dirty || status === "saving"} onClick={save}>
          {mine ? "Update rating" : "Save rating"}
        </button>
        {status === "saved" && !dirty && <span className="muted">Saved ✓</span>}
        {status === "error" && <span className="error">Couldn't save — try again.</span>}
        {!stars && <span className="muted">Pick some stars first</span>}
      </div>

      {others.length > 0 && (
        <div className="others">
          {others.map((r) => (
            <div key={r.id} className="other">
              <strong>{nameOf(r.uid)}</strong> <Stars value={r.rating} />
              {r.notes && <p>{r.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
