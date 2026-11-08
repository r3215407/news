import assert from "node:assert/strict";
import { test } from "node:test";
import { readSavedSummaries, summaryKey, SUMMARIES_STORAGE_KEY, writeSavedSummaries } from "../lib/summary-storage.ts";

test("stores one digest by its complete status set and reads it after reload", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
  };
  assert.deepEqual(readSavedSummaries(storage), {});
  const key = summaryKey(["456", "123"]);
  assert.equal(key, "123,456");
  assert.equal(summaryKey(["123", "456", "123"]), key);
  writeSavedSummaries(storage, { [key]: "  中文总览  " });
  assert.equal(values.has(SUMMARIES_STORAGE_KEY), true);
  assert.deepEqual(readSavedSummaries(storage), { [key]: "中文总览" });
  values.set(SUMMARIES_STORAGE_KEY, '{"123,456":"有效总览","bad-id":"无效","789":"  "}');
  assert.deepEqual(readSavedSummaries(storage), { [key]: "有效总览" });
});
