import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Check, Clock3, Plus, X } from "lucide-react";
import { getRemainingMs } from "../core/session";
import { defaultSettings } from "../core/settings";
import { Button } from "../components/Button";
import { sendBreakifyMessage } from "../shared/client";
import type { BreakifyStateResponse } from "../shared/messages";
import "./styles.css";

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
}

function App() {
  const [state, setState] = useState<BreakifyStateResponse>({ settings: defaultSettings, history: [] });
  const [now, setNow] = useState(Date.now());

  async function refresh() {
    const response = await sendBreakifyMessage({ type: "GET_STATE" });
    if (response.ok && "state" in response) {
      setState(response.state);
      document.body.dataset.theme = response.state.settings.theme;
    }
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function closeBreakTabs() {
    await sendBreakifyMessage({ type: "CONFIRM_CLOSE_BREAK_TABS" });
    window.close();
  }

  async function endEarly() {
    await sendBreakifyMessage({ type: "END_BREAK_EARLY" });
    window.close();
  }

  async function extendBreak(minutes: number) {
    const response = await sendBreakifyMessage({ type: "EXTEND_BREAK", payload: { minutes } });
    if (response.ok && "state" in response) {
      setState(response.state);
    }
  }

  const session = state.activeSession;
  const remaining = session ? getRemainingMs(session, now) : 0;

  return (
    <main className="reminder">
      <div className="icon">
        <Clock3 size={30} />
      </div>
      <p className="eyebrow">Soft reminder</p>
      <h1>Your break is almost done.</h1>
      <div className="time">{formatRemaining(remaining)}</div>
      <p className="copy">Start wrapping up this tab so returning to work feels clean.</p>
      <div className="extend-row" aria-label="Extend break">
        <Button icon={<Plus size={15} />} onClick={() => extendBreak(5)}>
          5 min
        </Button>
        <Button icon={<Plus size={15} />} onClick={() => extendBreak(10)}>
          10 min
        </Button>
      </div>
      <div className="actions">
        <Button variant="primary" icon={<Check size={16} />} onClick={closeBreakTabs}>
          Return now
        </Button>
        <Button icon={<X size={16} />} onClick={endEarly}>
          End break
        </Button>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
