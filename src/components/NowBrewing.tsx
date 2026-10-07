import { useState } from "react";
import type { User } from "firebase/auth";
import { addCoffee, formatPeriod, setMachineCoffee, useCoffees, useMachine } from "../data";
import CoffeeForm from "./CoffeeForm";
import CoffeeMeta from "./CoffeeMeta";
import RatingEditor from "./RatingEditor";

export default function NowBrewing({ user }: { user: User }) {
  const machine = useMachine();
  const coffees = useCoffees();
  const [changing, setChanging] = useState(false);
  const [mode, setMode] = useState<"new" | "existing">("new");

  if (machine === undefined) return <p className="muted">Loading…</p>;

  const current = coffees.find((c) => c.id === machine.coffeeId);

  async function putIn(coffeeId: string) {
    await setMachineCoffee(coffeeId, user.uid);
    setChanging(false);
  }

  if (changing || !current) {
    return (
      <section className="card">
        <h2>{current ? "Change the coffee" : "What's in the machine?"}</h2>
        {coffees.length > 0 && (
          <div className="segmented">
            <button className={mode === "new" ? "active" : ""} onClick={() => setMode("new")}>
              New coffee
            </button>
            <button className={mode === "existing" ? "active" : ""} onClick={() => setMode("existing")}>
              One we've had before
            </button>
          </div>
        )}
        {mode === "new" || coffees.length === 0 ? (
          <CoffeeForm
            onSubmit={async (c) => putIn(await addCoffee({ ...c, addedBy: user.uid }))}
            onCancel={current ? () => setChanging(false) : undefined}
          />
        ) : (
          <ul className="pick-list">
            {coffees.map((c) => (
              <li key={c.id}>
                <button onClick={() => putIn(c.id)} disabled={c.id === current?.id}>
                  <strong>{c.name}</strong>
                  <CoffeeMeta coffee={c} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <section className="card">
      <div className="now-header">
        <div>
          <div className="eyebrow">Currently in the machine</div>
          <h2>{current.name}</h2>
          <CoffeeMeta coffee={current} />
          {machine.setAt && (
            <div className="muted small">
              In the machine {formatPeriod({ start: machine.setAt.toDate(), end: null })}
            </div>
          )}
        </div>
        <button
          className="btn"
          onClick={() => {
            setMode("new");
            setChanging(true);
          }}
        >
          Change
        </button>
      </div>
      <RatingEditor user={user} coffee={current} />
    </section>
  );
}
