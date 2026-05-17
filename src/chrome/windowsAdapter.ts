export async function openReminderWindow(): Promise<void> {
  const url = chrome.runtime.getURL("reminder.html");
  const existing = await chrome.windows.getAll({ populate: true });
  const alreadyOpen = existing.some((window) => window.tabs?.some((tab) => tab.url === url));

  if (alreadyOpen) return;

  await chrome.windows.create({
    url,
    type: "popup",
    width: 380,
    height: 300,
    focused: true
  });
}
