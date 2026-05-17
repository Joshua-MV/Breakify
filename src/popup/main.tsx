import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Check, Clock3, Coffee, Moon, Plus, Settings, Square, Sun, X } from "lucide-react";
import { minutesToSeconds, secondsToMinutes } from "../core/duration";
import { getRemainingMs } from "../core/session";
import { getDefaultBreakMinutes, schedulePresets } from "../core/schedule";
import { defaultSettings } from "../core/settings";
import { Button } from "../components/Button";
import { DurationInput } from "../components/DurationInput";
import { Field, SelectInput } from "../components/Field";
import { StatusPill } from "../components/StatusPill";
import { sendBreakifyMessage } from "../shared/client";
import type { BreakifyStateResponse, CurrentTabOption } from "../shared/messages";
import type { BreakEndBehavior, BreakifySettings, ScheduleMethod } from "../shared/types";
import "./styles.css";

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function App() {
  const [state, setState] = useState<BreakifyStateResponse>({ settings: defaultSettings, history: [] });
  const [tabs, setTabs] = useState<CurrentTabOption[]>([]);
  const [breakSeconds, setBreakSeconds] = useState(minutesToSeconds(defaultSettings.defaultBreakMinutes));
  const [softWarningSeconds, setSoftWarningSeconds] = useState(minutesToSeconds(defaultSettings.softWarningMinutes));
  const [selectedTabIds, setSelectedTabIds] = useState<number[]>([]);
  const [tabToAdd, setTabToAdd] = useState("");
  const [scheduleMethod, setScheduleMethod] = useState<ScheduleMethod>(defaultSettings.scheduleMethod);
  const [breakEndBehavior, setBreakEndBehavior] = useState<BreakEndBehavior>(defaultSettings.breakEndBehavior);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");

  async function refresh() {
    const response = await sendBreakifyMessage({ type: "GET_STATE" });
    if (response.ok && "state" in response) {
      setState(response.state);
      setBreakSeconds(minutesToSeconds(response.state.settings.defaultBreakMinutes));
      setSoftWarningSeconds(minutesToSeconds(response.state.settings.softWarningMinutes));
      setSelectedTabIds(response.state.settings.selectedBreakTabIds);
      setScheduleMethod(response.state.settings.scheduleMethod);
      setBreakEndBehavior(response.state.settings.breakEndBehavior);
    }

    const tabsResponse = await sendBreakifyMessage({ type: "GET_CURRENT_TABS" });
    if (tabsResponse.ok && "tabs" in tabsResponse) {
      setTabs(tabsResponse.tabs);
    }
  }

  useEffect(() => {
    void refresh();
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    document.body.dataset.theme = state.settings.theme;
  }, [state.settings.theme]);

  const activeSession = state.activeSession;
  const remaining = activeSession ? getRemainingMs(activeSession, now) : 0;
  const pendingConfirmation = activeSession?.status === "pending-confirmation";

  const selectedCount = useMemo(() => selectedTabIds.filter((id) => tabs.some((tab) => tab.id === id)).length, [selectedTabIds, tabs]);
  const selectedTabs = tabs.filter((tab) => selectedTabIds.includes(tab.id));
  const availableTabs = tabs.filter((tab) => !selectedTabIds.includes(tab.id));

  async function saveSettingsPatch(patch: Partial<BreakifySettings>) {
    const nextSettings = { ...state.settings, ...patch };
    const response = await sendBreakifyMessage({ type: "SAVE_SETTINGS", payload: nextSettings });
    if (response.ok && "state" in response) setState(response.state);
  }

  async function toggleTheme() {
    await saveSettingsPatch({ theme: state.settings.theme === "dark" ? "light" : "dark" });
  }

  async function startBreak() {
    setError("");
    const breakMinutes = secondsToMinutes(breakSeconds);
    const softWarningMinutes = secondsToMinutes(softWarningSeconds);
    await saveSettingsPatch({
      scheduleMethod,
      breakEndBehavior,
      defaultBreakMinutes: breakMinutes,
      softWarningMinutes,
      selectedBreakTabIds: selectedTabIds
    });
    const response = await sendBreakifyMessage({
      type: "START_BREAK",
      payload: { breakMinutes, softWarningMinutes, selectedBreakTabIds: selectedTabIds }
    });
    if (response.ok && "state" in response) setState(response.state);
    if (!response.ok) setError(response.error);
  }

  async function simpleAction(type: "END_BREAK_EARLY" | "CONFIRM_CLOSE_BREAK_TABS" | "KEEP_BREAK_TABS") {
    const response = await sendBreakifyMessage({ type });
    if (response.ok && "state" in response) setState(response.state);
    if (!response.ok) setError(response.error);
  }

  function addSelectedTab() {
    const id = Number(tabToAdd);
    if (!Number.isInteger(id)) return;
    setSelectedTabIds((current) => (current.includes(id) ? current : [...current, id]));
    setTabToAdd("");
  }

  function removeSelectedTab(tabId: number) {
    setSelectedTabIds((current) => current.filter((id) => id !== tabId));
  }

  function chooseSchedule(method: ScheduleMethod) {
    setScheduleMethod(method);
    setBreakSeconds(minutesToSeconds(getDefaultBreakMinutes(method, state.settings.customSchedule)));
  }

  return (
    <main className="popup-shell">
      <header className="popup-header">
        <div>
          <p className="eyebrow">Breakify</p>
          <h1>Return with less friction.</h1>
        </div>
        <button className="icon-link" title="Open dashboard" onClick={() => chrome.runtime.openOptionsPage()}>
          <Settings size={18} />
        </button>
        <button className="icon-link" title="Toggle dark mode" onClick={toggleTheme}>
          {state.settings.theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {activeSession ? (
        <section className="active-panel">
          <div className="timer-row">
            <Clock3 size={28} />
            <span>{formatRemaining(remaining)}</span>
          </div>
          <StatusPill tone={pendingConfirmation ? "warn" : "good"}>
            {pendingConfirmation ? "Break finished" : activeSession.status === "warning" ? "Soft warning sent" : "Break running"}
          </StatusPill>
          {pendingConfirmation ? (
            <div className="stack">
              <Button variant="primary" icon={<Check size={16} />} onClick={() => simpleAction("CONFIRM_CLOSE_BREAK_TABS")}>
                Close break tabs
              </Button>
              <Button variant="secondary" icon={<X size={16} />} onClick={() => simpleAction("KEEP_BREAK_TABS")}>
                Keep tabs, restore work
              </Button>
            </div>
          ) : (
            <Button variant="danger" icon={<Square size={16} />} onClick={() => simpleAction("END_BREAK_EARLY")}>
              End break early
            </Button>
          )}
        </section>
      ) : (
        <section className="stack">
          <div className="control-card">
            <Field label="Method">
              <SelectInput value={scheduleMethod} onChange={(event) => chooseSchedule(event.target.value as ScheduleMethod)}>
                {Object.values(schedulePresets).map((preset) => (
                  <option key={preset.method} value={preset.method}>
                    {preset.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <DurationInput label="Break length" valueSeconds={breakSeconds} minSeconds={1} onChange={setBreakSeconds} />
            <DurationInput
              label="Soft warning"
              valueSeconds={softWarningSeconds}
              minSeconds={0}
              onChange={setSoftWarningSeconds}
              hint="Breakify warns you this long before your break ends."
            />
            <Field label="When the break ends">
              <SelectInput value={breakEndBehavior} onChange={(event) => setBreakEndBehavior(event.target.value as BreakEndBehavior)}>
                <option value="ask-first">Ask me before closing tabs</option>
                <option value="auto-close">Close break tabs automatically</option>
              </SelectInput>
            </Field>
          </div>

          <section className="tab-picker" aria-label="Break tabs">
            <div className="section-heading">
              <span>Whitelisted break tabs</span>
              <StatusPill>{`${selectedCount} selected`}</StatusPill>
            </div>
            <div className="tab-add-row">
              <SelectInput value={tabToAdd} onChange={(event) => setTabToAdd(event.target.value)}>
                <option value="">Choose an open tab</option>
                {availableTabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.title}
                  </option>
                ))}
              </SelectInput>
              <Button icon={<Plus size={16} />} onClick={addSelectedTab} disabled={!tabToAdd}>
                Add
              </Button>
            </div>
            {selectedTabs.length ? (
              <div className="selected-tabs">
                {selectedTabs.map((tab) => (
                  <div className="selected-tab" key={tab.id}>
                    <span>{tab.title}</span>
                    <button title="Remove tab" onClick={() => removeSelectedTab(tab.id)}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-note">Pick the break tabs Breakify can close or ask about when time is up.</p>
            )}
          </section>

          <Button variant="primary" icon={<Coffee size={17} />} onClick={startBreak}>
            Start break
          </Button>
        </section>
      )}

      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
