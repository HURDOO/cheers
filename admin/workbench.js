import { buildPriorityItems } from "./priority.js";

export const WORK_MODES = {
  videos: "영상 고르기",
  lyrics: "가사",
  polish: "다듬기",
  publish: "공개 준비",
};

const NOTE_LIMIT = 12_000;
const SONG_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function hasLyrics(song) {
  return (song.lyrics?.lines ?? []).some((line) => String(line).trim());
}

export function songReadiness(song) {
  const status = song.publication?.status ?? "unpublished";
  return {
    hasVideo: (song.videos ?? []).length > 0,
    hasLyrics: hasLyrics(song),
    polished: song.descriptionStatus !== "draft",
    hasPolishSource: Boolean(String(song.researchText ?? "").trim() || String(song.descriptionText ?? "").trim()),
    publication: status,
  };
}

// 고연전 작업 순서에 있는 곡을 먼저, 나머지는 소속·제목 순으로 둔다.
export function orderSongsForWork(database, songs) {
  // 진행 상태에 따라 바뀌는 rank 대신 행사 등급만 써서 작업 중 순서가 흔들리지 않게 한다.
  const priorityRank = new Map();
  for (const item of buildPriorityItems(database)) {
    if (item.kind === "song") priorityRank.set(item.entityId, Math.min(item.groupOrder, priorityRank.get(item.entityId) ?? Infinity));
  }
  return [...songs].sort((left, right) => (
    (priorityRank.get(left.id) ?? Infinity) - (priorityRank.get(right.id) ?? Infinity)
    || left.organizationId.localeCompare(right.organizationId, "en")
    || left.title.localeCompare(right.title, "ko")
  ));
}

export function workQueue(database, mode, { includeDone = false } = {}) {
  const songs = database.songs.filter((song) => song.scopeStatus !== "rejected");
  const pending = {
    videos: (song) => !songReadiness(song).hasVideo,
    lyrics: (song) => !songReadiness(song).hasLyrics,
    polish: (song) => {
      const readiness = songReadiness(song);
      return !readiness.polished && readiness.hasPolishSource;
    },
    publish: (song) => {
      const readiness = songReadiness(song);
      return readiness.publication !== "current" && readiness.hasVideo && readiness.hasLyrics;
    },
  }[mode];
  if (!pending) return [];
  return orderSongsForWork(database, includeDone ? songs : songs.filter(pending));
}

export function workSummary(database) {
  return Object.fromEntries(Object.keys(WORK_MODES).map((mode) => [mode, workQueue(database, mode).length]));
}

export function formatTimestamp(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = String(total % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}

// "2:40", "1:02:30", "160" 형식을 초로 읽는다. 읽을 수 없으면 null.
export function parseTimestamp(value) {
  const text = String(value ?? "").trim();
  if (/^\d+$/u.test(text)) return Math.min(Number(text), 86_400);
  const match = text.match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/u);
  if (!match || Number(match[3]) >= 60) return null;
  return Math.min(Number(match[1] ?? 0) * 3600 + Number(match[2]) * 60 + Number(match[3]), 86_400);
}

export function videoUrlWithStart(videoId, seconds) {
  const start = Math.max(0, Math.floor(Number(seconds) || 0));
  return `https://www.youtube.com/watch?v=${videoId}${start ? `&t=${start}s` : ""}`;
}

export function pickPolishExemplars(songs, excludedIds = new Set(), count = 2) {
  return songs
    .filter((song) => !excludedIds.has(song.id)
      && song.publication?.status === "current"
      && song.descriptionStatus !== "draft"
      && String(song.descriptionText ?? "").trim().length >= 300)
    .sort((left, right) => right.descriptionText.length - left.descriptionText.length)
    .slice(0, count);
}

export function buildPolishPrompt(songs, { organizations = [], exemplars = [] } = {}) {
  const organizationName = (id) => organizations.find((organization) => organization.id === id)?.name ?? id;
  const clip = (text) => {
    const value = String(text ?? "").trim();
    return value.length > NOTE_LIMIT ? `${value.slice(0, NOTE_LIMIT)}\n…(이하 생략)` : value;
  };
  return [
    "너는 한국 대학·프로야구 응원가 아카이브의 편집자야. 아래 곡마다 소재 노트와 기존 본문을 바탕으로 사이트에 그대로 올릴 공개용 본문을 써 줘.",
    "",
    "## 문체",
    "- 나무위키처럼 편하게 읽히는 평서문(~다)으로 쓴다. 한 문단에는 한 가지 이야기만 담는다.",
    "- 가장 의외성이 크거나 재미있는 이야기부터 시작한다. 곡 소개로 시작하지 않아도 된다.",
    "- 확신도가 구전·설 대립·추정인 소재는 '~라고 전해진다', '~라는 이야기가 있다'처럼 범위를 자연스럽게 드러낸다.",
    "- 출처는 꼭 필요한 문장 뒤에만 [* 출처 설명: URL] 형식 주석으로 넣는다. 노트에 없는 사실이나 링크는 만들지 않는다.",
    "- '~의 상징이 되었다', '~를 잘 보여준다' 같은 총평, 대표곡이라는 칭찬 반복, 근거 없는 인과관계는 쓰지 않는다.",
    "- 기존 본문에 사람이 쓴 좋은 문장이 있으면 살린다. 소재 수에 맞춰 3~8문단으로 쓴다.",
    "- 제목, 소제목, 목록, 굵은 글씨 없이 문단만 쓴다.",
    ...(exemplars.length ? [
      "",
      "## 문체 예시 (이미 공개한 본문)",
      ...exemplars.flatMap((song) => ["", `--- 예시: ${song.title} (${organizationName(song.organizationId)}) ---`, song.descriptionText.trim()]),
    ] : []),
    "",
    "## 작업할 곡",
    ...songs.flatMap((song) => [
      "",
      `[곡 ${song.id}] ${song.title} · ${organizationName(song.organizationId)}${song.aliases?.length ? ` · 별칭: ${song.aliases.join(", ")}` : ""}`,
      "[기존 본문]",
      clip(song.descriptionText) || "(없음)",
      "[소재 노트]",
      clip(song.researchText) || "(없음)",
    ]),
    "",
    "## 답변 형식",
    "코드 블록 없이 아래 형식만 써 줘. 모든 곡을 포함하고, 곡 ID는 그대로 옮겨 줘.",
    "",
    ...songs.flatMap((song) => [`===== ${song.id} =====`, "(공개 본문)", ""]),
    "===== END =====",
  ].join("\n");
}

export function parsePolishResponse(text, { knownIds = [], expectedIds = [] } = {}) {
  const known = new Set(knownIds);
  const blocks = new Map();
  let currentId = null;
  let buffer = [];
  const flush = () => {
    if (currentId) blocks.set(currentId, buffer.join("\n").trim());
    buffer = [];
  };
  for (const rawLine of String(text ?? "").replace(/\r\n/gu, "\n").split("\n")) {
    const line = rawLine.trim();
    if (/^```/u.test(line)) continue;
    const header = line.match(/^={3,}\s*([A-Za-z0-9-]+)\s*={3,}$/u);
    if (header) {
      flush();
      const id = header[1].toLowerCase();
      currentId = id === "end" || !SONG_ID.test(id) ? null : id;
      continue;
    }
    if (currentId) buffer.push(rawLine.trimEnd());
  }
  flush();

  const items = [];
  const unknownIds = [];
  const emptyIds = [];
  for (const [id, body] of blocks) {
    if (!known.has(id)) unknownIds.push(id);
    else if (!body || body === "(공개 본문)") emptyIds.push(id);
    else items.push({ id, descriptionText: body });
  }
  return { items, unknownIds, emptyIds, missingIds: expectedIds.filter((id) => !blocks.has(id)) };
}
