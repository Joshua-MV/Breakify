import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BarChart3, CheckCircle2, Moon, Plus, Save, Sun, Trash2 } from "lucide-react";
import { createAllowlistRule } from "../core/allowlist";
import { minutesToSeconds, secondsToMinutes } from "../core/duration";
import { summarizeHistory } from "../core/history";
import { schedulePresets } from "../core/schedule";
import { defaultSettings } from "../core/settings";
import { Button } from "../components/Button";
import { DurationInput } from "../components/DurationInput";
import { Field, NumberInput, SelectInput, TextInput } from "../components/Field";
import { StatusPill } from "../components/StatusPill";
import { sendBreakifyMessage } from "../shared/client";
import type { BreakifyStateResponse } from "../shared/messages";
import type { AllowlistRuleType, BreakEndBehavior, BreakifySettings, ScheduleMethod } from "../shared/types";
import "./styles.css";

function App() {
  const [state, setState] = useState<BreakifyStateResponse>({ settings: defaultSettings, history: [] });
  const [draft, setDraft] = useState<BreakifySettings>(defaultSettings);
  const [ruleValue, setRuleValue] = useState("");
  const [ruleType, setRuleType] = useState<AllowlistRuleType>("domain");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    const response = await sendBreakifyMessage({ type: "GET_STATE" });
    if (response.ok && "state" in response) {
      setState(response.state);
      setDraft(response.state.settings);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    document.body.dataset.theme = draft.theme;
  }, [draft.theme]);

  const summary = useMemo(() => summarizeHistory(state.history), [state.history]);

  function updateDraft(patch: Partial<BreakifySettings>) {
    setDraft((current) => ({ ...current, ...patch }));
    setSaved(false);
  }

  async function save() {
    setError("");
    const response = await sendBreakifyMessage({ type: "SAVE_SETTINGS", payload: draft });
    if (response.ok && "state" in response) {
      setState(response.state);
      setDraft(response.state.settings);
      setSaved(true);
    }
    if (!response.ok) setError(response.error);
  }

  async function clearHistoryEntries() {
    const response = await sendBreakifyMessage({ type: "CLEAR_HISTORY" });
    if (response.ok && "state" in response) {
      setState(response.state);
    }
    if (!response.ok) setError(response.error);
  }

  function addRule() {
    if (!ruleValue.trim()) return;
    updateDraft({ allowlistRules: [...draft.allowlistRules, createAllowlistRule(ruleValue, ruleType)] });
    setRuleValue("");
  }

  function removeRule(id: string) {
    updateDraft({ allowlistRules: draft.allowlistRules.filter((rule) => rule.id !== id) });
  }

  const latestDays = summary.daily.slice(0, 7);

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Breakify</p>
          <h1>Breaks that bring you back.</h1>
        </div>
        <div className="top-actions">
          <Button icon={draft.theme === "dark" ? <Sun size={17} /> : <Moon size={17} />} onClick={() => updateDraft({ theme: draft.theme === "dark" ? "light" : "dark" })}>
            {draft.theme === "dark" ? "Light mode" : "Dark mode"}
          </Button>
          <Button variant="primary" icon={<Save size={17} />} onClick={save}>
            Save settings
          </Button>
        </div>
      </header>

      {saved ? (
        <div className="notice">
          <CheckCircle2 size={18} />
          Settings saved.
        </div>
      ) : null}
      {error ? <p className="error">{error}</p> : null}

      <section className="grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Schedule</h2>
            <StatusPill>{schedulePresets[draft.scheduleMethod].label}</StatusPill>
          </div>
          <div className="two-col">
            <Field label="Method">
              <SelectInput value={draft.scheduleMethod} onChange={(event) => updateDraft({ scheduleMethod: event.target.value as ScheduleMethod })}>
                {Object.values(schedulePresets).map((preset) => (
                  <option key={preset.method} value={preset.method}>
                    {preset.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <DurationInput
              label="Default break"
              valueSeconds={minutesToSeconds(draft.defaultBreakMinutes)}
              minSeconds={1}
              onChange={(seconds) => updateDraft({ defaultBreakMinutes: secondsToMinutes(seconds) })}
            />
          </div>
          <div className="two-col">
            <DurationInput
              label="Soft warning"
              valueSeconds={minutesToSeconds(draft.softWarningMinutes)}
              minSeconds={0}
              onChange={(seconds) => updateDraft({ softWarningMinutes: secondsToMinutes(seconds) })}
            />
            <Field label="Break end">
              <SelectInput value={draft.breakEndBehavior} onChange={(event) => updateDraft({ breakEndBehavior: event.target.value as BreakEndBehavior })}>
                <option value="ask-first">Ask first</option>
                <option value="auto-close">Close automatically</option>
              </SelectInput>
            </Field>
          </div>
          <div className="custom-box">
            <h3>Custom rhythm</h3>
            <div className="three-col">
              <Field label="Focus">
                <NumberInput
                  value={draft.customSchedule.focusMinutes}
                  onChange={(event) =>
                    updateDraft({ customSchedule: { ...draft.customSchedule, focusMinutes: Number(event.target.value) } })
                  }
                />
              </Field>
              <Field label="Short break">
                <NumberInput
                  value={draft.customSchedule.shortBreakMinutes}
                  onChange={(event) =>
                    updateDraft({ customSchedule: { ...draft.customSchedule, shortBreakMinutes: Number(event.target.value) } })
                  }
                />
              </Field>
              <Field label="Long break">
                <NumberInput
                  value={draft.customSchedule.longBreakMinutes ?? 0}
                  onChange={(event) =>
                    updateDraft({ customSchedule: { ...draft.customSchedule, longBreakMinutes: Number(event.target.value) } })
                  }
                />
              </Field>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>Allowlist</h2>
            <StatusPill>{`${draft.allowlistRules.length} rules`}</StatusPill>
          </div>
          <div className="rule-entry">
            <SelectInput value={ruleType} onChange={(event) => setRuleType(event.target.value as AllowlistRuleType)}>
              <option value="domain">Domain</option>
              <option value="url">URL</option>
            </SelectInput>
            <TextInput placeholder="youtube.com or https://example.com/path" value={ruleValue} onChange={(event) => setRuleValue(event.target.value)} />
            <Button icon={<Plus size={16} />} onClick={addRule}>
              Add
            </Button>
          </div>
          <div className="rule-list">
            {draft.allowlistRules.length ? (
              draft.allowlistRules.map((rule) => (
                <div className="rule-row" key={rule.id}>
                  <div>
                    <strong>{rule.value}</strong>
                    <span>{rule.type}</span>
                  </div>
                  <button className="icon-button" title="Remove rule" onClick={() => removeRule(rule.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            ) : (
              <p className="muted">No saved rules yet. You can still pick current tabs from the popup before each break.</p>
            )}
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>History</h2>
          <div className="history-actions">
            <StatusPill tone={summary.currentStreakDays > 0 ? "good" : "neutral"}>{`${summary.currentStreakDays} day streak`}</StatusPill>
            <Button icon={<Trash2 size={16} />} onClick={clearHistoryEntries} disabled={state.history.length === 0}>
              Clear history
            </Button>
          </div>
        </div>
        <div className="stats">
          <div className="stat">
            <BarChart3 size={22} />
            <span>{summary.onTimeRate}%</span>
            <p>on-time returns</p>
          </div>
          <div className="stat">
            <CheckCircle2 size={22} />
            <span>{state.history.length}</span>
            <p>break sessions</p>
          </div>
        </div>
        <div className="day-list">
          {latestDays.length ? (
            latestDays.map((day) => (
              <div className="day-row" key={day.date}>
                <span>{day.date}</span>
                <div className="bar" aria-label={`${day.onTime} of ${day.total} on time`}>
                  <i style={{ width: `${day.total ? (day.onTime / day.total) * 100 : 0}%` }} />
                </div>
                <strong>
                  {day.onTime}/{day.total}
                </strong>
              </div>
            ))
          ) : (
            <p className="muted">Your consistency dashboard will fill in after your first break.</p>
          )}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
