"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Activity, ArrowUpRight, ChevronDown, Inbox, LoaderCircle, Plus, Radio, RefreshCw, Search, Sparkles, X } from "lucide-react";
import type { Account, NewsItem, PublicState, SummaryResult } from "@/lib/monitor";
import { readSavedAccounts, writeSavedAccounts } from "@/lib/account-storage";
import { readSavedSummaries, summaryKey, writeSavedSummaries, type SavedSummaries } from "@/lib/summary-storage";
import { parseSummaryCitations } from "@/lib/summary-citations";
import { isRecent, RECENT_WINDOW_MS } from "@/lib/time";

const EMPTY: PublicState = { accounts: [], items: [], lastRun: null, aiEnabled: false };

function saveAccounts(accounts: Account[]): boolean {
  try {
    writeSavedAccounts(window.localStorage, accounts.map((account) => account.handle));
    return true;
  } catch {
    return false;
  }
}

async function restoreAccounts(initial: PublicState, handles: string[]): Promise<PublicState> {
  let current = initial;
  for (const handle of handles) {
    if (current.accounts.some((account) => account.handle === handle)) continue;
    try {
      current = await api<PublicState>("/api/accounts", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle }),
      });
    } catch (error) {
      current = await api<PublicState>("/api/state");
      if (!current.accounts.some((account) => account.handle === handle)) throw error;
    }
  }
  for (const account of current.accounts) {
    if (handles.includes(account.handle)) continue;
    try {
      current = await api<PublicState>("/api/accounts", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle: account.handle }),
      });
    } catch (error) {
      current = await api<PublicState>("/api/state");
      if (current.accounts.some((item) => item.handle === account.handle)) throw error;
    }
  }
  return current;
}

function dateTime(value: string | null, short = false) {
  if (!value) return "尚未检查";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(short ? {} : { year: "numeric" }),
    hour12: false,
  }).format(new Date(value));
}

function timeOnly(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { cache: "no-store", ...init });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `请求失败（${response.status}）`);
  return data as T;
}

function AccountAvatar({ account, size = "normal" }: { account: Pick<Account, "name" | "avatarUrl">; size?: "normal" | "small" }) {
  return account.avatarUrl ? (
    <img className={`avatar avatar-${size}`} src={account.avatarUrl} alt="" referrerPolicy="no-referrer" />
  ) : (
    <span className={`avatar avatar-${size} avatar-fallback`} aria-hidden="true">{account.name.slice(0, 1).toUpperCase()}</span>
  );
}

function NewsRow({ item, isLatest }: { item: NewsItem; isLatest: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <article className="news-row">
      <div className="news-time"><span className="time-dot" />{timeOnly(item.publishedAt)}</div>
      <div className="news-body">
        <div className="news-meta">
          <div className="news-author"><AccountAvatar account={{ name: item.authorName, avatarUrl: item.avatarUrl }} size="small" /><strong>{item.authorName}</strong><span>@{item.handle}</span></div>
          <div className="news-tags">
            {isLatest && <span className="tag tag-new">本轮新增</span>}
          </div>
        </div>
        <p className="news-original">{item.text}</p>
        <div className="news-actions">
          <button className="text-action" type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
            {expanded ? "收起原文" : "查看原文"}<ChevronDown size={14} className={expanded ? "rotated" : ""} />
          </button>
          <a className="text-action" href={item.url} target="_blank" rel="noopener noreferrer">前往 X <ArrowUpRight size={15} /></a>
          <span className="published-date">{dateTime(item.publishedAt, true)}</span>
        </div>
        {expanded && <div className="original-text"><p>{item.text}</p>{item.quoteText && <blockquote>{item.quoteText}</blockquote>}</div>}
      </div>
    </article>
  );
}

export default function Home() {
  const [data, setData] = useState<PublicState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [checking, setChecking] = useState(false);
  const [autoCheck, setAutoCheck] = useState(true);
  const [selected, setSelected] = useState("all");
  const [accountInput, setAccountInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState("");
  const [savedSummaries, setSavedSummaries] = useState<SavedSummaries>({});
  const [generating, setGenerating] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);

  const check = useCallback(async (failedOnly = false) => {
    setChecking(true);
    setError(null);
    try { setData(await api<PublicState>(failedOnly ? "/api/check?failedOnly=1" : "/api/check", { method: "POST" })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "检查失败，请稍后重试。"); }
    finally { setChecking(false); }
  }, []);

  useEffect(() => {
    let alive = true;
    async function initialize() {
      try {
        let current = await api<PublicState>("/api/state");
        if (!alive) return;
        let storage: Storage | null = null;
        try { storage = window.localStorage; } catch { /* Browser storage can be disabled. */ }
        if (storage) {
          setSavedSummaries(readSavedSummaries(storage));
          const saved = readSavedAccounts(storage);
          if (saved !== null) current = await restoreAccounts(current, saved);
          if (!saveAccounts(current.accounts)) setStorageError("浏览器无法保存账号，刷新后可能需要重新添加。");
        } else {
          setStorageError("浏览器禁止本地存储，账号仅保留在当前服务中。");
        }
        if (!alive) return;
        setData(current);
        setLoading(false);
        setInitialized(true);
        void check();
      } catch (cause) {
        if (alive) {
          try {
            const latest = await api<PublicState>("/api/state");
            if (alive) setData(latest);
          } catch { /* Keep the recovery error visible. */ }
          if (!alive) return;
          setError(cause instanceof Error ? cause.message : "账号恢复失败，请刷新重试。");
          setLoading(false);
        }
      }
    }
    void initialize();
    return () => { alive = false; };
  }, [check]);

  useEffect(() => {
    if (!autoCheck || !initialized) return;
    const timer = window.setInterval(() => { void check(); }, 60_000);
    return () => window.clearInterval(timer);
  }, [autoCheck, check, initialized]);

  useEffect(() => {
    const nextExpiry = data.items.reduce((earliest, item) => {
      const expiresAt = Date.parse(item.publishedAt) + RECENT_WINDOW_MS;
      return expiresAt > now ? Math.min(earliest, expiresAt) : earliest;
    }, Infinity);
    if (!Number.isFinite(nextExpiry)) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(1, nextExpiry - Date.now() + 1));
    return () => window.clearTimeout(timer);
  }, [data.items, now]);

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdding(true);
    setError(null);
    try {
      const next = await api<PublicState>("/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle: accountInput }) });
      setData(next);
      if (!saveAccounts(next.accounts)) setStorageError("浏览器无法保存账号，刷新后可能需要重新添加。");
      else setStorageError(null);
      setAccountInput("");
      setShowAdd(false);
      void check();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "添加失败"); }
    finally { setAdding(false); }
  };

  const remove = async (handle: string) => {
    setError(null);
    try {
      const next = await api<PublicState>("/api/accounts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle }) });
      setData(next);
      if (!saveAccounts(next.accounts)) setStorageError("浏览器无法保存账号变更。");
      else setStorageError(null);
      if (selected === handle) setSelected("all");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "移除失败"); }
  };

  const recentItems = useMemo(() => data.items.filter((item) => isRecent(item.publishedAt, now)), [data.items, now]);
  const visibleItems = useMemo(() => recentItems.filter((item) =>
    (selected === "all" || item.handle === selected) &&
    (!query || `${item.text} ${item.handle}`.toLowerCase().includes(query.toLowerCase()))
  ), [recentItems, selected, query]);
  const summarySources = useMemo(() => [...visibleItems].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0), [visibleItems]);
  const currentSummaryKey = summaryKey(summarySources.map((item) => item.id));
  const currentSummary = savedSummaries[currentSummaryKey];

  const generateSummary = async () => {
    const ids = visibleItems.map((item) => item.id);
    if (!ids.length || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await api<SummaryResult>("/api/summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const merged = { ...savedSummaries, [summaryKey(result.ids)]: result.summary };
      setSavedSummaries(merged);
      try {
        writeSavedSummaries(window.localStorage, merged);
        setStorageError(null);
      } catch {
        setStorageError("浏览器无法保存摘要，刷新后可能需要重新生成。");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "摘要生成失败，请重试。");
    } finally {
      setGenerating(false);
    }
  };
  const latestIds = new Set(data.lastRun?.newIds ?? []);
  const accountLabel = selected === "all" ? "全部动态" : `@${selected} 的动态`;
  const activeAccounts = data.accounts.filter((account) => !account.error).length;
  const hasAccountError = data.accounts.some((account) => account.error);
  const mobileStatusLabel = loading ? "连接中" : !initialized ? "连接失败" : hasAccountError ? "部分异常" : autoCheck ? "监控中" : "已暂停";
  const runMessage = !data.lastRun
    ? "首次检查后，这里会显示本轮结果。"
    : data.accounts.length === 0
      ? "暂无监控账号，添加后开始检查。"
      : data.lastRun.failedCount === data.accounts.length
        ? "本轮无法获取动态，请检查账号状态并重试。"
        : data.lastRun.failedCount > 0
          ? `已获取可用账号的动态；${data.lastRun.failedCount} 个账号获取失败。`
          : data.lastRun.newCount
            ? `发现 ${data.lastRun.newCount} 条尚未播报的动态，已加入简报。`
            : data.lastRun.expiredCount && !data.lastRun.duplicateCount
              ? "前五条动态都已超过 3 天，已跳过。"
              : data.lastRun.expiredCount
                ? `近 3 天的动态均已播报；另有 ${data.lastRun.expiredCount} 条过期动态已跳过。`
              : !data.lastRun.fetchedCount
                ? "本轮没有获取到动态。"
            : "前五条动态均已播报，无需重复处理。";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><Radio size={23} strokeWidth={2.25} /></span><div><strong>讯哨</strong><small>NEWS MONITOR</small></div><span className={`mobile-status ${!loading && (!initialized || hasAccountError) ? "has-error" : ""}`}><i />{mobileStatusLabel}</span></div>
        <div className="sidebar-section desktop-work-section">
          <div className="section-caption">工作台</div>
          <button className={`side-link ${selected === "all" ? "active" : ""}`} type="button" aria-pressed={selected === "all"} onClick={() => setSelected("all")}><Inbox size={18} />全部动态<span>{recentItems.length}</span></button>
        </div>
        <div className="sidebar-section accounts-section">
          <div className="section-caption caption-row"><span>监控账号 <b>{data.accounts.length}</b></span><button type="button" title="添加监控账号" aria-label="添加监控账号" disabled={loading} onClick={() => setShowAdd(!showAdd)}><Plus size={17} /></button></div>
          {showAdd && <form className="add-account" onSubmit={add}><label htmlFor="account-input">X 用户名或链接</label><div className="input-wrap"><span>@</span><input id="account-input" autoFocus placeholder="username" value={accountInput} onChange={(event) => setAccountInput(event.target.value)} /></div><div className="form-actions"><button type="button" onClick={() => setShowAdd(false)}>取消</button><button type="submit" disabled={adding || !accountInput.trim()}>{adding ? "添加中" : "添加账号"}</button></div></form>}
          <div className="account-list"><button className={`mobile-all-account ${selected === "all" ? "selected" : ""}`} type="button" aria-pressed={selected === "all"} onClick={() => setSelected("all")}><Inbox size={16} />全部</button>{data.accounts.map((account) => <div className={`account-line ${selected === account.handle ? "selected" : ""}`} key={account.handle}><button type="button" className="account-select" aria-pressed={selected === account.handle} onClick={() => setSelected(account.handle)}><AccountAvatar account={account} size="small" /><span><strong>{account.name}</strong><small>@{account.handle}</small></span></button><span className={`account-status ${account.error ? "status-error" : ""}`} title={account.error || "正常"} /><button className="remove-account" type="button" title={`移除 @${account.handle}`} aria-label={`移除 @${account.handle}`} onClick={() => void remove(account.handle)}><X size={14} /></button></div>)}</div>
          {data.accounts.length === 0 && <p className="sidebar-empty">还没有监控账号。</p>}
        </div>
        <div className="sidebar-bottom"><div className="sidebar-rule" /><div className="connection"><Activity size={16} /><span>运行状态</span><b>{loading ? "连接中" : initialized ? "运行中" : "连接失败"}</b></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="breadcrumb"><span>工作台</span><span className="slash">/</span><strong>{accountLabel}</strong></div><div className="topbar-right"><span className={`live-indicator ${hasAccountError ? "has-error" : ""}`}><i />{hasAccountError ? "部分异常" : autoCheck ? "实时监控" : "自动检查已暂停"}</span><span className="topbar-date">{new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(new Date())}</span></div></header>
        <div className="page-content">
          <div className="page-heading"><div><h1>新闻简报<span className="heading-period">.</span></h1><p>近 3 天 · {recentItems.length} 条动态</p></div><button className="refresh-button" type="button" aria-label={checking ? "正在重试异常账号" : "重试异常账号"} onClick={() => void check(true)} disabled={checking || !data.accounts.some((account) => account.error)} title={!checking && !data.accounts.some((account) => account.error) ? "当前没有异常账号" : "重试异常账号"}><RefreshCw size={16} className={checking ? "spinning" : ""} />{checking ? "正在检查" : "重试异常"}</button></div>
          {(error || storageError) && <div className="error-banner" role="alert"><span>{error || storageError}</span><button type="button" title="关闭提示" aria-label="关闭提示" onClick={() => { setError(null); setStorageError(null); }}><X size={16} /></button></div>}
          <section className="digest-section" aria-labelledby="digest-heading">
            <div className="digest-header">
              <div><h2 id="digest-heading">中文总览</h2><span>近 3 天 · 当前列表 {visibleItems.length} 条动态</span></div>
              {visibleItems.length > 0 && <button className="generate-button" type="button" onClick={() => void generateSummary()} disabled={generating || !data.aiEnabled || loading} title={!data.aiEnabled ? "请先配置 NVIDIA_API_KEY" : undefined}>{currentSummary ? <RefreshCw size={16} /> : <Sparkles size={16} />}{generating ? "正在生成总览" : currentSummary ? "重新生成" : "生成总览"}</button>}
            </div>
            {currentSummary ? <>
              <p className="digest-summary">{parseSummaryCitations(currentSummary, summarySources.length).map((part, index) => part.sourceIndex === null
                ? <span key={index}>{part.text}</span>
                : <a key={index} className="digest-citation" href={summarySources[part.sourceIndex].url} target="_blank" rel="noopener noreferrer" aria-label={`查看来源 ${part.sourceIndex + 1}：@${summarySources[part.sourceIndex].handle} 的原文`}>{part.text}</a>)}</p>
              <details className="digest-sources"><summary>查看全部原文（{summarySources.length}）</summary><div className="digest-source-links">{summarySources.map((item, index) => <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"><span>[{index + 1}] @{item.handle}</span><ArrowUpRight size={14} /></a>)}</div></details>
            </> : <div className="digest-empty"><Sparkles size={19} /><span>{visibleItems.length ? data.aiEnabled ? "尚未生成总览" : "NVIDIA API Key 未配置" : "暂无可总结的动态"}</span></div>}
          </section>
          <div className="overview"><div className="overview-main"><span className="overview-label">本轮检查</span><strong>{loading ? "--" : String(data.lastRun?.newCount ?? 0).padStart(2, "0")}</strong><span className="overview-suffix">条新动态</span></div><div className="overview-stat"><span>监控账号</span><strong>{data.accounts.length.toString().padStart(2, "0")}</strong><small>{activeAccounts} 个正常</small></div><div className="overview-stat"><span>已跳过重复</span><strong>{(data.lastRun?.duplicateCount ?? 0).toString().padStart(2, "0")}</strong><small>本轮前五条内</small></div></div>
          <div className="workspace-grid">
            <section className="feed-section" aria-labelledby="feed-heading"><div className="feed-header"><div><h2 id="feed-heading">{accountLabel}</h2><span>近 3 天 · {visibleItems.length} 条播报记录</span></div><label className="search-box"><Search size={17} /><input aria-label="搜索动态" placeholder="搜索动态" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button type="button" title="清空搜索" aria-label="清空搜索" onClick={() => setQuery("")}><X size={14} /></button>}</label></div>
              <div className="feed-content">{loading ? <div className="empty-state"><LoaderCircle className="spinning" size={25} /><h3>正在连接监控服务</h3></div> : visibleItems.length ? visibleItems.map((item) => <NewsRow key={item.id} item={item} isLatest={latestIds.has(item.id)} />) : <div className="empty-state"><Inbox size={28} /><h3>{query ? "没有匹配的动态" : data.accounts.length ? checking ? "正在获取最新动态" : "暂无播报记录" : "先添加一个监控账号"}</h3><p>{query ? "试试其他关键词。" : data.accounts.length ? "新动态会在下一次检查后出现在这里。" : "点击左侧监控账号旁的加号开始。"}</p></div>}</div>
            </section>
            <aside className="insight-rail"><div className="rail-panel"><div className="rail-title"><span className="rail-icon"><Radio size={16} /></span><h2>本轮速览</h2></div><p className="rail-intro">{runMessage}</p><div className="run-details"><div><span>成功获取</span><strong>{data.lastRun?.fetchedCount ?? 0} 条</strong></div><div><span>重复跳过</span><strong>{data.lastRun?.duplicateCount ?? 0} 条</strong></div><div><span>过期跳过</span><strong>{data.lastRun?.expiredCount ?? 0} 条</strong></div><div><span>获取失败</span><strong>{data.lastRun?.failedCount ?? 0} 个账号</strong></div></div></div>
              <div className="rail-panel rail-setting"><div className="rail-title"><span className="rail-icon muted"><RefreshCw size={16} /></span><h2>检查设置</h2></div><label className="toggle-row"><span><strong>自动检查</strong><small>页面打开时，每 60 秒检查一次</small></span><input type="checkbox" checked={autoCheck} onChange={(event) => setAutoCheck(event.target.checked)} /><span className="switch" aria-hidden="true" /></label><div className="setting-note"><span className={data.aiEnabled ? "ai-dot enabled" : "ai-dot"} />{data.aiEnabled ? "NVIDIA 中文摘要已配置" : "NVIDIA API Key 未配置"}</div></div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
