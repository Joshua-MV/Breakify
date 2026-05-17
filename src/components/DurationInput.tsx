import { combineDuration, splitSeconds } from "../core/duration";

interface DurationInputProps {
  label: string;
  valueSeconds: number;
  hint?: string;
  minSeconds?: number;
  onChange: (seconds: number) => void;
}

export function DurationInput({ label, valueSeconds, hint, minSeconds = 0, onChange }: DurationInputProps) {
  const parts = splitSeconds(valueSeconds);

  function update(part: "hours" | "minutes" | "seconds", value: number) {
    const next = combineDuration({ ...parts, [part]: Number.isFinite(value) ? value : 0 });
    onChange(next);
  }

  return (
    <fieldset className="duration-field">
      <legend>{label}</legend>
      <div className="duration-grid">
        <label>
          <span>HRS</span>
          <input
            type="text"
            inputMode="numeric"
            value={parts.hours.toString().padStart(2, "0")}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => update("hours", Number(event.target.value.replace(/\D/g, "") || 0))}
          />
        </label>
        <label>
          <span>MIN</span>
          <input
            type="text"
            inputMode="numeric"
            value={parts.minutes.toString().padStart(2, "0")}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => update("minutes", Number(event.target.value.replace(/\D/g, "") || 0))}
          />
        </label>
        <label>
          <span>SEC</span>
          <input
            type="text"
            inputMode="numeric"
            value={parts.seconds.toString().padStart(2, "0")}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => update("seconds", Number(event.target.value.replace(/\D/g, "") || 0))}
          />
        </label>
      </div>
      {hint ? <p>{hint}</p> : null}
    </fieldset>
  );
}
