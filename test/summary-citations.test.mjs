import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSummaryCitations } from "../lib/summary-citations.ts";

test("maps inline source numbers to the ordered original posts", () => {
  assert.deepEqual(parseSummaryCitations("更新[1]，补充【2】。", 2), [
    { text: "更新", sourceIndex: null },
    { text: "[1]", sourceIndex: 0 },
    { text: "，补充", sourceIndex: null },
    { text: "【2】", sourceIndex: 1 },
    { text: "。", sourceIndex: null },
  ]);
});

test("leaves invalid source numbers unlinked", () => {
  assert.deepEqual(parseSummaryCitations("无效[0]和[3]", 2).filter((part) => part.text.startsWith("[")), [
    { text: "[0]", sourceIndex: null },
    { text: "[3]", sourceIndex: null },
  ]);
});
