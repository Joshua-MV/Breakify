import type { BreakifySettings, BreakSession, HistoryEntry, StartBreakInput } from "./types";

export type BreakifyMessage =
  | { type: "GET_STATE" }
  | { type: "START_BREAK"; payload: StartBreakInput }
  | { type: "END_BREAK_EARLY" }
  | { type: "CONFIRM_CLOSE_BREAK_TABS" }
  | { type: "KEEP_BREAK_TABS" }
  | { type: "SAVE_SETTINGS"; payload: BreakifySettings }
  | { type: "CLEAR_HISTORY" }
  | { type: "GET_CURRENT_TABS" };

export interface BreakifyStateResponse {
  settings: BreakifySettings;
  activeSession?: BreakSession;
  history: HistoryEntry[];
}

export interface CurrentTabOption {
  id: number;
  title: string;
  url: string;
  active: boolean;
}

export type BreakifyResponse =
  | { ok: true; state: BreakifyStateResponse }
  | { ok: true; tabs: CurrentTabOption[] }
  | { ok: true }
  | { ok: false; error: string };
