import { useState, type FormEvent } from "react";
import type { Coffee } from "../types";

type NewCoffee = Pick<Coffee, "name" | "roaster" | "origin" | "roast">;

export default function CoffeeForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (c: NewCoffee) => Promise<void>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<NewCoffee>({ name: "", roaster: "", origin: "", roast: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof NewCoffee) => (e: { target: { value: string } }) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        roaster: form.roaster?.trim(),
        origin: form.origin?.trim(),
        roast: form.roast,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="coffee-form" onSubmit={submit}>
      <input autoFocus required placeholder="Coffee name *" value={form.name} onChange={set("name")} />
      <input placeholder="Roaster" value={form.roaster} onChange={set("roaster")} />
      <input placeholder="Origin (e.g. Ethiopia, blend)" value={form.origin} onChange={set("origin")} />
      <select value={form.roast} onChange={set("roast")}>
        <option value="">Roast level…</option>
        <option value="light">Light</option>
        <option value="medium">Medium</option>
        <option value="dark">Dark</option>
      </select>
      <div className="row">
        <button className="btn primary" disabled={busy || !form.name.trim()}>
          Put it in the machine
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
