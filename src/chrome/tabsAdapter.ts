import type { CurrentTabOption } from "../shared/messages";
import type { AllowlistRule, BreakSession, SavedTab, WorkSnapshot } from "../shared/types";
import { matchesAllowlist } from "../core/allowlist";

function toSavedTab(tab: chrome.tabs.Tab): SavedTab | undefined {
  if (!tab.url) return undefined;
  return {
    id: tab.id,
    windowId: tab.windowId,
    index: tab.index,
    url: tab.url,
    title: tab.title,
    active: tab.active,
    pinned: tab.pinned
  };
}

export async function getCurrentTabs(): Promise<CurrentTabOption[]> {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  return tabs
    .filter((tab): tab is chrome.tabs.Tab & { id: number; url: string } => typeof tab.id === "number" && Boolean(tab.url))
    .map((tab) => ({
      id: tab.id,
      title: tab.title || tab.url,
      url: tab.url,
      active: tab.active
    }));
}

export async function getInitialBreakTabIds(selectedBreakTabIds: number[], allowlistRules: AllowlistRule[]): Promise<number[]> {
  const tabs = await chrome.tabs.query({});
  const ids = tabs
    .filter((tab) => typeof tab.id === "number")
    .filter((tab) => selectedBreakTabIds.includes(tab.id as number) || matchesAllowlist(tab.url, allowlistRules))
    .map((tab) => tab.id as number);

  return [...new Set(ids)];
}

export async function captureWorkSnapshot(excludedTabIds: number[] = [], preferredTabIds: number[] = []): Promise<WorkSnapshot> {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabs = await chrome.tabs.query({});
  const excluded = new Set(excludedTabIds);
  const preferred = new Set(preferredTabIds);
  const baseWorkTabs = tabs.filter((tab) => typeof tab.id !== "number" || !excluded.has(tab.id));
  const preferredWorkTabs = preferred.size ? baseWorkTabs.filter((tab) => typeof tab.id === "number" && preferred.has(tab.id)) : [];
  const workTabs = preferredWorkTabs.length ? preferredWorkTabs : baseWorkTabs;
  const activeWorkTab = workTabs.find((tab) => tab.active) ?? workTabs[0];
  const activeTabInSnapshot = typeof activeTab?.id === "number" && workTabs.some((tab) => tab.id === activeTab.id);

  return {
    createdAt: Date.now(),
    activeTabId: activeTabInSnapshot ? activeTab?.id : activeWorkTab?.id,
    activeWindowId: activeTabInSnapshot ? activeTab?.windowId : activeWorkTab?.windowId,
    tabs: workTabs.map(toSavedTab).filter((tab): tab is SavedTab => Boolean(tab))
  };
}

export async function closeTabs(tabIds: number[]): Promise<void> {
  const unique = [...new Set(tabIds)].filter((id) => Number.isInteger(id));
  if (!unique.length) return;
  try {
    await chrome.tabs.remove(unique);
  } catch {
    for (const id of unique) {
      try {
        await chrome.tabs.remove(id);
      } catch {
        // Tab may have already been closed.
      }
    }
  }
}

export async function restoreWorkTabs(session: BreakSession): Promise<void> {
  const existingTabs = await chrome.tabs.query({});
  const existingById = new Map(existingTabs.filter((tab) => typeof tab.id === "number").map((tab) => [tab.id as number, tab]));
  let tabToFocus: number | undefined;
  let windowToFocus: number | undefined;

  for (const saved of session.workSnapshot.tabs) {
    const existing = typeof saved.id === "number" ? existingById.get(saved.id) : undefined;
    if (existing) {
      if (saved.pinned !== undefined && existing.pinned !== saved.pinned) {
        await chrome.tabs.update(existing.id, { pinned: saved.pinned });
      }
      if (saved.active || saved.id === session.workSnapshot.activeTabId) {
        tabToFocus = existing.id;
        windowToFocus = existing.windowId;
      }
      continue;
    }

    const created = await chrome.tabs.create({
      url: saved.url,
      active: false,
      pinned: saved.pinned,
      index: saved.index
    });
    if (saved.active || saved.id === session.workSnapshot.activeTabId) {
      tabToFocus = created.id;
      windowToFocus = created.windowId;
    }
  }

  if (typeof tabToFocus === "number") {
    await chrome.tabs.update(tabToFocus, { active: true });
  }
  if (typeof windowToFocus === "number") {
    await chrome.windows.update(windowToFocus, { focused: true });
  }
}
