import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Moon, Save, Sun } from "lucide-react";
import { minutesToSeconds, secondsToMinutes } from "../core/duration";
import { getDefaultBreakMinutes, schedulePresets } from "../core/schedule";
import { defaultSettings } from "../core/settings";
import { Button } from "../components/Button";
import { DurationInput } from "../components/DurationInput";
import { Field, SelectInput } from "../components/Field";
import { sendBreakifyMessage } from "../shared/client";
import type { BreakifyStateResponse } from "../shared/messages";
import type { BreakEndBehavior, BreakifySettings, ScheduleMethod, ThemeMode } from "../shared/types";
import "../options/styles.css";
import "./styles.css";

function App() {
  const [state, setState] = useState<BreakifyStateResponse>({ settings: defaultSettings, history: [] });
  const [draft, setDraft] = useState<BreakifySettings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    const response = await sendBreakifyMessage({ type: "GET_STATE" });
    if (response.ok && "state" in response) {
      setState(response.state);
      setDraft(response.state.settings);
    }
    if (!response.ok) setError(response.error);
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    document.body.dataset.theme = draft.theme;
  }, [draft.theme]);

  function updateDraft(patch: Partial<BreakifySettings>) {
    setDraft((current) => ({ ...current, ...patch }));
    setSaved(false);
  }

  function chooseMethod(method: ScheduleMethod) {
    updateDraft({
      scheduleMethod: method,
      defaultBreakMinutes: getDefaultBreakMinutes(method, draft.customSchedule)
    });
  }

  async function save() {
    const response = await sendBreakifyMessage({ type: "SAVE_SETTINGS", payload: draft });
    if (response.ok && "state" in response) {
      setState(response.state);
      setDraft(response.state.settings);
      setSaved(true);
      setError("");
    }
    if (!response.ok) setError(response.error);
  }

  return (
    <main className="page settings-page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Breakify</p>
          <h1>Settings</h1>
        </div>
        <Button variant="primary" icon={<Save size={17} />} onClick={save}>
          Save presets
        </Button>
      </header>

      {saved ? <p className="notice">Settings saved.</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <section className="settings-grid">
        <section className="panel option-panel">
          <div className="panel-heading">
            <h2>Theme</h2>
          </div>
          <div className="option-choice">
            <button className={draft.theme === "light" ? "option active" : "option"} onClick={() => updateDraft({ theme: "light" as ThemeMode })}>
              <Sun size={18} />
              <span>Light</span>
            </button>
            <button className={draft.theme === "dark" ? "option active" : "option"} onClick={() => updateDraft({ theme: "dark" as ThemeMode })}>
              <Moon size={18} />
              <span>Dark</span>
            </button>
          </div>
        </section>

        <section className="panel option-panel">
          <div className="panel-heading">
            <h2>Break Behavior</h2>
          </div>
          <Field label="When the break ends">
            <SelectInput value={draft.breakEndBehavior} onChange={(event) => updateDraft({ breakEndBehavior: event.target.value as BreakEndBehavior })}>
              <option value="ask-first">Ask before closing tabs</option>
              <option value="auto-close">Close tabs automatically</option>
            </SelectInput>
          </Field>
          <DurationInput
            label="Soft warning"
            valueSeconds={minutesToSeconds(draft.softWarningMinutes)}
            minSeconds={0}
            onChange={(seconds) => updateDraft({ softWarningMinutes: secondsToMinutes(seconds) })}
          />
        </section>

        <section className="panel option-panel">
          <div className="panel-heading">
            <h2>Default Method</h2>
          </div>
          <Field label="Method">
            <SelectInput value={draft.scheduleMethod} onChange={(event) => chooseMethod(event.target.value as ScheduleMethod)}>
              {Object.values(schedulePresets).map((preset) => (
                <option key={preset.method} value={preset.method}>
                  {preset.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <DurationInput
            label="Default break time"
            valueSeconds={minutesToSeconds(draft.defaultBreakMinutes)}
            minSeconds={1}
            onChange={(seconds) => updateDraft({ defaultBreakMinutes: secondsToMinutes(seconds) })}
          />
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
