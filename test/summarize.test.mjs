import assert from "node:assert/strict";
import { test } from "node:test";
import { makeSummary } from "../lib/summarize.ts";

test("sends all distinct posts in one request with their original source numbers", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.NVIDIA_API_KEY;
  const requests = [];
  process.env.NVIDIA_API_KEY = "test-key";
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options, payload: JSON.parse(options.body) });
    return Response.json({ choices: [{ message: { content: "本期中文总览。" } }] });
  };

  try {
    const source = Array.from({ length: 17 }, (_, index) => ({ author: `@author${index + 1}`, content: `Post ${index + 1}` }));
    assert.equal(await makeSummary(source), "本期中文总览。");
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, "https://integrate.api.nvidia.com/v1/chat/completions");
    assert.equal(requests[0].options.headers.Authorization, "Bearer test-key");
    assert.equal(requests[0].payload.model, "nvidia/nemotron-3.5-bolt-e4b");
    assert.equal(requests[0].payload.stream, false);
    assert.match(requests[0].payload.messages[0].content, /\[1\]/);
    assert.match(requests[0].payload.messages[0].content, /不要编造编号或网址/);
    assert.match(requests[0].payload.messages[0].content, /同一事实只写一次/);
    assert.match(requests[0].payload.messages[0].content, /合并引用/);
    const sent = JSON.parse(requests[0].payload.messages[1].content);
    assert.deepEqual(sent, source.map((item, index) => ({ ...item, sourceNumbers: [index + 1] })));
    assert.deepEqual(Object.keys(sent[0]), ["author", "content", "sourceNumbers"]);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.NVIDIA_API_KEY;
    else process.env.NVIDIA_API_KEY = originalKey;
  }
});

test("combines duplicate content while retaining every original citation number", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.NVIDIA_API_KEY;
  process.env.NVIDIA_API_KEY = "test-key";
  let sent;
  globalThis.fetch = async (_url, options) => {
    sent = JSON.parse(JSON.parse(options.body).messages[1].content);
    return Response.json({ choices: [{ message: { content: "同一进展[1][3]。另一进展[2]。" } }] });
  };
  try {
    const summary = await makeSummary([
      { author: "@first", content: "Same news" },
      { author: "@second", content: "Other news" },
      { author: "@third", content: "Same  news" },
    ]);
    assert.equal(summary, "同一进展[1][3]。另一进展[2]。");
    assert.deepEqual(sent, [
      { author: "@first、@third", content: "Same news", sourceNumbers: [1, 3] },
      { author: "@second", content: "Other news", sourceNumbers: [2] },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.NVIDIA_API_KEY;
    else process.env.NVIDIA_API_KEY = originalKey;
  }
});

test("reports a missing API key without making a request", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.NVIDIA_API_KEY;
  delete process.env.NVIDIA_API_KEY;
  globalThis.fetch = () => { throw new Error("fetch should not be called"); };
  try {
    await assert.rejects(makeSummary([{ author: "@author", content: "Post" }]), /NVIDIA_API_KEY/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey !== undefined) process.env.NVIDIA_API_KEY = originalKey;
  }
});

test("surfaces a model error instead of returning a partial digest", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.NVIDIA_API_KEY;
  process.env.NVIDIA_API_KEY = "test-key";
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response(null, { status: 503 });
  };
  try {
    await assert.rejects(makeSummary([{ author: "@author", content: "Post" }]), /503/);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.NVIDIA_API_KEY;
    else process.env.NVIDIA_API_KEY = originalKey;
  }
});

test("removes model thinking text from the returned overview", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.NVIDIA_API_KEY;
  process.env.NVIDIA_API_KEY = "test-key";
  globalThis.fetch = async () => Response.json({
    choices: [{ message: { content: "<think>checking source</think>\n本期中文总览。" } }],
  });
  try {
    assert.equal(await makeSummary([{ author: "@author", content: "Post" }]), "本期中文总览。");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.NVIDIA_API_KEY;
    else process.env.NVIDIA_API_KEY = originalKey;
  }
});

test("reports an empty model answer", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.NVIDIA_API_KEY;
  process.env.NVIDIA_API_KEY = "test-key";
  globalThis.fetch = async () => Response.json({ choices: [{ message: { content: "<think>checking source</think>" } }] });
  try {
    await assert.rejects(makeSummary([{ author: "@author", content: "Post" }]), /空摘要/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.NVIDIA_API_KEY;
    else process.env.NVIDIA_API_KEY = originalKey;
  }
});

test("reports a truncated model answer without saving it", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.NVIDIA_API_KEY;
  process.env.NVIDIA_API_KEY = "test-key";
  globalThis.fetch = async () => Response.json({ choices: [{ message: { content: "未完成的总览" }, finish_reason: "length" }] });
  try {
    await assert.rejects(makeSummary([{ author: "@author", content: "Post" }]), /未完成/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.NVIDIA_API_KEY;
    else process.env.NVIDIA_API_KEY = originalKey;
  }
});
