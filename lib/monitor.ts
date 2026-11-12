import { isRecent } from "./time.ts";
import { makeSummary } from "./summarize.ts";
import { DEFAULT_ACCOUNT_HANDLES } from "./account-storage.ts";

export type Account = {
  handle: string;
  name: string;
  avatarUrl: string | null;
  lastCheckedAt: string | null;
  error: string | null;
};

export type NewsItem = {
  id: string;
  handle: string;
  authorName: string;
  avatarUrl: string | null;
  text: string;
  quoteText: string | null;
  summary: string;
  summaryKind: "ai" | "excerpt";
  url: string;
  publishedAt: string;
  reportedAt: string;
};

export type RunResult = {
  checkedAt: string;
  newCount: number;
  duplicateCount: number;
  expiredCount: number;
  fetchedCount: number;
  failedCount: number;
  newIds: string[];
};

export type PublicState = {
  accounts: Account[];
  items: NewsItem[];
  lastRun: RunResult | null;
  aiEnabled: boolean;
};

export type SummaryResult = {
  summary: string;
  ids: string[];
};

type MonitorState = {
  accounts: Account[];
  accountsVersion: number;
  checkVersion: number;
  checkFailedOnly: boolean;
  items: NewsItem[];
  seenIds: Set<string>;
  lastRun: RunResult | null;
  inFlight: Promise<PublicState> | null;
};

type FxStatus = {
  id?: string;
  text?: string;
  created_at?: string;
  created_timestamp?: number;
  author?: { name?: string; screen_name?: string; avatar_url?: string };
  quote?: { type?: string; text?: string };
};

declare global {
  var newsMonitorState: MonitorState | undefined;
}

const state: MonitorState = globalThis.newsMonitorState ?? {
  accounts: DEFAULT_ACCOUNT_HANDLES.map((handle) => ({ handle, name: handle === "thsottiaux" ? "Tibo" : handle, avatarUrl: null, lastCheckedAt: null, error: null })),
  accountsVersion: 0,
  checkVersion: 0,
  checkFailedOnly: false,
  items: [],
  seenIds: new Set<string>(),
  lastRun: null,
  inFlight: null,
};
state.accountsVersion ??= 0;
state.checkVersion ??= 0;
state.checkFailedOnly ??= false;
globalThis.newsMonitorState = state;

export function publicState(): PublicState {
  state.items = state.items.filter((item) => isRecent(item.publishedAt));
  return {
    accounts: state.accounts.map((account) => ({ ...account })),
    items: state.items.map((item) => ({ ...item })),
    lastRun: state.lastRun ? { ...state.lastRun, newIds: [...state.lastRun.newIds] } : null,
    aiEnabled: Boolean(process.env.NVIDIA_API_KEY?.trim()),
  };
}

export function parseHandle(input: string): string | null {
  const trimmed = input.trim();
  let candidate = trimmed.replace(/^@/, "");
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (!["x.com", "www.x.com", "twitter.com", "www.twitter.com"].includes(url.hostname.toLowerCase())) return null;
      candidate = url.pathname.split("/").filter(Boolean)[0] ?? "";
    } catch {
      return null;
    }
  }
  return /^[A-Za-z0-9_]{1,15}$/.test(candidate) ? candidate.toLowerCase() : null;
}

export function addAccount(input: string): { ok: true } | { ok: false; error: string } {
  const handle = parseHandle(input);
  if (!handle) return { ok: false, error: "请输入有效的 X 用户名或个人主页链接。" };
  if (state.accounts.some((account) => account.handle === handle)) return { ok: false, error: "这个账号已在监控列表中。" };
  if (state.accounts.length >= 20) return { ok: false, error: "当前版本最多监控 20 个账号。" };
  state.accounts.push({ handle, name: handle, avatarUrl: null, lastCheckedAt: null, error: null });
  state.accountsVersion++;
  return { ok: true };
}

export function removeAccount(handle: string): boolean {
  const before = state.accounts.length;
  state.accounts = state.accounts.filter((account) => account.handle !== handle);
  if (state.accounts.length !== before) state.accountsVersion++;
  return state.accounts.length !== before;
}

export async function summarizeNews(ids: string[]): Promise<SummaryResult> {
  const requested = [...new Set(ids)].sort();
  const items = requested.map((id) => state.items.find((item) => item.id === id && isRecent(item.publishedAt)))
    .filter((item): item is NewsItem => item !== undefined);
  if (items.length !== requested.length) throw new Error("动态列表已变化，请刷新页面后重试。");
  const summary = await makeSummary(items.map(({ handle, text }) => ({ author: `@${handle}`, content: text })));
  return {
    summary,
    ids: items.map((item) => item.id),
  };
}

function excerpt(text: string): string {
  const clean = text.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
  return clean.length > 170 ? `${clean.slice(0, 167).trimEnd()}…` : clean || "此动态未包含可提取的文字。";
}

async function fetchAccount(handle: string): Promise<FxStatus[]> {
  const url = `https://api.fxtwitter.com/2/profile/${encodeURIComponent(handle)}/statuses?count=5&lang=es`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
      if (response.ok) {
        const data = await response.json();
        if (!Array.isArray(data.results)) throw new Error("接口没有返回动态列表");
        return data.results.slice(0, 5);
      }
      if (attempt === 1 || ![404, 429].includes(response.status) && response.status < 500) {
        throw new Error(`接口返回 ${response.status}`);
      }
    } catch (error) {
      if (attempt === 1) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("接口暂时不可用");
}

export function checkNews(failedOnly = false): Promise<PublicState> {
  if (state.inFlight) {
    return !failedOnly && !state.checkFailedOnly && state.checkVersion === state.accountsVersion
      ? state.inFlight
      : state.inFlight.then(() => checkNews(failedOnly));
  }

  const accounts = state.accounts.filter((account) => !failedOnly || account.error);
  if (accounts.length === 0) return Promise.resolve(publicState());

  state.checkVersion = state.accountsVersion;
  state.checkFailedOnly = failedOnly;
  state.inFlight = (async () => {
    const checkedAt = new Date().toISOString();
    const responses = await Promise.allSettled(accounts.map((account) => fetchAccount(account.handle)));
    const fresh: { id: string; handle: string; authorName: string; avatarUrl: string | null; text: string; quoteText: string | null; publishedAt: string }[] = [];
    let duplicateCount = 0;
    let expiredCount = 0;
    let fetchedCount = 0;
    let failedCount = 0;

    responses.forEach((result, index) => {
      const handle = accounts[index].handle;
      const account = state.accounts.find((item) => item.handle === handle);
      if (!account) return;
      if (result.status === "rejected") {
        failedCount++;
        if (account) account.error = result.reason instanceof Error ? result.reason.message : "获取失败";
        return;
      }
      if (account) {
        account.lastCheckedAt = checkedAt;
        account.error = null;
      }
      for (const status of result.value) {
        if (!status.id || !/^\d+$/.test(status.id) || !status.text) continue;
        fetchedCount++;
        const publishedTime = status.created_timestamp ? status.created_timestamp * 1000 : Date.parse(status.created_at ?? "");
        if (!Number.isFinite(publishedTime)) continue;
        const publishedAt = new Date(publishedTime).toISOString();
        if (!isRecent(publishedAt)) {
          expiredCount++;
          continue;
        }
        if (state.seenIds.has(status.id) || fresh.some((item) => item.id === status.id)) {
          duplicateCount++;
          continue;
        }
        if (account) {
          account.name = status.author?.name || account.name;
          account.avatarUrl = status.author?.avatar_url || account.avatarUrl;
        }
        fresh.push({
          id: status.id,
          handle,
          authorName: status.author?.name || handle,
          avatarUrl: status.author?.avatar_url || null,
          text: status.text,
          quoteText: status.quote?.type === "status" && status.quote.text ? status.quote.text : null,
          publishedAt,
        });
      }
    });

    const activeFresh = fresh.filter((item) => isRecent(item.publishedAt) && state.accounts.some((account) => account.handle === item.handle));
    const newItems: NewsItem[] = activeFresh.filter((item) => isRecent(item.publishedAt) && state.accounts.some((account) => account.handle === item.handle)).map((item) => ({
      ...item,
      summary: excerpt(`${item.text}${item.quoteText ? ` 引用：${item.quoteText}` : ""}`),
      summaryKind: "excerpt",
      url: `https://x.com/${item.handle}/status/${item.id}`,
      reportedAt: checkedAt,
    }));
    newItems.forEach((item) => state.seenIds.add(item.id));
    state.items = [...newItems, ...state.items].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, 100);
    state.lastRun = { checkedAt, newCount: newItems.length, duplicateCount, expiredCount, fetchedCount, failedCount, newIds: newItems.map((item) => item.id) };
    return publicState();
  })().finally(() => { state.inFlight = null; });

  return state.inFlight;
}
