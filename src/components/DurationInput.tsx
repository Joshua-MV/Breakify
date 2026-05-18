import { combineDuration, splitSeconds } from "../core/duration";

export type DurationPart = "hours" | "minutes" | "seconds";

interface DurationInputProps {
  label: string;
  valueSeconds: number;
  hint?: string;
  minSeconds?: number;
  showSeconds?: boolean;
  activePart?: DurationPart;
  unitLabels?: {
    hours: string;
    minutes: string;
    seconds: string;
  };
  onPartFocus?: (part: DurationPart) => void;
  onChange: (seconds: number) => void;
}

export function DurationInput({
  label,
  valueSeconds,
  hint,
  minSeconds = 0,
  showSeconds = true,
  activePart,
  unitLabels = { hours: "HRS", minutes: "MIN", seconds: "SEC" },
  onPartFocus,
  onChange,
}: DurationInputProps) {
  const parts = splitSeconds(valueSeconds);

  function update(part: DurationPart, value: number) {
    const nextParts = { ...parts, [part]: Number.isFinite(value) ? value : 0 };
    const next = combineDuration(showSeconds ? nextParts : { ...nextParts, seconds: 0 });
    onChange(next);
  }

  function selectValue(part: DurationPart, event: React.FocusEvent<HTMLInputElement>) {
    onPartFocus?.(part);
    event.currentTarget.scrollLeft = 0;
  }

  return (
    <fieldset className="duration-field">
      <legend>{label}</legend>
      <div className={`duration-grid${showSeconds ? "" : " duration-grid-two"}`}>
        <label className={activePart === "hours" ? "is-active" : ""}>
          <span>{unitLabels.hours}</span>
          <input
            type="text"
            inputMode="numeric"
            value={parts.hours.toString().padStart(2, "0")}
            onFocus={(event) => selectValue("hours", event)}
            onChange={(event) => update("hours", Number(event.target.value.replace(/\D/g, "") || 0))}
          />
        </label>
        <label className={activePart === "minutes" ? "is-active" : ""}>
          <span>{unitLabels.minutes}</span>
          <input
            type="text"
            inputMode="numeric"
            value={parts.minutes.toString().padStart(2, "0")}
            onFocus={(event) => selectValue("minutes", event)}
            onChange={(event) => update("minutes", Number(event.target.value.replace(/\D/g, "") || 0))}
          />
        </label>
        {showSeconds ? (
          <label className={activePart === "seconds" ? "is-active" : ""}>
            <span>{unitLabels.seconds}</span>
            <input
              type="text"
              inputMode="numeric"
              value={parts.seconds.toString().padStart(2, "0")}
              onFocus={(event) => selectValue("seconds", event)}
              onChange={(event) => update("seconds", Number(event.target.value.replace(/\D/g, "") || 0))}
            />
          </label>
        ) : null}
      </div>
      {hint ? <p>{hint}</p> : null}
    </fieldset>
  );
}
