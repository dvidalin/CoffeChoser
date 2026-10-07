import { useState } from "react";
import type { User } from "firebase/auth";
import {
  brewPeriods,
  deleteCoffee,
  formatPeriod,
  ratingId,
  setMachineCoffee,
  updateCoffee,
  useBrews,
  useCoffees,
  useMachine,
  useRatings,
} from "../data";
import CoffeeForm from "./CoffeeForm";
import CoffeeMeta from "./CoffeeMeta";
import RatingEditor from "./RatingEditor";
import Stars from "./Stars";

type Panel = { id: string; kind: "rate" | "edit" } | null;

export default function AllCoffees({ user }: { user: User }) {
  const coffees = useCoffees();
  const ratings = useRatings();
  const machine = useMachine();
  const periods = brewPeriods(useBrews(), machine);
  const [panel, setPanel] = useState<Panel>(null);
  const [error, setError] = useState<string>();

  if (!coffees.length) return <div className="card empty">No coffees yet — add one from “In the machine”.</div>;

  const toggle = (id: string, kind: "rate" | "edit") =>
    setPanel(panel?.id === id && panel.kind === kind ? null : { id, kind });

  async function remove(id: string, name: string, ratingCount: number) {
    const extra = ratingCount
      ? ` This also deletes ${ratingCount} rating${ratingCount > 1 ? "s" : ""} for it, including your partner's.`
      : "";
    if (!window.confirm(`Delete “${name}”?${extra}`)) return;
    setError(undefined);
    try {
      await deleteCoffee(id, machine);
    } catch {
      setError(`Couldn't delete “${name}” — try again.`);
    }
  }

  return (
    <>
      {error && <p className="error">{error}</p>}
      <ul className="coffee-list">
        {coffees.map((c) => {
          const all = ratings.filter((r) => r.coffeeId === c.id);
          const mine = all.find((r) => r.id === ratingId(user.uid, c.id));
          const avg = all.length ? all.reduce((s, r) => s + r.rating, 0) / all.length : 0;
          const inMachine = machine?.coffeeId === c.id;
          const dates = periods.get(c.id) ?? [];
          const open = panel?.id === c.id ? panel.kind : null;
          return (
            <li key={c.id} className="card">
              {open === "edit" ? (
                <CoffeeForm
                  initial={c}
                  submitLabel="Save changes"
                  onSubmit={async (fields) => {
                    await updateCoffee(c.id, fields);
                    setPanel(null);
                  }}
                  onCancel={() => setPanel(null)}
                />
              ) : (
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
                    {dates.length > 0 && (
                      <div className="muted small">
                        In the machine: {[...dates].reverse().map(formatPeriod).join(", ")}
                      </div>
                    )}
                  </div>
                  <div className="stack">
                    <button className="btn" onClick={() => toggle(c.id, "rate")}>
                      {open === "rate" ? "Close" : mine ? "Edit rating" : "Rate"}
                    </button>
                    {!inMachine && (
                      <button className="btn" onClick={() => setMachineCoffee(c.id, user.uid)}>
                        Brew this
                      </button>
                    )}
                    <div className="row tight">
                      <button className="link" onClick={() => toggle(c.id, "edit")}>
                        Edit
                      </button>
                      <button className="link danger" onClick={() => remove(c.id, c.name, all.length)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {open === "rate" && <RatingEditor user={user} coffee={c} />}
            </li>
          );
        })}
      </ul>
    </>
  );
}
