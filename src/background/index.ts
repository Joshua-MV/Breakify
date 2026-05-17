import { matchesAllowlist } from "../core/allowlist";
import {
  completeSession,
  createBreakSession,
  markSessionWarned,
  removeTrackedBreakTab,
  requestCloseConfirmation,
  sessionToHistoryEntry,
  trackBreakTab
} from "../core/session";
import { getDefaultBreakMinutes } from "../core/schedule";
import { minutesToMs } from "../core/schedule";
import { ALARM_BREAK_END, ALARM_BREAK_WARNING } from "../shared/constants";
import type { BreakifyMessage, BreakifyResponse } from "../shared/messages";
import type { BreakSession, SessionOutcome } from "../shared/types";
import { clearBreakAlarms, scheduleBreakAlarms } from "../chrome/alarmsAdapter";
import { showConfirmCloseNotification, showRestoredNotification, showWarningNotification } from "../chrome/notificationsAdapter";
import { addHistoryEntry, getActiveSession, getHistory, getSettings, saveActiveSession, saveSettings } from "../chrome/storageAdapter";
import { captureWorkSnapshot, closeTabs, getCurrentTabs, getInitialBreakTabIds, restoreWorkTabs } from "../chrome/tabsAdapter";
import { clearHistory } from "../chrome/storageAdapter";
import { openReminderWindow } from "../chrome/windowsAdapter";

async function getState() {
  const [settings, activeSession, history] = await Promise.all([getSettings(), getActiveSession(), getHistory()]);
  return { settings, activeSession, history };
}

async function finishSession(session: BreakSession, closeBreakTabs: boolean, outcome?: SessionOutcome): Promise<void> {
  if (closeBreakTabs) {
    await closeTabs(session.trackedBreakTabIds);
  }
  await restoreWorkTabs(session);
  const completed = completeSession(session, Date.now(), outcome);
  await addHistoryEntry(sessionToHistoryEntry(completed));
  await saveActiveSession(undefined);
  await clearBreakAlarms();
  await showRestoredNotification();
}

async function handleBreakEnd(): Promise<void> {
  const session = await getActiveSession();
  if (!session) return;

  if (session.settings.breakEndBehavior === "ask-first") {
    const pending = requestCloseConfirmation(session);
    await saveActiveSession(pending);
    await showConfirmCloseNotification();
    return;
  }

  await finishSession(session, true);
}

async function handleMessage(message: BreakifyMessage): Promise<BreakifyResponse> {
  try {
    if (message.type === "GET_STATE") {
      return { ok: true, state: await getState() };
    }

    if (message.type === "GET_CURRENT_TABS") {
      return { ok: true, tabs: await getCurrentTabs() };
    }

    if (message.type === "SAVE_SETTINGS") {
      await saveSettings(message.payload);
      return { ok: true, state: await getState() };
    }

    if (message.type === "CLEAR_HISTORY") {
      await clearHistory();
      return { ok: true, state: await getState() };
    }

    if (message.type === "START_BREAK") {
      const settings = await getSettings();
      const initialBreakTabIds = await getInitialBreakTabIds(message.payload.selectedBreakTabIds, settings.allowlistRules);
      const workSnapshot = await captureWorkSnapshot(initialBreakTabIds, message.payload.selectedReturnTabIds);
      const breakMinutes = message.payload.breakMinutes || getDefaultBreakMinutes(settings.scheduleMethod, settings.customSchedule);
      const session = createBreakSession({
        settings,
        workSnapshot,
        breakMinutes,
        softWarningMinutes: message.payload.softWarningMinutes,
        selectedBreakTabIds: initialBreakTabIds
      });
      session.settings.selectedReturnTabIds = message.payload.selectedReturnTabIds;
      await saveSettings(session.settings);
      const sessionToStore = session.warningAt <= Date.now() + 1000 ? markSessionWarned(session, Date.now()) : session;
      await saveActiveSession(sessionToStore);
      await scheduleBreakAlarms(session);
      if (sessionToStore.status === "warning") {
        const minutesLeft = Math.ceil((session.endsAt - Date.now()) / 60000);
        await showWarningNotification(minutesLeft);
        await openReminderWindow();
      }
      return { ok: true, state: await getState() };
    }

    if (message.type === "END_BREAK_EARLY") {
      const session = await getActiveSession();
      if (session) {
        await finishSession(session, true, "early");
      }
      return { ok: true, state: await getState() };
    }

    if (message.type === "CONFIRM_CLOSE_BREAK_TABS") {
      const session = await getActiveSession();
      if (session) await finishSession(session, true);
      return { ok: true, state: await getState() };
    }

    if (message.type === "KEEP_BREAK_TABS") {
      const session = await getActiveSession();
      if (session) await finishSession(session, false);
      return { ok: true, state: await getState() };
    }

    if (message.type === "EXTEND_BREAK") {
      const session = await getActiveSession();
      if (session) {
        const now = Date.now();
        const extensionMs = minutesToMs(message.payload.minutes);
        const endsAt = Math.max(session.endsAt, now) + extensionMs;
        const warningAt = Math.max(now, endsAt - minutesToMs(session.settings.softWarningMinutes));
        const extended: BreakSession = {
          ...session,
          status: warningAt > now + 1000 ? "active" : session.status,
          endsAt,
          warningAt,
          pendingConfirmation: false
        };
        await saveActiveSession(extended);
        await scheduleBreakAlarms(extended);
      }
      return { ok: true, state: await getState() };
    }

    return { ok: false, error: "Unsupported Breakify message." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unexpected Breakify error." };
  }
}

chrome.runtime.onMessage.addListener((message: BreakifyMessage, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  void (async () => {
    const session = await getActiveSession();
    if (!session) return;

    if (alarm.name === ALARM_BREAK_WARNING) {
      const warned = markSessionWarned(session, Date.now());
      await saveActiveSession(warned);
      const minutesLeft = Math.ceil((session.endsAt - Date.now()) / 60000);
      await showWarningNotification(minutesLeft);
      await openReminderWindow();
    }

    if (alarm.name === ALARM_BREAK_END) {
      await handleBreakEnd();
    }
  })();
});

chrome.tabs.onCreated.addListener((tab) => {
  void (async () => {
    const session = await getActiveSession();
    if (!session || !tab.id) return;
    await saveActiveSession(trackBreakTab(session, tab.id));
  })();
});

chrome.tabs.onUpdated.addListener((tabId, _changeInfo, tab) => {
  void (async () => {
    const session = await getActiveSession();
    if (!session) return;
    if (matchesAllowlist(tab.url, session.settings.allowlistRules)) {
      await saveActiveSession(trackBreakTab(session, tabId));
    }
  })();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void (async () => {
    const session = await getActiveSession();
    if (!session) return;
    await saveActiveSession(removeTrackedBreakTab(session, tabId));
  })();
});
