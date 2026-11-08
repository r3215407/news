export const SUMMARIES_STORAGE_KEY = "news-monitor.summaries.v3";

export type SavedSummaries = Record<string, string>;

export function summaryKey(ids: string[]): string {
  return [...new Set(ids)].sort().join(",");
}

export function readSavedSummaries(storage: Pick<Storage, "getItem">): SavedSummaries {
  try {
    const value: unknown = JSON.parse(storage.getItem(SUMMARIES_STORAGE_KEY) ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([ids, summary]) =>
      /^\d+(,\d+)*$/.test(ids) && typeof summary === "string" && summary.trim().length > 0
    ).map(([ids, summary]) => [ids, (summary as string).trim()]));
  } catch {
    return {};
  }
}

export function writeSavedSummaries(storage: Pick<Storage, "setItem">, summaries: SavedSummaries): void {
  const recent = Object.entries(summaries).slice(-40);
  storage.setItem(SUMMARIES_STORAGE_KEY, JSON.stringify(Object.fromEntries(recent)));
}
