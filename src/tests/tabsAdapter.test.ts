import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureWorkSnapshot, closeTabs, getInitialBreakTabIds, restoreWorkTabs } from "../chrome/tabsAdapter";
import type { BreakSession } from "../shared/types";

const session = {
  id: "s1",
  status: "active",
  startedAt: 0,
  endsAt: 100,
  warningAt: 50,
  settings: {} as BreakSession["settings"],
  selectedBreakTabIds: [],
  trackedBreakTabIds: [],
  workSnapshot: {
    createdAt: 0,
    activeTabId: 1,
    activeWindowId: 1,
    tabs: [
      { id: 1, windowId: 1, index: 0, url: "https://work.example", active: true, pinned: false },
      { id: 2, windowId: 1, index: 1, url: "https://missing.example", active: false, pinned: true }
    ]
  }
} satisfies BreakSession;

describe("tabs adapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("closes tracked break tabs", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("chrome", { tabs: { remove } });

    await closeTabs([4, 4, 5]);

    expect(remove).toHaveBeenCalledWith([4, 5]);
  });

  it("focuses existing work tabs and reopens missing tabs", async () => {
    const query = vi.fn().mockResolvedValue([{ id: 1, windowId: 1, pinned: false }]);
    const create = vi.fn().mockResolvedValue({ id: 9, windowId: 1 });
    const update = vi.fn().mockResolvedValue(undefined);
    const windowsUpdate = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("chrome", {
      tabs: { query, create, update },
      windows: { update: windowsUpdate }
    });

    await restoreWorkTabs(session);

    expect(create).toHaveBeenCalledWith({ url: "https://missing.example", active: false, pinned: true, index: 1 });
    expect(update).toHaveBeenCalledWith(1, { active: true });
    expect(windowsUpdate).toHaveBeenCalledWith(1, { focused: true });
  });

  it("excludes initial break tabs from the work snapshot", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: 2, windowId: 1, active: true }])
      .mockResolvedValueOnce([
        { id: 1, windowId: 1, index: 0, url: "https://work.example", active: false, pinned: false },
        { id: 2, windowId: 1, index: 1, url: "https://break.example", active: true, pinned: false }
      ]);
    vi.stubGlobal("chrome", { tabs: { query } });

    const snapshot = await captureWorkSnapshot([2]);

    expect(snapshot.tabs.map((tab) => tab.id)).toEqual([1]);
    expect(snapshot.activeTabId).toBe(1);
  });

  it("uses selected return tabs when they are provided", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: 1, windowId: 1, active: true }])
      .mockResolvedValueOnce([
        { id: 1, windowId: 1, index: 0, url: "https://work.example", active: true, pinned: false },
        { id: 2, windowId: 1, index: 1, url: "https://notes.example", active: false, pinned: false },
        { id: 3, windowId: 1, index: 2, url: "https://break.example", active: false, pinned: false }
      ]);
    vi.stubGlobal("chrome", { tabs: { query } });

    const snapshot = await captureWorkSnapshot([3], [2]);

    expect(snapshot.tabs.map((tab) => tab.id)).toEqual([2]);
    expect(snapshot.activeTabId).toBe(2);
  });

  it("finds already-open tabs that match selected ids or allowlist rules", async () => {
    const query = vi.fn().mockResolvedValue([
      { id: 1, url: "https://work.example" },
      { id: 2, url: "https://youtube.com/watch?v=1" },
      { id: 3, url: "https://other.example" }
    ]);
    vi.stubGlobal("chrome", { tabs: { query } });

    const ids = await getInitialBreakTabIds([3], [{ id: "r1", type: "domain", value: "youtube.com" }]);

    expect(ids).toEqual([2, 3]);
  });
});
