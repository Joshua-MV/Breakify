import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BarChart3, CheckCircle2, Moon, Sun, Trash2 } from "lucide-react";
import { summarizeHistory } from "../core/history";
import { defaultSettings } from "../core/settings";
import { Button } from "../components/Button";
import { StatusPill } from "../components/StatusPill";
import { sendBreakifyMessage } from "../shared/client";
import type { BreakifyStateResponse } from "../shared/messages";
import "./styles.css";

function App() {
  const [state, setState] = useState<BreakifyStateResponse>({ settings: defaultSettings, history: [] });
  const [error, setError] = useState("");

  async function refresh() {
    const response = await sendBreakifyMessage({ type: "GET_STATE" });
    if (response.ok && "state" in response) {
      setState(response.state);
    }
    if (!response.ok) setError(response.error);
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    document.body.dataset.theme = state.settings.theme;
  }, [state.settings.theme]);

  const summary = useMemo(() => summarizeHistory(state.history), [state.history]);
  const latestDays = summary.daily.slice(0, 14);

  async function clearHistoryEntries() {
    const response = await sendBreakifyMessage({ type: "CLEAR_HISTORY" });
    if (response.ok && "state" in response) setState(response.state);
    if (!response.ok) setError(response.error);
  }

  async function toggleTheme() {
    const response = await sendBreakifyMessage({
      type: "SAVE_SETTINGS",
      payload: { ...state.settings, theme: state.settings.theme === "dark" ? "light" : "dark" }
    });
    if (response.ok && "state" in response) setState(response.state);
    if (!response.ok) setError(response.error);
  }

  return (
    <main className="page history-page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Breakify</p>
          <h1>History</h1>
        </div>
        <div className="top-actions">
          <Button icon={state.settings.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />} onClick={toggleTheme}>
            {state.settings.theme === "dark" ? "Light mode" : "Dark mode"}
          </Button>
          <Button icon={<Trash2 size={16} />} onClick={clearHistoryEntries} disabled={state.history.length === 0}>
            Clear history
          </Button>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <section className="panel hero-history">
        <div className="panel-heading">
          <h2>Your return rhythm</h2>
          <StatusPill tone={summary.currentStreakDays > 0 ? "good" : "neutral"}>{`${summary.currentStreakDays} day streak`}</StatusPill>
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
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Daily breakdown</h2>
          <StatusPill>{`${latestDays.length} days`}</StatusPill>
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
            <p className="muted">Your history will appear after your first completed break.</p>
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
