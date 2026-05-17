import { describe, expect, it } from "vitest";
import { createAllowlistRule, matchesAllowlist } from "../core/allowlist";
import { summarizeHistory } from "../core/history";
import { getDefaultBreakMinutes } from "../core/schedule";
import { completeSession, createBreakSession, markSessionWarned, trackBreakTab } from "../core/session";
import { defaultSettings } from "../core/settings";
import type { HistoryEntry, WorkSnapshot } from "../shared/types";

const snapshot: WorkSnapshot = {
  createdAt: 1,
  activeTabId: 1,
  activeWindowId: 1,
  tabs: [{ id: 1, windowId: 1, index: 0, url: "https://docs.example.com", active: true }]
};

describe("schedule service", () => {
  it("returns expected default break lengths", () => {
    expect(getDefaultBreakMinutes("pomodoro")).toBe(5);
    expect(getDefaultBreakMinutes("fifty-two-seventeen")).toBe(17);
    expect(getDefaultBreakMinutes("ultradian")).toBe(20);
  });
});

describe("allowlist service", () => {
  it("matches domains and nested subdomains", () => {
    const rules = [createAllowlistRule("youtube.com", "domain")];
    expect(matchesAllowlist("https://youtube.com/watch?v=1", rules)).toBe(true);
    expect(matchesAllowlist("https://music.youtube.com", rules)).toBe(true);
    expect(matchesAllowlist("https://example.com", rules)).toBe(false);
  });

  it("matches URL prefixes", () => {
    const rules = [createAllowlistRule("https://example.com/break", "url")];
    expect(matchesAllowlist("https://example.com/break/video", rules)).toBe(true);
    expect(matchesAllowlist("https://example.com/work", rules)).toBe(false);
  });
});

describe("session service", () => {
  it("creates warning and end times from user durations", () => {
    const session = createBreakSession({
      settings: defaultSettings,
      workSnapshot: snapshot,
      breakMinutes: 15,
      softWarningMinutes: 2,
      selectedBreakTabIds: [10],
      now: 1_000
    });

    expect(session.endsAt).toBe(901_000);
    expect(session.warningAt).toBe(781_000);
    expect(session.trackedBreakTabIds).toEqual([10]);
  });

  it("transitions through warning and completion states", () => {
    const session = createBreakSession({
      settings: defaultSettings,
      workSnapshot: snapshot,
      breakMinutes: 1,
      softWarningMinutes: 1,
      selectedBreakTabIds: [],
      now: 10
    });
    const warned = markSessionWarned(session, 20);
    const tracked = trackBreakTab(warned, 44);
    const completed = completeSession(tracked, 60_010);

    expect(warned.status).toBe("warning");
    expect(tracked.trackedBreakTabIds).toContain(44);
    expect(completed.outcome).toBe("on-time");
  });
});

describe("history service", () => {
  it("summarizes daily and weekly consistency", () => {
    const entries: HistoryEntry[] = [
      { id: "1", startedAt: Date.UTC(2026, 0, 1), endedAt: Date.UTC(2026, 0, 1, 0, 10), plannedMinutes: 10, outcome: "on-time", scheduleMethod: "pomodoro" },
      { id: "2", startedAt: Date.UTC(2026, 0, 1, 2), endedAt: Date.UTC(2026, 0, 1, 2, 20), plannedMinutes: 10, outcome: "late", scheduleMethod: "pomodoro" },
      { id: "3", startedAt: Date.UTC(2026, 0, 2), endedAt: Date.UTC(2026, 0, 2, 0, 10), plannedMinutes: 10, outcome: "on-time", scheduleMethod: "pomodoro" }
    ];

    const summary = summarizeHistory(entries, Date.UTC(2026, 0, 2, 12));

    expect(summary.onTimeRate).toBe(67);
    expect(summary.daily[0].date).toBe("2026-01-02");
    expect(summary.daily[1].total).toBe(2);
    expect(summary.currentStreakDays).toBe(2);
  });
});
