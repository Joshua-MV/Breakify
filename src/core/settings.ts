import { DEFAULT_BREAK_MINUTES, DEFAULT_SOFT_WARNING_MINUTES } from "../shared/constants";
import type { BreakifySettings } from "../shared/types";

export const defaultSettings: BreakifySettings = {
  defaultBreakMinutes: DEFAULT_BREAK_MINUTES,
  softWarningMinutes: DEFAULT_SOFT_WARNING_MINUTES,
  breakEndBehavior: "ask-first",
  theme: "light",
  scheduleMethod: "pomodoro",
  selectedBreakTabIds: [],
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
  return {
    ...defaultSettings,
    ...settings,
    selectedBreakTabIds: settings?.selectedBreakTabIds ?? defaultSettings.selectedBreakTabIds,
    allowlistRules: settings?.allowlistRules ?? defaultSettings.allowlistRules,
    customSchedule: {
      ...defaultSettings.customSchedule,
      ...settings?.customSchedule
    }
  };
}
