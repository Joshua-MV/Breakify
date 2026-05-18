import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { BarChart3, Check, Clock3, Coffee, Moon, Plus, Settings, Sparkles, Square, Sun, X } from "lucide-react";
import { combineDuration, minutesToSeconds, secondsToMinutes, splitSeconds } from "../core/duration";
import { getRemainingMs } from "../core/session";
import { getDefaultBreakMinutes, getSchedulePreset, schedulePresets } from "../core/schedule";
import { defaultSettings } from "../core/settings";
import { Button } from "../components/Button";
import { DurationInput } from "../components/DurationInput";
import type { DurationPart } from "../components/DurationInput";
import { Field, SelectInput } from "../components/Field";
import { StatusPill } from "../components/StatusPill";
import { sendBreakifyMessage } from "../shared/client";
import type { BreakifyStateResponse, CurrentTabOption } from "../shared/messages";
import type { BreakEndBehavior, BreakifySettings, ScheduleMethod } from "../shared/types";
import "./styles.css";

const MAX_BREAK_HOURS = 12;
const MAX_BREAK_SECONDS = MAX_BREAK_HOURS * 60 * 60 + 59 * 60;

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function App() {
  const ringRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);
  const [state, setState] = useState<BreakifyStateResponse>({ settings: defaultSettings, history: [] });
  const [tabs, setTabs] = useState<CurrentTabOption[]>([]);
  const [breakSeconds, setBreakSeconds] = useState(minutesToSeconds(defaultSettings.defaultBreakMinutes));
  const [softWarningSeconds, setSoftWarningSeconds] = useState(minutesToSeconds(defaultSettings.softWarningMinutes));
  const [selectedTabIds, setSelectedTabIds] = useState<number[]>([]);
  const [selectedReturnTabIds, setSelectedReturnTabIds] = useState<number[]>([]);
  const [tabToAdd, setTabToAdd] = useState("");
  const [returnTabToAdd, setReturnTabToAdd] = useState("");
  const [scheduleMethod, setScheduleMethod] = useState<ScheduleMethod>(defaultSettings.scheduleMethod);
  const [breakEndBehavior, setBreakEndBehavior] = useState<BreakEndBehavior>(defaultSettings.breakEndBehavior);
  const [durationRingPart, setDurationRingPart] = useState<Extract<DurationPart, "hours" | "minutes">>("minutes");
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");

  async function refresh() {
    const response = await sendBreakifyMessage({ type: "GET_STATE" });
    if (response.ok && "state" in response) {
      const savedBreakSeconds = minutesToSeconds(response.state.settings.defaultBreakMinutes);
      setState(response.state);
      setBreakSeconds(savedBreakSeconds > MAX_BREAK_SECONDS ? 0 : savedBreakSeconds);
      setSoftWarningSeconds(minutesToSeconds(response.state.settings.softWarningMinutes));
      setSelectedTabIds(response.state.settings.selectedBreakTabIds);
      setSelectedReturnTabIds(response.state.settings.selectedReturnTabIds);
      setScheduleMethod(response.state.settings.scheduleMethod);
      setBreakEndBehavior(response.state.settings.breakEndBehavior);
      hydratedRef.current = true;
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

  useEffect(() => {
    if (!hydratedRef.current || activeSession) return;
    const timeout = window.setTimeout(() => {
      void saveSettingsPatch({ defaultBreakMinutes: secondsToMinutes(breakSeconds) });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [breakSeconds, activeSession]);

  const selectedCount = useMemo(() => selectedTabIds.filter((id) => tabs.some((tab) => tab.id === id)).length, [selectedTabIds, tabs]);
  const selectedTabs = tabs.filter((tab) => selectedTabIds.includes(tab.id));
  const availableTabs = tabs.filter((tab) => !selectedTabIds.includes(tab.id));
  const selectedReturnTabs = tabs.filter((tab) => selectedReturnTabIds.includes(tab.id));
  const availableReturnTabs = tabs.filter((tab) => !selectedReturnTabIds.includes(tab.id) && !selectedTabIds.includes(tab.id));
  const scheduleDetails = getSchedulePreset(scheduleMethod, state.settings.customSchedule);
  const breakParts = splitSeconds(breakSeconds);
  const ringValue = durationRingPart === "hours" ? breakParts.hours : breakParts.minutes;
  const ringMax = durationRingPart === "hours" ? MAX_BREAK_HOURS : 59;
  const ringAngle = Math.max(0, Math.min(360, (ringValue / ringMax) * 360));
  const ringSizePx = 268;
  const ringStrokePx = 14;
  const ringCenterPx = ringSizePx / 2;
  const ringRadiusPx = (ringSizePx - ringStrokePx) / 2;
  const ringRadians = (ringAngle / 360) * Math.PI * 2;
  const ringCircumference = 2 * Math.PI * ringRadiusPx;
  const ringProgress = ringAngle / 360;
  const ringKnobX = ringCenterPx + Math.sin(ringRadians) * ringRadiusPx;
  const ringKnobY = ringCenterPx - Math.cos(ringRadians) * ringRadiusPx;

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
    if (breakSeconds < 1) {
      setError("Set a break time before starting.");
      return;
    }
    const breakMinutes = secondsToMinutes(breakSeconds);
    const softWarningMinutes = secondsToMinutes(softWarningSeconds);
    await saveSettingsPatch({
      scheduleMethod,
      breakEndBehavior,
      defaultBreakMinutes: breakMinutes,
      softWarningMinutes,
      selectedBreakTabIds: selectedTabIds,
      selectedReturnTabIds
    });
    const response = await sendBreakifyMessage({
      type: "START_BREAK",
      payload: { breakMinutes, softWarningMinutes, selectedBreakTabIds: selectedTabIds, selectedReturnTabIds }
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

  function addReturnTab() {
    const id = Number(returnTabToAdd);
    if (!Number.isInteger(id)) return;
    setSelectedReturnTabIds((current) => (current.includes(id) ? current : [...current, id]));
    setReturnTabToAdd("");
  }

  function removeReturnTab(tabId: number) {
    setSelectedReturnTabIds((current) => current.filter((id) => id !== tabId));
  }

  function chooseScheduleMethod(method: ScheduleMethod) {
    setScheduleMethod(method);
    if (method !== "custom") {
      setBreakSeconds(minutesToSeconds(getDefaultBreakMinutes(method, state.settings.customSchedule)));
    }
  }

  function setBreakDuration(seconds: number) {
    setBreakSeconds(Math.max(0, Math.min(MAX_BREAK_SECONDS, seconds)));
  }

  function setBreakPart(part: Extract<DurationPart, "hours" | "minutes">, value: number) {
    const current = splitSeconds(breakSeconds);
    const nextParts = { ...current, [part]: Math.max(0, Math.round(value)), seconds: 0 };
    setBreakDuration(combineDuration(nextParts));
  }

  function setTimeFromPointer(clientX: number, clientY: number) {
    const rect = ringRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radians = Math.atan2(clientY - centerY, clientX - centerX);
    const normalized = (radians + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
    const nextValue = Math.round((normalized / (Math.PI * 2)) * ringMax);
    setBreakPart(durationRingPart, nextValue);
  }

  function isDurationControlTarget(target: EventTarget | null) {
    return target instanceof HTMLElement && Boolean(target.closest(".duration-field"));
  }

  function startRingDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (isDurationControlTarget(event.target)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setTimeFromPointer(event.clientX, event.clientY);
  }

  function dragRing(event: React.PointerEvent<HTMLDivElement>) {
    if (isDurationControlTarget(event.target)) return;
    if (event.buttons !== 1) return;
    setTimeFromPointer(event.clientX, event.clientY);
  }

  function openSettingsPage() {
    void chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
  }

  return (
    <main className="popup-shell">
      <header className="brand-header">
        <img className="brand-mark" src="/icons/icon-48.png" alt="" />
        <h1>Breakify</h1>
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
        <section className="start-flow">
          <section className="timer-card">
            <div className="break-note title-note">
              <span>Take a break, you deserve it.</span>
            </div>
            <div
              className="timer-ring"
              ref={ringRef}
              onPointerDown={startRingDrag}
              onPointerMove={dragRing}
              role="slider"
              aria-label="Break duration"
              aria-valuemin={0}
              aria-valuemax={ringMax}
              aria-valuenow={ringValue}
            >
              <svg className="ring-art" viewBox={`0 0 ${ringSizePx} ${ringSizePx}`} aria-hidden="true">
                <circle className="ring-track" cx={ringCenterPx} cy={ringCenterPx} r={ringRadiusPx} />
                <circle
                  className="ring-progress"
                  cx={ringCenterPx}
                  cy={ringCenterPx}
                  r={ringRadiusPx}
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringCircumference * (1 - ringProgress)}
                />
                <circle className="ring-knob" cx={ringKnobX} cy={ringKnobY} r="9" />
              </svg>
              <p>Pick break time</p>
              <DurationInput
                label="Break length"
                valueSeconds={breakSeconds}
                minSeconds={1}
                activePart={durationRingPart}
                unitLabels={{ hours: "HRS", minutes: "MIN", seconds: "SEC" }}
                showSeconds={false}
                onPartFocus={(part) => {
                  if (part === "hours" || part === "minutes") setDurationRingPart(part);
                }}
                onChange={setBreakDuration}
              />
              <div className="timer-hint">
                <Sparkles size={15} />
                <span>Perfect for a quick recharge.</span>
              </div>
            </div>
            <div className="inline-options">
              <Field label="Method">
                <SelectInput value={scheduleMethod} onChange={(event) => chooseScheduleMethod(event.target.value as ScheduleMethod)}>
                  {Object.values(schedulePresets).map((preset) => (
                    <option key={preset.method} value={preset.method}>
                      {preset.label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <DurationInput
                label="Soft warning"
                valueSeconds={softWarningSeconds}
                minSeconds={0}
                onChange={setSoftWarningSeconds}
                hint="Reminder before the break ends."
              />
              {scheduleMethod !== "custom" ? (
                <div className="method-summary">
                  <span>Focus {scheduleDetails.focusMinutes ? `${scheduleDetails.focusMinutes} min` : "your pace"}</span>
                  <span>Break {scheduleDetails.shortBreakMinutes} min</span>
                </div>
              ) : null}
            </div>

            <Button variant="primary" icon={<Coffee size={17} />} onClick={startBreak}>
              Start timer
            </Button>
          </section>

          <section className="tab-picker" aria-label="Break tabs">
            <div className="section-heading">
              <span>Break tabs</span>
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

          <section className="tab-picker" aria-label="Return tabs">
            <div className="section-heading">
              <span>Return tabs</span>
              <StatusPill>{`${selectedReturnTabs.length || "All"} selected`}</StatusPill>
            </div>
            <div className="tab-add-row">
              <SelectInput value={returnTabToAdd} onChange={(event) => setReturnTabToAdd(event.target.value)}>
                <option value="">Choose a work tab to return to</option>
                {availableReturnTabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.title}
                  </option>
                ))}
              </SelectInput>
              <Button icon={<Plus size={16} />} onClick={addReturnTab} disabled={!returnTabToAdd}>
                Add
              </Button>
            </div>
            {selectedReturnTabs.length ? (
              <div className="selected-tabs">
                {selectedReturnTabs.map((tab) => (
                  <div className="selected-tab" key={tab.id}>
                    <span>{tab.title}</span>
                    <button title="Remove tab" onClick={() => removeReturnTab(tab.id)}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-note">Leave this empty to restore every work tab that is not part of your break.</p>
            )}
          </section>
        </section>
      )}

      <nav className="bottom-actions" aria-label="Breakify actions">
        <button className="mini-action" title="Toggle theme" onClick={toggleTheme}>
          {state.settings.theme === "dark" ? <Sun size={23} /> : <Moon size={23} />}
        </button>
        <button className="mini-action" title="History" onClick={() => chrome.runtime.openOptionsPage()}>
          <BarChart3 size={23} />
        </button>
        <button className="mini-action" title="Settings" onClick={openSettingsPage}>
          <Settings size={23} />
        </button>
      </nav>

      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
