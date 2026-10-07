import { useState } from "react";
import type { User } from "firebase/auth";
import { buildLeaderboard, saveRanking, useCoffees, useRanking, useRatings, useUsers } from "../data";
import CoffeeMeta from "./CoffeeMeta";
import Stars from "./Stars";

export default function Leaderboard({ user }: { user: User }) {
  const users = useUsers();
  const [viewing, setViewing] = useState(user.uid);

  return (
    <section>
      {users.length > 1 && (
        <div className="segmented">
          {users.map((u) => (
            <button
              key={u.id}
              className={viewing === u.id ? "active" : ""}
              onClick={() => setViewing(u.id)}
            >
              {u.id === user.uid ? "Mine" : u.displayName.split(" ")[0]}
            </button>
          ))}
        </div>
      )}
      <Board key={viewing} uid={viewing} editable={viewing === user.uid} />
    </section>
  );
}

function Board({ uid, editable }: { uid: string; editable: boolean }) {
  const coffees = useCoffees();
  const ratings = useRatings().filter((r) => r.uid === uid);
  const order = useRanking(uid);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  if (order === undefined) return <p className="muted">Loading…</p>;

  const rows = buildLeaderboard(order, ratings, coffees);

  if (!rows.length) {
    return (
      <div className="card empty">
        {editable
          ? "Rate a coffee and it'll show up here. Then drag them into your personal top list."
          : "Nothing rated yet."}
      </div>
    );
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= rows.length || from === to) return;
    const ids = rows.map((r) => r.coffee.id);
    const [id] = ids.splice(from, 1);
    ids.splice(to, 0, id);
    saveRanking(uid, ids);
  }

  return (
    <>
      {editable && (
        <p className="muted hint">Drag or use the arrows to stack-rank. Your #1 is your favorite.</p>
      )}
      <ol className="leaderboard">
        {rows.map(({ coffee, rating }, i) => (
          <li
            key={coffee.id}
            className={`${dragIdx === i ? "dragging" : ""} ${overIdx === i && dragIdx !== i ? "over" : ""}`}
            draggable={editable}
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => {
              if (dragIdx === null) return;
              e.preventDefault();
              setOverIdx(i);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIdx !== null) move(dragIdx, i);
              setDragIdx(null);
              setOverIdx(null);
            }}
            onDragEnd={() => {
              setDragIdx(null);
              setOverIdx(null);
            }}
          >
            <span className={`rank rank-${i + 1}`}>{i + 1}</span>
            <div className="body">
              <div className="title">
                <strong>{coffee.name}</strong> <Stars value={rating.rating} />
              </div>
              <CoffeeMeta coffee={coffee} />
              {rating.notes && <p className="notes">{rating.notes}</p>}
            </div>
            {editable && (
              <div className="arrows">
                <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}>
                  ▲
                </button>
                <button
                  aria-label="Move down"
                  disabled={i === rows.length - 1}
                  onClick={() => move(i, i + 1)}
                >
                  ▼
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}
