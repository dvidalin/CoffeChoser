import type { Timestamp } from "firebase/firestore";

export interface Coffee {
  id: string;
  name: string;
  roaster?: string;
  origin?: string;
  roast?: "light" | "medium" | "dark" | "";
  addedBy: string;
  createdAt?: Timestamp;
}

export interface Rating {
  id: string;
  uid: string;
  coffeeId: string;
  rating: number; // 1–5
  notes: string;
  updatedAt?: Timestamp;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
}

export interface MachineState {
  coffeeId: string | null;
  setBy?: string;
  setAt?: Timestamp;
}
