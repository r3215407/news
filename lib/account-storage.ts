export const DEFAULT_ACCOUNT_HANDLES = ["thsottiaux", "geminiapp", "openai", "anthropicai", "grok", "thedankoe"] as const;
export const ACCOUNTS_STORAGE_KEY = "news-monitor.accounts.v2";
const LEGACY_ACCOUNTS_STORAGE_KEY = "news-monitor.accounts.v1";

export function readSavedAccounts(storage: Pick<Storage, "getItem">): string[] | null {
  const current = storage.getItem(ACCOUNTS_STORAGE_KEY);
  const raw = current ?? storage.getItem(LEGACY_ACCOUNTS_STORAGE_KEY);
  if (raw === null) return null;

  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return null;
    const handles = [...new Set(value.filter((item): item is string =>
      typeof item === "string" && /^[A-Za-z0-9_]{1,15}$/.test(item)
    ).map((item) => item.toLowerCase()))];
    if (current !== null || handles.length === 0) return handles.slice(0, 20);
    return [...new Set([...handles, ...DEFAULT_ACCOUNT_HANDLES])].slice(0, 20);
  } catch {
    return null;
  }
}

export function writeSavedAccounts(storage: Pick<Storage, "setItem">, handles: string[]): void {
  storage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(handles));
}
