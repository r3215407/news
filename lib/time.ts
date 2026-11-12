export const RECENT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export function isRecent(publishedAt: string, now = Date.now()): boolean {
  const publishedTime = Date.parse(publishedAt);
  return Number.isFinite(publishedTime) && publishedTime >= now - RECENT_WINDOW_MS && publishedTime <= now;
}
