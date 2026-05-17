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
          <span>Hours</span>
          <input type="number" min={0} value={parts.hours} onChange={(event) => update("hours", Number(event.target.value))} />
        </label>
        <label>
          <span>Minutes</span>
          <input type="number" min={0} max={59} value={parts.minutes} onChange={(event) => update("minutes", Number(event.target.value))} />
        </label>
        <label>
          <span>Seconds</span>
          <input type="number" min={0} max={59} value={parts.seconds} onChange={(event) => update("seconds", Number(event.target.value))} />
        </label>
      </div>
      {hint ? <p>{hint}</p> : null}
    </fieldset>
  );
}
