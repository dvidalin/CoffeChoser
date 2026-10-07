import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Brew, Coffee, MachineState, Rating, UserProfile } from "./types";

// ---------- live subscriptions ----------

function useCollection<T>(path: string, order?: string): T[] {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    const ref = collection(db, path);
    const q = order ? query(ref, orderBy(order, "desc")) : ref;
    return onSnapshot(q, (snap) =>
      setItems(
        snap.docs.map(
          (d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }) as T,
        ),
      ),
    );
  }, [path, order]);
  return items;
}

export const useCoffees = () => useCollection<Coffee>("coffees", "createdAt");
export const useRatings = () => useCollection<Rating>("ratings");
export const useBrews = () => useCollection<Brew>("brews", "startedAt");
export const useUsers = () =>
  useCollection<UserProfile & { id: string }>("users");

export function useMachine(): MachineState | undefined {
  const [state, setState] = useState<MachineState>();
  useEffect(
    () =>
      onSnapshot(doc(db, "machine", "current"), (snap) =>
        setState(
          (snap.data({ serverTimestamps: "estimate" }) as MachineState) ?? { coffeeId: null },
        ),
      ),
    [],
  );
  return state;
}

export function useRanking(uid: string): string[] | undefined {
  const [order, setOrder] = useState<string[]>();
  useEffect(
    () =>
      onSnapshot(doc(db, "rankings", uid), (snap) =>
        setOrder((snap.data()?.order as string[]) ?? []),
      ),
    [uid],
  );
  return order;
}

// ---------- writes ----------

export function saveProfile(p: UserProfile) {
  return setDoc(doc(db, "users", p.uid), p, { merge: true });
}

export async function addCoffee(
  data: Omit<Coffee, "id" | "createdAt">,
): Promise<string> {
  const ref = await addDoc(collection(db, "coffees"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export type CoffeeFields = Pick<Coffee, "name" | "roaster" | "origin" | "roast">;

export function updateCoffee(id: string, fields: CoffeeFields) {
  return updateDoc(doc(db, "coffees", id), fields);
}

/** Deletes the coffee plus everyone's ratings and brew history for it. */
export async function deleteCoffee(id: string, machine: MachineState | undefined) {
  const [ratings, brews] = await Promise.all([
    getDocs(query(collection(db, "ratings"), where("coffeeId", "==", id))),
    getDocs(query(collection(db, "brews"), where("coffeeId", "==", id))),
  ]);
  const batch = writeBatch(db);
  batch.delete(doc(db, "coffees", id));
  ratings.docs.forEach((d) => batch.delete(d.ref));
  brews.docs.forEach((d) => batch.delete(d.ref));
  if (machine?.coffeeId === id) {
    batch.set(doc(db, "machine", "current"), { coffeeId: null, setAt: serverTimestamp() });
  }
  await batch.commit();
}

/** Puts a coffee in the machine and records it in the brew history. */
export function setMachineCoffee(coffeeId: string, uid: string) {
  const batch = writeBatch(db);
  batch.set(doc(db, "machine", "current"), {
    coffeeId,
    setBy: uid,
    setAt: serverTimestamp(),
  });
  batch.set(doc(collection(db, "brews")), {
    coffeeId,
    setBy: uid,
    startedAt: serverTimestamp(),
  });
  return batch.commit();
}

export interface BrewPeriod {
  start: Date;
  end: Date | null; // null = still in the machine
}

/**
 * When each coffee was in the machine. A brew lasts until the next brew
 * started. Coffees put in before brew history existed fall back to the
 * machine's own timestamp.
 */
export function brewPeriods(
  brews: Brew[],
  machine: MachineState | undefined,
): Map<string, BrewPeriod[]> {
  const sorted = brews
    .filter((b) => b.startedAt)
    .sort((a, b) => a.startedAt!.toMillis() - b.startedAt!.toMillis());
  const periods = new Map<string, BrewPeriod[]>();
  sorted.forEach((b, i) => {
    const next = sorted[i + 1];
    const list = periods.get(b.coffeeId) ?? [];
    list.push({ start: b.startedAt!.toDate(), end: next ? next.startedAt!.toDate() : null });
    periods.set(b.coffeeId, list);
  });
  // The last brew only counts as "still in" if it's what the machine says.
  const last = sorted[sorted.length - 1];
  if (last && machine?.coffeeId !== last.coffeeId) {
    const list = periods.get(last.coffeeId)!;
    list[list.length - 1].end = machine?.setAt?.toDate() ?? list[list.length - 1].start;
  }
  if (!sorted.length && machine?.coffeeId && machine.setAt) {
    periods.set(machine.coffeeId, [{ start: machine.setAt.toDate(), end: null }]);
  }
  return periods;
}

export function formatPeriod(p: BrewPeriod): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    });
  if (!p.end) return `since ${fmt(p.start)}`;
  const a = fmt(p.start);
  const b = fmt(p.end);
  return a === b ? a : `${a} – ${b}`;
}

export function ratingId(uid: string, coffeeId: string) {
  return `${uid}_${coffeeId}`;
}

export function saveRating(
  uid: string,
  coffeeId: string,
  rating: number,
  notes: string,
) {
  return setDoc(doc(db, "ratings", ratingId(uid, coffeeId)), {
    uid,
    coffeeId,
    rating,
    notes,
    updatedAt: serverTimestamp(),
  });
}

export function saveRanking(uid: string, order: string[]) {
  return setDoc(doc(db, "rankings", uid), { order });
}

/**
 * The user's leaderboard: every coffee they rated, in their saved stack-rank
 * order. Newly rated coffees not yet placed are slotted in by star rating.
 */
export function buildLeaderboard(
  order: string[],
  ratings: Rating[],
  coffees: Coffee[],
): { coffee: Coffee; rating: Rating }[] {
  const byCoffee = new Map(coffees.map((c) => [c.id, c]));
  const rated = new Map(ratings.map((r) => [r.coffeeId, r]));

  const ranked = order.filter((id) => rated.has(id) && byCoffee.has(id));
  const placed = new Set(ranked);
  const unplaced = [...rated.keys()]
    .filter((id) => !placed.has(id) && byCoffee.has(id))
    .sort((a, b) => rated.get(b)!.rating - rated.get(a)!.rating);

  // Insert each unplaced coffee after the last ranked coffee with >= its stars.
  for (const id of unplaced) {
    const stars = rated.get(id)!.rating;
    let idx = ranked.length;
    for (let i = 0; i < ranked.length; i++) {
      if (rated.get(ranked[i])!.rating < stars) {
        idx = i;
        break;
      }
    }
    ranked.splice(idx, 0, id);
  }

  return ranked.map((id) => ({ coffee: byCoffee.get(id)!, rating: rated.get(id)! }));
}
