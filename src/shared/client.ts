import type { BreakifyMessage, BreakifyResponse } from "./messages";

export async function sendBreakifyMessage(message: BreakifyMessage): Promise<BreakifyResponse> {
  return chrome.runtime.sendMessage(message);
}
