import assert from "node:assert/strict";
import { test } from "node:test";
import { addAccount, checkNews, parseHandle, publicState, removeAccount, summarizeNews } from "../lib/monitor.ts";
import { isRecent, RECENT_WINDOW_MS } from "../lib/time.ts";
import { ACCOUNTS_STORAGE_KEY, DEFAULT_ACCOUNT_HANDLES, readSavedAccounts, writeSavedAccounts } from "../lib/account-storage.ts";

const nowSeconds = () => Math.floor(Date.now() / 1000);

test("validates account handles and X profile links", () => {
  assert.equal(parseHandle("@Thsottiaux"), "thsottiaux");
  assert.equal(parseHandle("https://x.com/Some_User"), "some_user");
  assert.equal(parseHandle("https://evil.example/Some_User"), null);
  assert.equal(parseHandle("not a handle"), null);
});

test("starts with the six requested monitor accounts", () => {
  assert.deepEqual(publicState().accounts.map((account) => account.handle), [...DEFAULT_ACCOUNT_HANDLES]);
});

test("saves and restores a normalized account list, including an empty list", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
  };
  assert.equal(readSavedAccounts(storage), null);
  writeSavedAccounts(storage, ["thsottiaux", "another_user"]);
  assert.equal(values.get(ACCOUNTS_STORAGE_KEY), '["thsottiaux","another_user"]');
  assert.deepEqual(readSavedAccounts(storage), ["thsottiaux", "another_user"]);
  values.set(ACCOUNTS_STORAGE_KEY, '["Another_User","another_user","bad handle",42]');
  assert.deepEqual(readSavedAccounts(storage), ["another_user"]);
  writeSavedAccounts(storage, []);
  assert.deepEqual(readSavedAccounts(storage), []);
  values.delete(ACCOUNTS_STORAGE_KEY);
  values.set("news-monitor.accounts.v1", '["thsottiaux","another_user"]');
  assert.deepEqual(readSavedAccounts(storage), ["thsottiaux", "another_user", ...DEFAULT_ACCOUNT_HANDLES.slice(1)]);
  values.set("news-monitor.accounts.v1", "[]");
  assert.deepEqual(readSavedAccounts(storage), []);
});

test("only reports the first five results once per account", async () => {
  globalThis.newsMonitorState.accounts = publicState().accounts.filter((account) => account.handle === "thsottiaux");
  const originalFetch = globalThis.fetch;
  const makeStatuses = (handle, start) => Array.from({ length: 9 }, (_, index) => ({
    id: String(start + index),
    text: `${handle} update ${index}`,
    created_timestamp: nowSeconds() - index * 60,
    author: { name: handle, avatar_url: "" },
  }));
  globalThis.fetch = async (url) => {
    const handle = new URL(url).pathname.split("/")[3];
    return Response.json({ results: makeStatuses(handle, handle === "thsottiaux" ? 1000 : 2000) });
  };

  try {
    const first = await checkNews();
    assert.equal(first.lastRun.newCount, 5);
    assert.equal(first.lastRun.fetchedCount, 5);
    assert.equal(first.items.length, 5);

    const second = await checkNews();
    assert.equal(second.lastRun.newCount, 0);
    assert.equal(second.lastRun.duplicateCount, 5);
    assert.equal(second.items.length, 5);

    assert.deepEqual(addAccount("@another_user"), { ok: true });
    assert.equal(addAccount("another_user").ok, false);
    const third = await checkNews();
    assert.equal(third.lastRun.newCount, 5);
    assert.equal(third.lastRun.duplicateCount, 5);
    assert.equal(third.items.length, 10);
    assert.equal(removeAccount("another_user"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("retries a transient upstream 404 without duplicating reports", async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts++;
    if (attempts === 1) return new Response(null, { status: 404 });
    return Response.json({ results: Array.from({ length: 5 }, (_, index) => ({
      id: String(1000 + index),
      text: `repeat ${index}`,
      created_timestamp: nowSeconds() - index * 60,
    })) });
  };
  try {
    const result = await checkNews();
    assert.equal(attempts, 2);
    assert.equal(result.lastRun.failedCount, 0);
    assert.equal(result.lastRun.newCount, 0);
    assert.equal(result.lastRun.duplicateCount, 5);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("retrying failed accounts does not request healthy accounts", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  let failing = true;
  addAccount("retry_target");
  globalThis.fetch = async (url) => {
    const handle = new URL(url).pathname.split("/")[3];
    calls.push(handle);
    if (handle === "retry_target" && failing) return new Response(null, { status: 403 });
    return Response.json({ results: [{
      id: handle === "retry_target" ? "8100" : "1000",
      text: `${handle} update`, created_timestamp: nowSeconds(),
    }] });
  };
  try {
    const first = await checkNews();
    assert.equal(first.accounts.find((account) => account.handle === "retry_target")?.error, "接口返回 403");
    assert.equal(first.accounts.find((account) => account.handle === "thsottiaux")?.error, null);

    calls.length = 0;
    failing = false;
    const retried = await checkNews(true);
    assert.deepEqual(calls, ["retry_target"]);
    assert.equal(retried.accounts.find((account) => account.handle === "retry_target")?.error, null);
    assert.equal(retried.lastRun.failedCount, 0);
    assert.equal(retried.lastRun.newCount, 1);

    calls.length = 0;
    await checkNews(true);
    assert.deepEqual(calls, []);
  } finally {
    removeAccount("retry_target");
    globalThis.fetch = originalFetch;
  }
});

test("checks an account added during a running check", async () => {
  const originalFetch = globalThis.fetch;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let blocked = false;
  globalThis.fetch = async (url) => {
    const handle = new URL(url).pathname.split("/")[3];
    if (handle === "thsottiaux" && !blocked) {
      blocked = true;
      await gate;
    }
    const start = handle === "racer" ? 3000 : 1000;
    return Response.json({ results: Array.from({ length: 5 }, (_, index) => ({
      id: String(start + index), text: `${handle} update ${index}`, created_timestamp: nowSeconds() - index * 60,
    })) });
  };
  try {
    const running = checkNews();
    assert.deepEqual(addAccount("racer"), { ok: true });
    const queued = checkNews();
    release();
    await running;
    const result = await queued;
    assert.equal(result.lastRun.newCount, 5);
    assert.equal(result.items.filter((item) => item.handle === "racer").length, 5);
    removeAccount("racer");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not report posts from an account removed mid-check", async () => {
  const originalFetch = globalThis.fetch;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  addAccount("leaving");
  globalThis.fetch = async (url) => {
    const handle = new URL(url).pathname.split("/")[3];
    if (handle === "leaving") await gate;
    const start = handle === "leaving" ? 4000 : 1000;
    return Response.json({ results: [{ id: String(start), text: handle, created_timestamp: nowSeconds() }] });
  };
  try {
    const running = checkNews();
    removeAccount("leaving");
    release();
    const result = await running;
    assert.equal(result.lastRun.newCount, 0);
    assert.equal(result.items.filter((item) => item.handle === "leaving").length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("includes exactly the previous three days and excludes older or future posts", () => {
  const now = Date.now();
  assert.equal(RECENT_WINDOW_MS, 3 * 24 * 60 * 60 * 1000);
  assert.equal(isRecent(new Date(now - RECENT_WINDOW_MS).toISOString(), now), true);
  assert.equal(isRecent(new Date(now - RECENT_WINDOW_MS - 1).toISOString(), now), false);
  assert.equal(isRecent(new Date(now + 1).toISOString(), now), false);
  assert.equal(isRecent("invalid", now), false);
});

test("skips old statuses and removes old items from public state", async () => {
  const originalFetch = globalThis.fetch;
  const now = nowSeconds();
  globalThis.fetch = async () => Response.json({ results: [
    { id: "1000", text: "already reported", created_timestamp: now },
    { id: "6000", text: "recent one", created_timestamp: now - 3600 },
    { id: "5000", text: "old one", created_timestamp: now - 73 * 3600 },
    { id: "6001", text: "recent two", created_timestamp: now - 71 * 3600 },
    { id: "5001", text: "old two", created_timestamp: now - 5 * 24 * 3600 },
  ] });
  try {
    const result = await checkNews();
    assert.equal(result.lastRun.fetchedCount, 5);
    assert.equal(result.lastRun.expiredCount, 2);
    assert.equal(result.lastRun.duplicateCount, 1);
    assert.equal(result.lastRun.newCount, 2);
    assert.equal(result.items.some((item) => item.id === "5000" || item.id === "5001"), false);

    const stale = { ...result.items[0], id: "stale", publishedAt: new Date(Date.now() - RECENT_WINDOW_MS - 1000).toISOString() };
    globalThis.newsMonitorState.items.push(stale);
    assert.equal(publicState().items.some((item) => item.id === "stale"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("checks news without AI and only summarizes after an explicit call", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.NVIDIA_API_KEY;
  process.env.NVIDIA_API_KEY = "test-key";
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (!String(url).includes("api.fxtwitter.com")) throw new Error("AI called during news check");
    return Response.json({ results: [
      { id: "9001", text: "A second update", created_timestamp: nowSeconds() },
      { id: "9000", text: "A new product update", created_timestamp: nowSeconds() },
    ] });
  };
  try {
    const checked = await checkNews();
    assert.equal(checked.lastRun.newCount, 2);
    assert.equal(checked.items.find((item) => item.id === "9000")?.summaryKind, "excerpt");
    assert.equal(calls.every((url) => url.includes("api.fxtwitter.com")), true);

    globalThis.fetch = async (url, options) => {
      calls.push(String(url));
      const payload = JSON.parse(options.body);
      assert.deepEqual(JSON.parse(payload.messages[1].content), [
        { author: "@thsottiaux", content: "A new product update", sourceNumbers: [1] },
        { author: "@thsottiaux", content: "A second update", sourceNumbers: [2] },
      ]);
      return Response.json({ choices: [{ message: { content: "发布了产品更新[1]，以及后续更新[2]。" } }] });
    };
    const generated = await summarizeNews(["9001", "9000"]);
    assert.equal(calls.at(-1), "https://integrate.api.nvidia.com/v1/chat/completions");
    assert.deepEqual(generated, { summary: "发布了产品更新[1]，以及后续更新[2]。", ids: ["9000", "9001"] });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.NVIDIA_API_KEY;
    else process.env.NVIDIA_API_KEY = originalKey;
  }
});
