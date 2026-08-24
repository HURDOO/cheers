const NOTE_START = "[*";

/**
 * 본문 안의 `[* 주석]` 표기를 안전한 텍스트 토큰으로 나눕니다.
 * 닫히지 않았거나 내용이 빈 표기는 원문 텍스트로 보존합니다.
 *
 * @param {string} value
 * @returns {Array<{type: "text", value: string} | {type: "note", value: string, number: number}>}
 */
export function parseInlineNotes(value) {
  const source = String(value ?? "");
  const tokens = [];
  let cursor = 0;
  let noteNumber = 0;

  while (cursor < source.length) {
    const start = source.indexOf(NOTE_START, cursor);
    if (start === -1) {
      tokens.push({ type: "text", value: source.slice(cursor) });
      break;
    }

    const end = source.indexOf("]", start + NOTE_START.length);
    const note = end === -1 ? "" : source.slice(start + NOTE_START.length, end).trim();
    if (end === -1 || note === "") {
      tokens.push({ type: "text", value: source.slice(cursor, start + NOTE_START.length) });
      cursor = start + NOTE_START.length;
      continue;
    }

    if (start > cursor) tokens.push({ type: "text", value: source.slice(cursor, start) });
    noteNumber += 1;
    tokens.push({ type: "note", value: note, number: noteNumber });
    cursor = end + 1;
  }

  if (source.length === 0) return [{ type: "text", value: "" }];
  return mergeAdjacentText(tokens);
}

/**
 * 주석 본문에서 http(s) URL만 링크 토큰으로 나눕니다.
 * URL 뒤에 붙기 쉬운 문장부호는 링크에서 제외합니다.
 *
 * @param {string} value
 * @returns {Array<{type: "text" | "link", value: string}>}
 */
export function linkifyHttpUrls(value) {
  const source = String(value ?? "");
  const parts = [];
  const pattern = /https?:\/\/[^\s<>"']+/gu;
  let cursor = 0;

  for (const match of source.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push({ type: "text", value: source.slice(cursor, index) });

    const raw = match[0];
    const trailing = raw.match(/[.,!?;:]+$/u)?.[0] ?? "";
    const url = trailing ? raw.slice(0, -trailing.length) : raw;
    parts.push({ type: "link", value: url });
    if (trailing) parts.push({ type: "text", value: trailing });
    cursor = index + raw.length;
  }

  if (cursor < source.length) parts.push({ type: "text", value: source.slice(cursor) });
  return parts.length > 0 ? mergeAdjacentText(parts) : [{ type: "text", value: source }];
}

function mergeAdjacentText(tokens) {
  const merged = [];
  for (const token of tokens) {
    const previous = merged.at(-1);
    if (token.type === "text" && previous?.type === "text") {
      previous.value += token.value;
    } else {
      merged.push({ ...token });
    }
  }
  return merged;
}
