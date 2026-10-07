import type { Coffee } from "../types";

export default function CoffeeMeta({ coffee }: { coffee: Coffee }) {
  const bits = [coffee.roaster, coffee.origin, coffee.roast && `${coffee.roast} roast`].filter(
    Boolean,
  );
  if (!bits.length) return null;
  return <div className="meta">{bits.join(" · ")}</div>;
}
