import assert from "node:assert/strict";
import test from "node:test";
import { linkifyHttpUrls, parseInlineNotes } from "../shared/inline-notes.mjs";

test("본문과 여러 인라인 주석을 순서대로 분리한다", () => {
  assert.deepEqual(
    parseInlineNotes("첫 문장.[* 원문 출처: https://example.com/a] 다음 문장.[* 출처 없음]"),
    [
      { type: "text", value: "첫 문장." },
      { type: "note", value: "원문 출처: https://example.com/a", number: 1 },
      { type: "text", value: " 다음 문장." },
      { type: "note", value: "출처 없음", number: 2 },
    ],
  );
});

test("닫히지 않았거나 내용이 빈 주석은 원문 텍스트로 보존한다", () => {
  assert.deepEqual(parseInlineNotes("앞[* ]뒤[* 미완성"), [
    { type: "text", value: "앞[* ]뒤[* 미완성" },
  ]);
});

test("출처 없는 일반 본문도 그대로 허용한다", () => {
  assert.deepEqual(parseInlineNotes("현장에서 전해지는 재미있는 이야기"), [
    { type: "text", value: "현장에서 전해지는 재미있는 이야기" },
  ]);
});

test("주석 안 http(s) URL만 링크로 만들고 끝 문장부호는 제외한다", () => {
  assert.deepEqual(linkifyHttpUrls("원문: https://example.com/a, 보조: http://example.org/b."), [
    { type: "text", value: "원문: " },
    { type: "link", value: "https://example.com/a" },
    { type: "text", value: ", 보조: " },
    { type: "link", value: "http://example.org/b" },
    { type: "text", value: "." },
  ]);
});
