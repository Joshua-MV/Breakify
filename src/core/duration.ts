export function minutesToSeconds(minutes: number): number {
  return Math.max(0, Math.round(minutes * 60));
}

export function secondsToMinutes(seconds: number): number {
  return Math.max(0, seconds) / 60;
}

export function splitSeconds(totalSeconds: number): { hours: number; minutes: number; seconds: number } {
  const normalized = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);
  const seconds = normalized % 60;
  return { hours, minutes, seconds };
}

export function combineDuration(parts: { hours: number; minutes: number; seconds: number }): number {
  return Math.max(0, Math.round(parts.hours) * 3600 + Math.round(parts.minutes) * 60 + Math.round(parts.seconds));
}
