import { HISTORY_RETENTION_DAYS, STORAGE_KEYS } from "../shared/constants";
import { mergeSettings } from "../core/settings";
import type { BreakifySettings, BreakSession, HistoryEntry } from "../shared/types";

function getLocal<T>(key: string): Promise<T | undefined> {
  return chrome.storage.local.get(key).then((result) => result[key] as T | undefined);
}

function setLocal(key: string, value: unknown): Promise<void> {
  return chrome.storage.local.set({ [key]: value });
}

export async function getSettings(): Promise<BreakifySettings> {
  return mergeSettings(await getLocal<Partial<BreakifySettings>>(STORAGE_KEYS.settings));
}

export async function saveSettings(settings: BreakifySettings): Promise<void> {
  await setLocal(STORAGE_KEYS.settings, mergeSettings(settings));
}

export async function getActiveSession(): Promise<BreakSession | undefined> {
  return getLocal<BreakSession>(STORAGE_KEYS.activeSession);
}

export async function saveActiveSession(session: BreakSession | undefined): Promise<void> {
  if (!session) {
    await chrome.storage.local.remove(STORAGE_KEYS.activeSession);
    return;
  }
  await setLocal(STORAGE_KEYS.activeSession, session);
}

export async function getHistory(): Promise<HistoryEntry[]> {
  return (await getLocal<HistoryEntry[]>(STORAGE_KEYS.history)) ?? [];
}

export async function addHistoryEntry(entry: HistoryEntry): Promise<void> {
  const cutoff = Date.now() - HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const history = (await getHistory()).filter((item) => item.startedAt >= cutoff && item.id !== entry.id);
  await setLocal(STORAGE_KEYS.history, [entry, ...history]);
}

export async function clearHistory(): Promise<void> {
  await setLocal(STORAGE_KEYS.history, []);
}
