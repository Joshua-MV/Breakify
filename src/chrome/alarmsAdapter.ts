import { ALARM_BREAK_END, ALARM_BREAK_WARNING } from "../shared/constants";
import type { BreakSession } from "../shared/types";

export async function scheduleBreakAlarms(session: BreakSession): Promise<void> {
  await clearBreakAlarms();
  if (session.warningAt > Date.now() + 1000) {
    chrome.alarms.create(ALARM_BREAK_WARNING, { when: session.warningAt });
  }
  chrome.alarms.create(ALARM_BREAK_END, { when: session.endsAt });
}

export async function clearBreakAlarms(): Promise<void> {
  await chrome.alarms.clear(ALARM_BREAK_WARNING);
  await chrome.alarms.clear(ALARM_BREAK_END);
}
