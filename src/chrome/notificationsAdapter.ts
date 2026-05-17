import { NOTIFICATION_CONFIRM_END, NOTIFICATION_WARNING } from "../shared/constants";

export async function showWarningNotification(minutesLeft: number): Promise<void> {
  await chrome.notifications.create(NOTIFICATION_WARNING, {
    type: "basic",
    iconUrl: "icons/icon-128.png",
    title: "Breakify",
    priority: 2,
    message: `Your break wraps up in about ${Math.max(1, minutesLeft)} minute${minutesLeft === 1 ? "" : "s"}.`
  });
}

export async function showConfirmCloseNotification(): Promise<void> {
  await chrome.notifications.create(NOTIFICATION_CONFIRM_END, {
    type: "basic",
    iconUrl: "icons/icon-128.png",
    title: "Ready to return?",
    priority: 2,
    message: "Your break is done. Open Breakify to close break tabs and restore your work."
  });
}

export async function showRestoredNotification(): Promise<void> {
  await chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon-128.png",
    title: "You are back in it",
    priority: 1,
    message: "Your work tabs are ready. Nice job returning to yourself."
  });
}
