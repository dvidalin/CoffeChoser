import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Coffee, MachineState, Rating, UserProfile } from "./types";

// ---------- live subscriptions ----------

function useCollection<T>(path: string, order?: string): T[] {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    const ref = collection(db, path);
    const q = order ? query(ref, orderBy(order, "desc")) : ref;
    return onSnapshot(q, (snap) =>
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T)),
    );
  }, [path, order]);
  return items;
}

export const useCoffees = () => useCollection<Coffee>("coffees", "createdAt");
export const useRatings = () => useCollection<Rating>("ratings");
export const useUsers = () =>
  useCollection<UserProfile & { id: string }>("users");

export function useMachine(): MachineState | undefined {
  const [state, setState] = useState<MachineState>();
  useEffect(
    () =>
      onSnapshot(doc(db, "machine", "current"), (snap) =>
        setState((snap.data() as MachineState) ?? { coffeeId: null }),
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

export function setMachineCoffee(coffeeId: string | null, uid: string) {
  return setDoc(doc(db, "machine", "current"), {
    coffeeId,
    setBy: uid,
    setAt: serverTimestamp(),
  });
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
