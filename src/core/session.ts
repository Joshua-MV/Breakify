import { minutesToMs } from "./schedule";
import type { BreakSession, BreakifySettings, HistoryEntry, SessionOutcome, WorkSnapshot } from "../shared/types";

export function createSessionId(now = Date.now()): string {
  return `session-${now}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createBreakSession(params: {
  settings: BreakifySettings;
  workSnapshot: WorkSnapshot;
  breakMinutes: number;
  softWarningMinutes: number;
  selectedBreakTabIds: number[];
  now?: number;
}): BreakSession {
  const now = params.now ?? Date.now();
  const endsAt = now + minutesToMs(params.breakMinutes);
  const warningAt = Math.max(now, endsAt - minutesToMs(params.softWarningMinutes));

  return {
    id: createSessionId(now),
    status: "active",
    startedAt: now,
    endsAt,
    warningAt,
    settings: {
      ...params.settings,
      defaultBreakMinutes: params.breakMinutes,
      softWarningMinutes: params.softWarningMinutes,
      selectedBreakTabIds: params.selectedBreakTabIds
    },
    workSnapshot: params.workSnapshot,
    selectedBreakTabIds: params.selectedBreakTabIds,
    trackedBreakTabIds: [...params.selectedBreakTabIds]
  };
}

export function markSessionWarned(session: BreakSession, now = Date.now()): BreakSession {
  if (session.status !== "active") return session;
  return { ...session, status: "warning", warnedAt: now };
}

export function requestCloseConfirmation(session: BreakSession): BreakSession {
  return { ...session, status: "pending-confirmation", pendingConfirmation: true };
}

export function trackBreakTab(session: BreakSession, tabId: number | undefined): BreakSession {
  if (typeof tabId !== "number" || session.trackedBreakTabIds.includes(tabId)) return session;
  return { ...session, trackedBreakTabIds: [...session.trackedBreakTabIds, tabId] };
}

export function removeTrackedBreakTab(session: BreakSession, tabId: number): BreakSession {
  return { ...session, trackedBreakTabIds: session.trackedBreakTabIds.filter((id) => id !== tabId) };
}

export function completeSession(session: BreakSession, now = Date.now(), forceOutcome?: SessionOutcome): BreakSession {
  const outcome = forceOutcome ?? (now <= session.endsAt ? "on-time" : "late");
  return {
    ...session,
    status: "completed",
    endedAt: now,
    outcome,
    pendingConfirmation: false
  };
}

export function cancelSession(session: BreakSession, now = Date.now()): BreakSession {
  return {
    ...session,
    status: "cancelled",
    endedAt: now,
    outcome: "cancelled",
    pendingConfirmation: false
  };
}

export function sessionToHistoryEntry(session: BreakSession): HistoryEntry {
  const endedAt = session.endedAt ?? Date.now();
  return {
    id: session.id,
    startedAt: session.startedAt,
    endedAt,
    plannedMinutes: Math.round((session.endsAt - session.startedAt) / 60000),
    outcome: session.outcome ?? "late",
    scheduleMethod: session.settings.scheduleMethod
  };
}

export function getRemainingMs(session: BreakSession, now = Date.now()): number {
  return Math.max(0, session.endsAt - now);
}
