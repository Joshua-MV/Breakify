import type { ScheduleMethod, SchedulePreset } from "../shared/types";

export const schedulePresets: Record<ScheduleMethod, SchedulePreset> = {
  pomodoro: {
    method: "pomodoro",
    label: "Pomodoro",
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    cyclesBeforeLongBreak: 4
  },
  "fifty-two-seventeen": {
    method: "fifty-two-seventeen",
    label: "52/17",
    focusMinutes: 52,
    shortBreakMinutes: 17
  },
  ultradian: {
    method: "ultradian",
    label: "Ultradian",
    focusMinutes: 90,
    shortBreakMinutes: 20
  },
  custom: {
    method: "custom",
    label: "Custom",
    focusMinutes: 45,
    shortBreakMinutes: 10,
    longBreakMinutes: 25,
    cyclesBeforeLongBreak: 3
  }
};

export function getSchedulePreset(method: ScheduleMethod, custom?: SchedulePreset): SchedulePreset {
  return method === "custom" && custom ? custom : schedulePresets[method];
}

export function getDefaultBreakMinutes(method: ScheduleMethod, custom?: SchedulePreset): number {
  return getSchedulePreset(method, custom).shortBreakMinutes;
}

export function minutesToMs(minutes: number): number {
  return Math.max(0, Math.round(minutes * 60 * 1000));
}
