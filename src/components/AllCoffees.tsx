import { useState } from "react";
import type { User } from "firebase/auth";
import { ratingId, setMachineCoffee, useCoffees, useMachine, useRatings } from "../data";
import CoffeeMeta from "./CoffeeMeta";
import RatingEditor from "./RatingEditor";
import Stars from "./Stars";

export default function AllCoffees({ user }: { user: User }) {
  const coffees = useCoffees();
  const ratings = useRatings();
  const machine = useMachine();
  const [open, setOpen] = useState<string | null>(null);

  if (!coffees.length) return <div className="card empty">No coffees yet — add one from “In the machine”.</div>;

  return (
    <ul className="coffee-list">
      {coffees.map((c) => {
        const all = ratings.filter((r) => r.coffeeId === c.id);
        const mine = all.find((r) => r.id === ratingId(user.uid, c.id));
        const avg = all.length ? all.reduce((s, r) => s + r.rating, 0) / all.length : 0;
        const inMachine = machine?.coffeeId === c.id;
        return (
          <li key={c.id} className="card">
            <div className="now-header">
              <div>
                <h3>
                  {c.name} {inMachine && <span className="badge">in machine</span>}
                </h3>
                <CoffeeMeta coffee={c} />
                <div className="muted small">
                  {all.length ? (
                    <>
                      Avg <Stars value={Math.round(avg)} /> {avg.toFixed(1)} · you:{" "}
                      {mine ? <Stars value={mine.rating} /> : "not rated"}
                    </>
                  ) : (
                    "No ratings yet"
                  )}
                </div>
              </div>
              <div className="stack">
                <button className="btn" onClick={() => setOpen(open === c.id ? null : c.id)}>
                  {open === c.id ? "Close" : mine ? "Edit rating" : "Rate"}
                </button>
                {!inMachine && (
                  <button className="btn" onClick={() => setMachineCoffee(c.id, user.uid)}>
                    Brew this
                  </button>
                )}
              </div>
            </div>
            {open === c.id && <RatingEditor user={user} coffee={c} />}
          </li>
        );
      })}
    </ul>
  );
}
