import { createHash, randomBytes } from "node:crypto";
import { readFile, readdir, mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const DISCOVERED_BY = new Set(["user", "ai"]);
const SCOPE_STATUSES = new Set(["target", "deferred", "discovered_pending", "rejected"]);
const WORKFLOW_STAGES = new Set([
  "listed",
  "researching",
  "research_ready",
  "editing",
  "review_ready",
  "approved",
  "published",
]);
const VIDEO_ROLES = ["official-or-lyrics", "featured-field", "additional", "additional", "additional"];
const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export class EditorialError extends Error {
  constructor(code, message, statusCode = 400, details = []) {
    super(message);
    this.name = "EditorialError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function parseBulkTitles(value) {
  const seen = new Set();
  const titles = [];

  for (const rawLine of String(value ?? "").split(/\r?\n/u)) {
    const title = rawLine
      .trim()
      .replace(/^(?:[-*•]+|\d+[.)])\s*/u, "")
      .trim();
    const normalized = normalizeComparableTitle(title);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    titles.push(title);
  }

  return titles;
}

export function extractYouTubeVideoId(value) {
  const source = String(value ?? "").trim();
  if (!source) return null;

  try {
    const url = new URL(source);
    const hostname = url.hostname.toLowerCase().replace(/^www\./u, "");
    let candidate = null;

    if (hostname === "youtu.be") candidate = url.pathname.split("/").filter(Boolean)[0] ?? null;
    if (new Set(["youtube.com", "m.youtube.com", "music.youtube.com"]).has(hostname)) {
      candidate = url.searchParams.get("v");
      if (!candidate) {
        const [kind, id] = url.pathname.split("/").filter(Boolean);
        if (["shorts", "embed", "live"].includes(kind)) candidate = id ?? null;
      }
    }

    return candidate && /^[A-Za-z0-9_-]{11}$/u.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export class EditorialStore {
  constructor(projectRoot) {
    this.projectRoot = path.resolve(projectRoot);
    this.dataDirectory = path.join(this.projectRoot, "data");
    this.editorialDirectory = path.join(this.projectRoot, "content", "editorial");
    this.songsDirectory = path.join(this.editorialDirectory, "songs");
  }

  async initialize() {
    await mkdir(this.songsDirectory, { recursive: true });
  }

  async state() {
    await this.initialize();
    const [organizations, canonicalSongs, media, overlays] = await Promise.all([
      this.#catalog("teams.json"),
      this.#catalog("cheer-songs.json"),
      this.#catalog("media.json"),
      this.#readOverlays(),
    ]);

    const mediaBySong = new Map();
    for (const item of media) {
      const group = mediaBySong.get(item.cheerSongId) ?? [];
      group.push(item);
      mediaBySong.set(item.cheerSongId, group);
    }

    const canonicalById = new Map(
      canonicalSongs.map((song) => [song.id, this.#legacySong(song, mediaBySong.get(song.id) ?? [])]),
    );
    const merged = new Map(canonicalById);
    for (const overlay of overlays) {
      validateEditorialSong(overlay, organizations);
      const canonical = canonicalById.get(overlay.id);
      merged.set(overlay.id, {
        ...(canonical ?? {}),
        ...overlay,
        isPublished: Boolean(canonical),
        persisted: true,
      });
    }

    return {
      schemaVersion: 1,
      organizations,
      songs: [...merged.values()].sort(compareSongs),
    };
  }

  async getSong(id) {
    assertSafeId(id);
    const state = await this.state();
    const song = state.songs.find((item) => item.id === id);
    if (!song) throw new EditorialError("SONG_NOT_FOUND", "응원가를 찾을 수 없습니다.", 404);
    return song;
  }

  async readResearch(id) {
    assertSafeId(id);
    try {
      return await readFile(path.join(this.songsDirectory, id, "research.md"), "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") return "";
      throw error;
    }
  }

  async importSongs({ organizationId, targetText = "", deferredText = "", discoveredText = "" }) {
    const state = await this.state();
    if (!state.organizations.some(({ id }) => id === organizationId)) {
      throw new EditorialError("ORGANIZATION_NOT_FOUND", "대학·구단을 찾을 수 없습니다.", 404);
    }

    const requested = [
      ...parseBulkTitles(targetText).map((title) => ({ title, discoveredBy: "user", scopeStatus: "target" })),
      ...parseBulkTitles(deferredText).map((title) => ({ title, discoveredBy: "user", scopeStatus: "deferred" })),
      ...parseBulkTitles(discoveredText).map((title) => ({ title, discoveredBy: "ai", scopeStatus: "discovered_pending" })),
    ];
    if (requested.length === 0) {
      throw new EditorialError("EMPTY_IMPORT", "추가할 응원가 제목을 한 곡 이상 입력해 주세요.");
    }

    const comparable = new Map();
    for (const song of state.songs.filter((item) => item.organizationId === organizationId)) {
      for (const value of [song.title, ...(song.aliases ?? [])]) {
        comparable.set(normalizeComparableTitle(value), song);
      }
    }

    const created = [];
    const skipped = [];
    const requestedSeen = new Set();
    for (const request of requested) {
      const normalized = normalizeComparableTitle(request.title);
      const duplicate = comparable.get(normalized);
      if (duplicate || requestedSeen.has(normalized)) {
        skipped.push({ title: request.title, existingId: duplicate?.id ?? null });
        continue;
      }
      requestedSeen.add(normalized);

      const song = this.#newSong({ organizationId, ...request }, state.songs, created);
      validateEditorialSong(song, state.organizations);
      await this.#writeSong(song);
      comparable.set(normalized, song);
      created.push({ ...song, isPublished: false, persisted: true });
    }

    return { created, skipped };
  }

  async saveSong(id, input, expectedRevision) {
    assertSafeId(id);
    const state = await this.state();
    const current = state.songs.find((item) => item.id === id);
    if (!current) throw new EditorialError("SONG_NOT_FOUND", "응원가를 찾을 수 없습니다.", 404);
    if (!Number.isInteger(expectedRevision) || current.revision !== expectedRevision) {
      throw new EditorialError(
        "REVISION_CONFLICT",
        "다른 화면에서 내용이 변경되었습니다. 새로고침한 뒤 다시 저장해 주세요.",
        409,
        [{ expectedRevision, currentRevision: current.revision }],
      );
    }

    const title = requiredText(input.title, "제목", 200);
    const aliases = uniqueTexts(input.aliases, "별칭", 100);
    const scopeStatus = input.scopeStatus;
    if (!SCOPE_STATUSES.has(scopeStatus)) {
      throw new EditorialError("INVALID_SCOPE", "조사 범위 값이 올바르지 않습니다.");
    }

    const duplicate = state.songs.find((song) => (
      song.id !== id &&
      song.organizationId === current.organizationId &&
      [song.title, ...(song.aliases ?? [])].some((value) => normalizeComparableTitle(value) === normalizeComparableTitle(title))
    ));
    if (duplicate) {
      throw new EditorialError("DUPLICATE_TITLE", `같은 대학·구단에 '${duplicate.title}'이 이미 있습니다.`, 409);
    }

    const descriptionText = limitedText(input.descriptionText, "설명", 60_000);
    const lyrics = normalizeLyrics(input.lyrics);
    const quickFacts = normalizeQuickFacts(input.quickFacts);
    const videos = normalizeVideos(input.videos);
    const nextStage = new Set(["listed", "research_ready", "published"]).has(current.workflowStage)
      ? "editing"
      : current.workflowStage;
    const updated = {
      ...stripRuntimeFields(current),
      title,
      aliases,
      scopeStatus,
      workflowStage: WORKFLOW_STAGES.has(input.workflowStage) ? input.workflowStage : nextStage,
      descriptionText,
      lyrics,
      quickFacts,
      videos,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
    };
    if (new Set(["listed", "research_ready", "published"]).has(current.workflowStage) && updated.workflowStage === current.workflowStage) {
      updated.workflowStage = "editing";
    }

    validateEditorialSong(updated, state.organizations);
    await this.#writeSong(updated);
    return { ...updated, isPublished: current.isPublished, persisted: true };
  }

  async #catalog(fileName) {
    const value = JSON.parse(await readFile(path.join(this.dataDirectory, fileName), "utf8"));
    if (value?.schemaVersion !== 1 || !Array.isArray(value.items)) {
      throw new EditorialError("INVALID_CATALOG", `${fileName} 형식이 올바르지 않습니다.`, 500);
    }
    return value.items;
  }

  async #readOverlays() {
    const entries = await readdir(this.songsDirectory, { withFileTypes: true });
    const directories = entries.filter((entry) => entry.isDirectory() && SAFE_ID.test(entry.name));
    const overlays = await Promise.all(directories.map(async (entry) => {
      try {
        const file = JSON.parse(await readFile(path.join(this.songsDirectory, entry.name, "song.json"), "utf8"));
        if (file?.schemaVersion !== 1 || file?.song?.id !== entry.name) {
          throw new EditorialError("INVALID_EDITORIAL_FILE", `${entry.name}/song.json 형식이 올바르지 않습니다.`, 500);
        }
        return file.song;
      } catch (error) {
        if (error?.code === "ENOENT") return null;
        throw error;
      }
    }));
    return overlays.filter(Boolean);
  }

  #legacySong(song, media) {
    const sortedMedia = [...media].sort((left, right) => Number(right.preferred) - Number(left.preferred));
    const storyParts = [song.description, song.usageContext]
      .map((value) => String(value ?? "").trim())
      .filter((value, index, values) => value && values.indexOf(value) === index);

    return {
      id: song.id,
      organizationId: song.teamId,
      discoveredBy: "user",
      scopeStatus: "target",
      workflowStage: "published",
      title: song.title,
      aliases: song.aliases ?? [],
      symbolicLines: song.symbolicLines ?? [],
      descriptionText: storyParts.join("\n\n"),
      lyrics: {
        lines: song.lyrics ?? [],
        collapsedPreviewLineCount: 2,
      },
      quickFacts: [
        { label: "사용 시작", value: song.yearLabel ?? "" },
        { label: "", value: "" },
        { label: "", value: "" },
      ],
      videos: sortedMedia.slice(0, 5).map((item, index) => ({
        rank: index + 1,
        role: VIDEO_ROLES[index],
        sourceUrl: item.sourceUrl,
        videoId: item.videoId,
        title: item.title,
        channelName: item.channelName,
        attributionText: "",
      })),
      relationships: [
        { type: "original-song", targetId: song.originalSongId },
        ...(song.secondaryOriginalSongIds ?? []).map((targetId) => ({ type: "secondary-original-song", targetId })),
        ...(song.sourceCheerSongId ? [{ type: "source-cheer-song", targetId: song.sourceCheerSongId }] : []),
      ],
      legacy: {
        year: song.year,
        timelineYear: song.timelineYear,
        yearStatus: song.yearStatus,
        yearLabel: song.yearLabel,
        originType: song.originType,
        originNote: song.originNote,
        chronologyNote: song.chronologyNote,
      },
      revision: 0,
      createdAt: null,
      updatedAt: null,
      isPublished: true,
      persisted: false,
    };
  }

  #newSong({ organizationId, title, discoveredBy, scopeStatus }, existing, created) {
    const normalized = normalizeComparableTitle(title);
    const digest = createHash("sha256").update(`${organizationId}\0${normalized}`).digest("hex").slice(0, 10);
    const base = `${organizationId}-song-${digest}`;
    const ids = new Set([...existing, ...created].map(({ id }) => id));
    let id = base;
    let suffix = 2;
    while (ids.has(id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    const now = new Date().toISOString();

    return {
      id,
      organizationId,
      discoveredBy,
      scopeStatus,
      workflowStage: "listed",
      title,
      aliases: [],
      symbolicLines: [title, organizationId],
      descriptionText: "",
      lyrics: { lines: [], collapsedPreviewLineCount: 2 },
      quickFacts: [
        { label: "사용 시작", value: "" },
        { label: "", value: "" },
        { label: "", value: "" },
      ],
      videos: [],
      relationships: [],
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };
  }

  async #writeSong(song) {
    const directory = path.join(this.songsDirectory, song.id);
    await mkdir(directory, { recursive: true });
    const filePath = path.join(directory, "song.json");
    const temporaryPath = path.join(directory, `.song.${process.pid}.${randomBytes(5).toString("hex")}.tmp`);
    await writeFile(temporaryPath, `${JSON.stringify({ schemaVersion: 1, song: stripRuntimeFields(song) }, null, 2)}\n`, "utf8");
    await rename(temporaryPath, filePath);
  }
}

export function validateEditorialSong(song, organizations) {
  const details = [];
  if (!SAFE_ID.test(song.id ?? "")) details.push("id 형식이 올바르지 않습니다.");
  if (!organizations.some(({ id }) => id === song.organizationId)) details.push("존재하지 않는 대학·구단입니다.");
  if (!DISCOVERED_BY.has(song.discoveredBy)) details.push("발견 주체가 올바르지 않습니다.");
  if (!SCOPE_STATUSES.has(song.scopeStatus)) details.push("조사 범위가 올바르지 않습니다.");
  if (!WORKFLOW_STAGES.has(song.workflowStage)) details.push("진행 상태가 올바르지 않습니다.");
  if (!Number.isInteger(song.revision) || song.revision < 0) details.push("revision이 올바르지 않습니다.");
  try {
    requiredText(song.title, "제목", 200);
    uniqueTexts(song.aliases, "별칭", 100);
    limitedText(song.descriptionText, "설명", 60_000);
    normalizeLyrics(song.lyrics);
    normalizeQuickFacts(song.quickFacts);
    normalizeVideos(song.videos);
  } catch (error) {
    details.push(error.message);
  }
  if (details.length > 0) {
    throw new EditorialError("INVALID_SONG", "응원가 편집 데이터가 올바르지 않습니다.", 400, details);
  }
  return song;
}

function normalizeComparableTitle(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ko")
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function requiredText(value, label, maxLength) {
  const text = String(value ?? "").trim();
  if (!text) throw new EditorialError("REQUIRED_TEXT", `${label}을 입력해 주세요.`);
  if (text.length > maxLength) throw new EditorialError("TEXT_TOO_LONG", `${label}이 너무 깁니다.`);
  return text;
}

function limitedText(value, label, maxLength) {
  const text = String(value ?? "").replace(/\r\n/gu, "\n");
  if (text.length > maxLength) throw new EditorialError("TEXT_TOO_LONG", `${label}이 너무 깁니다.`);
  return text;
}

function uniqueTexts(value, label, maxLength) {
  if (!Array.isArray(value)) throw new EditorialError("INVALID_LIST", `${label}은 목록이어야 합니다.`);
  const result = [];
  const seen = new Set();
  for (const item of value) {
    const text = String(item ?? "").trim();
    if (!text) continue;
    if (text.length > maxLength) throw new EditorialError("TEXT_TOO_LONG", `${label} 항목이 너무 깁니다.`);
    const normalized = normalizeComparableTitle(text);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(text);
    }
  }
  return result;
}

function normalizeLyrics(value) {
  const lines = Array.isArray(value?.lines)
    ? value.lines.map((line) => String(line ?? "").trimEnd())
    : String(value?.lines ?? "").replace(/\r\n/gu, "\n").split("\n");
  if (lines.length > 1_000 || lines.some((line) => line.length > 1_000)) {
    throw new EditorialError("INVALID_LYRICS", "가사가 허용된 길이를 넘었습니다.");
  }
  return { lines, collapsedPreviewLineCount: 2 };
}

function normalizeQuickFacts(value) {
  if (!Array.isArray(value)) throw new EditorialError("INVALID_FACTS", "간단 정보 형식이 올바르지 않습니다.");
  const result = value.slice(0, 3).map((item, index) => ({
    label: index === 0 ? "사용 시작" : limitedText(item?.label, "간단 정보 라벨", 40).trim(),
    value: limitedText(item?.value, "간단 정보 값", 120).trim(),
  }));
  while (result.length < 3) result.push({ label: result.length === 0 ? "사용 시작" : "", value: "" });
  return result;
}

function normalizeVideos(value) {
  if (!Array.isArray(value)) throw new EditorialError("INVALID_VIDEOS", "영상 형식이 올바르지 않습니다.");
  const result = [];
  const ranks = new Set();
  const videoIds = new Set();
  for (const item of value) {
    const sourceUrl = String(item?.sourceUrl ?? "").trim();
    if (!sourceUrl) continue;
    const rank = Number(item.rank);
    const videoId = extractYouTubeVideoId(sourceUrl);
    if (!Number.isInteger(rank) || rank < 1 || rank > 5 || ranks.has(rank)) {
      throw new EditorialError("INVALID_VIDEO_RANK", "영상 순위는 중복되지 않는 1~5여야 합니다.");
    }
    if (!videoId) throw new EditorialError("INVALID_YOUTUBE_URL", `${rank}번 영상의 YouTube URL을 확인해 주세요.`);
    if (videoIds.has(videoId)) throw new EditorialError("DUPLICATE_VIDEO", "같은 YouTube 영상을 두 번 넣을 수 없습니다.");
    ranks.add(rank);
    videoIds.add(videoId);
    result.push({
      rank,
      role: VIDEO_ROLES[rank - 1],
      sourceUrl,
      videoId,
      title: limitedText(item?.title, "영상 제목", 300).trim(),
      channelName: limitedText(item?.channelName, "채널명", 200).trim(),
      attributionText: limitedText(item?.attributionText, "공개 출처 문구", 500).trim(),
    });
  }
  return result.sort((left, right) => left.rank - right.rank);
}

function stripRuntimeFields(song) {
  const { isPublished: _isPublished, persisted: _persisted, ...stored } = song;
  return stored;
}

function assertSafeId(id) {
  if (!SAFE_ID.test(String(id ?? ""))) {
    throw new EditorialError("INVALID_ID", "응원가 ID가 올바르지 않습니다.", 400);
  }
}

function compareSongs(left, right) {
  return left.organizationId.localeCompare(right.organizationId, "en") || left.title.localeCompare(right.title, "ko");
}
