interface Props {
  value: number;
  onChange?: (v: number) => void;
  size?: "sm" | "lg";
}

export default function Stars({ value, onChange, size = "sm" }: Props) {
  return (
    <span className={`stars ${size} ${onChange ? "editable" : ""}`}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className={n <= value ? "on" : ""}
            onClick={() => onChange(n)}
          >
            ★
          </button>
        ) : (
          <span key={n} className={n <= value ? "on" : ""}>
            ★
          </span>
        ),
      )}
    </span>
  );
}
