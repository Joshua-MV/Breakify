export type BreakEndBehavior = "ask-first" | "auto-close";
export type ThemeMode = "light" | "dark";
export type SessionStatus = "active" | "warning" | "pending-confirmation" | "completed" | "cancelled";
export type SessionOutcome = "on-time" | "late" | "early" | "cancelled";
export type ScheduleMethod = "pomodoro" | "fifty-two-seventeen" | "ultradian" | "custom";
export type AllowlistRuleType = "domain" | "url";

export interface AllowlistRule {
  id: string;
  type: AllowlistRuleType;
  value: string;
  label?: string;
}

export interface SchedulePreset {
  method: ScheduleMethod;
  label: string;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes?: number;
  cyclesBeforeLongBreak?: number;
}

export interface BreakifySettings {
  defaultBreakMinutes: number;
  softWarningMinutes: number;
  breakEndBehavior: BreakEndBehavior;
  theme: ThemeMode;
  scheduleMethod: ScheduleMethod;
  selectedBreakTabIds: number[];
  selectedReturnTabIds: number[];
  allowlistRules: AllowlistRule[];
  customSchedule: SchedulePreset;
}

export interface SavedTab {
  id?: number;
  windowId?: number;
  index?: number;
  url: string;
  title?: string;
  active?: boolean;
  pinned?: boolean;
}

export interface WorkSnapshot {
  createdAt: number;
  activeTabId?: number;
  activeWindowId?: number;
  tabs: SavedTab[];
}

export interface BreakSession {
  id: string;
  status: SessionStatus;
  startedAt: number;
  endsAt: number;
  warningAt: number;
  warnedAt?: number;
  endedAt?: number;
  outcome?: SessionOutcome;
  settings: BreakifySettings;
  workSnapshot: WorkSnapshot;
  selectedBreakTabIds: number[];
  trackedBreakTabIds: number[];
  pendingConfirmation?: boolean;
}

export interface HistoryEntry {
  id: string;
  startedAt: number;
  endedAt: number;
  plannedMinutes: number;
  outcome: SessionOutcome;
  scheduleMethod: ScheduleMethod;
}

export interface HistorySummaryDay {
  date: string;
  total: number;
  onTime: number;
  late: number;
  early: number;
  cancelled: number;
}

export interface HistorySummary {
  daily: HistorySummaryDay[];
  weekly: {
    weekStart: string;
    total: number;
    onTime: number;
    onTimeRate: number;
  }[];
  currentStreakDays: number;
  onTimeRate: number;
}

export interface StartBreakInput {
  breakMinutes: number;
  softWarningMinutes: number;
  selectedBreakTabIds: number[];
  selectedReturnTabIds: number[];
}

export interface ExtendBreakInput {
  minutes: number;
}
