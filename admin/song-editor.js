import { parseInlineNotes, linkifyHttpUrls } from "../shared/inline-notes.mjs";

const escape = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const withBreaks = (value) => escape(value).replaceAll("\n", "<br>");

export function descriptionPreview(text) {
  if (!text.trim()) return '<p class="editor-empty">설명을 붙여 넣으면 여기에 표시돼요.</p>';
  let number = 0;
  return text.split(/\n{2,}/u).map((paragraph) => `<p>${parseInlineNotes(paragraph).map((token) => {
    if (token.type === "text") return withBreaks(token.value);
    const note = linkifyHttpUrls(token.value).map((part) => part.type === "link"
      ? `<a href="${escape(part.value)}" target="_blank" rel="noreferrer">${escape(part.value)}</a>`
      : withBreaks(part.value)).join("");
    return `<span class="editor-note"><button type="button" data-preview-note aria-label="주석 ${++number}" aria-expanded="false">[${number}]</button><span class="editor-note-body" hidden>${note}</span></span>`;
  }).join("")}</p>`).join("");
}

export function lyricsPreview(text) {
  const lines = text.replace(/\r\n/gu, "\n").split("\n");
  if (!text.trim()) return '<p class="editor-empty">가사를 붙여 넣으면 여기에 표시돼요.</p>';
  const preview = `<p>${withBreaks(lines.slice(0, 2).join("\n"))}</p>`;
  return lines.length > 2
    ? `${preview}<details class="editor-lyrics-more"><summary>가사 더 보기</summary><p>${withBreaks(lines.slice(2).join("\n"))}</p></details>`
    : preview;
}

export function readSongDraft(storage, key) {
  try {
    const draft = JSON.parse(storage.getItem(key));
    return draft?.version === 1 && draft.form && typeof draft.form.descriptionText === "string"
      && Array.isArray(draft.form.lyrics?.lines) && Array.isArray(draft.form.videos)
      ? draft : null;
  } catch {
    return null;
  }
}

// A stale draft stays readable, but cannot replace a newer saved revision.
export function canRestoreSongDraft(draft, revision) {
  return Boolean(draft && draft.revision === revision);
}

export function draftText(draft) {
  const song = draft.form;
  return [
    `곡: ${song.title}`, `별칭: ${(song.aliases ?? []).join(", ")}`,
    `대표 문구: ${(song.symbolicLines ?? []).join(" / ")}`,
    "", "설명", song.descriptionText, "", "가사", song.lyrics.lines.join("\n"),
    "", "영상", ...song.videos.map((video) => `${video.rank}. ${video.title}\n${video.channelName}\n${video.sourceUrl}\n${video.attributionText}`),
    "", "간단 정보", ...(song.quickFacts ?? []).map((fact) => `${fact.label}: ${fact.value}`),
    "", "원곡·응원가 관계", ...(song.relationships ?? []).map((item) => `${item.type}: ${item.targetId}`),
    "", `소속: ${song.organizationId}`, `작업 라벨: ${song.workflowStage}`, `조사 범위: ${song.scopeStatus}`,
  ].join("\n");
}
