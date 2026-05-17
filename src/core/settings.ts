import { DEFAULT_BREAK_MINUTES, DEFAULT_SOFT_WARNING_MINUTES } from "../shared/constants";
import type { BreakifySettings, ScheduleMethod } from "../shared/types";

export const defaultSettings: BreakifySettings = {
  defaultBreakMinutes: DEFAULT_BREAK_MINUTES,
  softWarningMinutes: DEFAULT_SOFT_WARNING_MINUTES,
  breakEndBehavior: "ask-first",
  theme: "light",
  scheduleMethod: "pomodoro",
  selectedBreakTabIds: [],
  selectedReturnTabIds: [],
  allowlistRules: [],
  customSchedule: {
    method: "custom",
    label: "Custom rhythm",
    focusMinutes: 45,
    shortBreakMinutes: 10,
    longBreakMinutes: 25,
    cyclesBeforeLongBreak: 3
  }
};

export function mergeSettings(settings?: Partial<BreakifySettings>): BreakifySettings {
  const scheduleMethod = isScheduleMethod(settings?.scheduleMethod) ? settings.scheduleMethod : defaultSettings.scheduleMethod;

  return {
    ...defaultSettings,
    ...settings,
    scheduleMethod,
    selectedBreakTabIds: settings?.selectedBreakTabIds ?? defaultSettings.selectedBreakTabIds,
    selectedReturnTabIds: settings?.selectedReturnTabIds ?? defaultSettings.selectedReturnTabIds,
    allowlistRules: settings?.allowlistRules ?? defaultSettings.allowlistRules,
    customSchedule: {
      ...defaultSettings.customSchedule,
      ...settings?.customSchedule
    }
  };
}

function isScheduleMethod(value: unknown): value is ScheduleMethod {
  return value === "pomodoro" || value === "fifty-two-seventeen" || value === "ultradian" || value === "custom";
}
