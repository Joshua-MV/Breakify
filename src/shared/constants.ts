export const DEFAULT_BREAK_MINUTES = 0;
export const DEFAULT_SOFT_WARNING_MINUTES = 2;
export const HISTORY_RETENTION_DAYS = 90;
export const ALARM_BREAK_WARNING = "breakify:break-warning";
export const ALARM_BREAK_END = "breakify:break-end";
export const NOTIFICATION_WARNING = "breakify-warning";
export const NOTIFICATION_CONFIRM_END = "breakify-confirm-end";

export const STORAGE_KEYS = {
  settings: "breakify:settings",
  activeSession: "breakify:active-session",
  history: "breakify:history",
  pendingConfirmation: "breakify:pending-confirmation"
} as const;
