import type { HistoryEntry, HistorySummary, HistorySummaryDay } from "../shared/types";

function dateKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function weekStartKey(timestamp: number): string {
  const date = new Date(timestamp);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

export function summarizeHistory(entries: HistoryEntry[], now = Date.now()): HistorySummary {
  const days = new Map<string, HistorySummaryDay>();
  const weeks = new Map<string, { weekStart: string; total: number; onTime: number; onTimeRate: number }>();

  for (const entry of entries) {
    const key = dateKey(entry.startedAt);
    const day = days.get(key) ?? { date: key, total: 0, onTime: 0, late: 0, early: 0, cancelled: 0 };
    day.total += 1;
    if (entry.outcome === "on-time") day.onTime += 1;
    if (entry.outcome === "late") day.late += 1;
    if (entry.outcome === "early") day.early += 1;
    if (entry.outcome === "cancelled") day.cancelled += 1;
    days.set(key, day);

    const weekKey = weekStartKey(entry.startedAt);
    const week = weeks.get(weekKey) ?? { weekStart: weekKey, total: 0, onTime: 0, onTimeRate: 0 };
    week.total += 1;
    if (entry.outcome === "on-time") week.onTime += 1;
    week.onTimeRate = week.total ? Math.round((week.onTime / week.total) * 100) : 0;
    weeks.set(weekKey, week);
  }

  const total = entries.length;
  const onTime = entries.filter((entry) => entry.outcome === "on-time").length;

  return {
    daily: [...days.values()].sort((a, b) => b.date.localeCompare(a.date)),
    weekly: [...weeks.values()].sort((a, b) => b.weekStart.localeCompare(a.weekStart)),
    currentStreakDays: getCurrentStreakDays(entries, now),
    onTimeRate: total ? Math.round((onTime / total) * 100) : 0
  };
}

export function getCurrentStreakDays(entries: HistoryEntry[], now = Date.now()): number {
  const successfulDays = new Set(entries.filter((entry) => entry.outcome === "on-time").map((entry) => dateKey(entry.startedAt)));
  let streak = 0;
  const cursor = new Date(dateKey(now));

  while (successfulDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}
