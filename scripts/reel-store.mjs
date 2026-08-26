import { randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { EditorialError } from "./content-editorial-store.mjs";

const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const VALID_STATUSES = new Set(["draft", "needs_sources", "ready", "rendered", "approved"]);
const VALID_CROPS = new Set(["left", "center", "right"]);
const DEFAULT_FORMAT = Object.freeze({ width: 1080, height: 1920, fps: 30 });

export class ReelStore {
  constructor(projectRoot) {
    this.projectRoot = path.resolve(projectRoot);
    this.reelsDirectory = path.join(this.projectRoot, "content", "production", "reels");
    this.renderDirectory = path.join(this.projectRoot, ".local", "reel-renders");
  }

  async initialize() {
    await Promise.all([
      mkdir(this.reelsDirectory, { recursive: true }),
      mkdir(this.renderDirectory, { recursive: true }),
    ]);
  }

  async list() {
    await this.initialize();
    const entries = await readdir(this.reelsDirectory, { withFileTypes: true });
    const reels = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const reel = JSON.parse(await readFile(path.join(this.reelsDirectory, entry.name), "utf8"));
      if (reel.deleted) continue;
      validateReel(reel);
      reels.push({ ...reel, render: await this.readRenderStatus(reel.id) });
    }
    return reels.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt, "en"));
  }

  async get(id) {
    assertSafeId(id);
    try {
      const reel = JSON.parse(await readFile(this.#reelPath(id), "utf8"));
      if (reel.deleted) throw new EditorialError("REEL_NOT_FOUND", "릴스 프로젝트를 찾을 수 없습니다.", 404);
      validateReel(reel);
      return { ...reel, render: await this.readRenderStatus(id) };
    } catch (error) {
      if (error?.code === "ENOENT") throw new EditorialError("REEL_NOT_FOUND", "릴스 프로젝트를 찾을 수 없습니다.", 404);
      throw error;
    }
  }

  async create(input) {
    const normalized = normalizeReelInput(input);
    const usedIds = new Set((await this.list()).map(({ id }) => id));
    const requestedId = String(input?.id ?? "").trim();
    if (requestedId) {
      assertSafeId(requestedId);
      if (usedIds.has(requestedId)) throw new EditorialError("REEL_ID_CONFLICT", "이미 사용 중인 릴스 ID입니다.", 409);
    }
    const id = requestedId || uniqueId(slugify(normalized.title) || "reel", usedIds);
    const now = new Date().toISOString();
    const reel = { id, ...normalized, revision: 1, createdAt: now, updatedAt: now };
    validateReel(reel);
    await this.#writeReel(reel);
    return { ...reel, render: emptyRenderStatus() };
  }

  async save(id, input, expectedRevision) {
    const current = await this.get(id);
    assertRevision(current, expectedRevision);
    const normalized = normalizeReelInput(input, current);
    const updated = {
      ...stripRuntime(current),
      ...normalized,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
    };
    validateReel(updated);
    await this.#writeReel(updated);
    return { ...updated, render: current.render };
  }

  async delete(id, expectedRevision) {
    const current = await this.get(id);
    assertRevision(current, expectedRevision);
    const tombstone = {
      id,
      deleted: true,
      revision: current.revision + 1,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.#writeReel(tombstone);
    return tombstone;
  }

  async readRenderStatus(id) {
    assertSafeId(id);
    try {
      const value = JSON.parse(await readFile(path.join(this.renderDirectory, id, "status.json"), "utf8"));
      return { ...emptyRenderStatus(), ...value };
    } catch (error) {
      if (error?.code === "ENOENT") return emptyRenderStatus();
      throw error;
    }
  }

  async writeRenderStatus(id, status) {
    assertSafeId(id);
    const current = await this.readRenderStatus(id);
    const next = { ...current, ...status, updatedAt: new Date().toISOString() };
    await this.#writeJson(path.join(this.renderDirectory, id, "status.json"), next);
    return next;
  }

  outputPath(id) {
    assertSafeId(id);
    return path.join(this.renderDirectory, id, "output.mp4");
  }

  #reelPath(id) {
    assertSafeId(id);
    return path.join(this.reelsDirectory, `${id}.json`);
  }

  async #writeReel(reel) {
    await this.#writeJson(this.#reelPath(reel.id), reel);
  }

  async #writeJson(filePath, value) {
    const directory = path.dirname(filePath);
    await mkdir(directory, { recursive: true });
    const temporaryPath = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`);
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(temporaryPath, filePath);
  }
}

export function normalizeReelInput(input, current = {}) {
  const clips = Array.isArray(input?.clips) ? input.clips.map((clip, index) => normalizeClip(clip, index)) : current.clips ?? [];
  return {
    title: normalizeText(input?.title ?? current.title, 200),
    originalSongTitle: normalizeText(input?.originalSongTitle ?? current.originalSongTitle, 200),
    hookText: normalizeText(input?.hookText ?? current.hookText, 240),
    endCardText: normalizeText(input?.endCardText ?? current.endCardText ?? "전체 응원가는 프로필 링크에서", 240),
    postCaption: normalizeMultiline(input?.postCaption ?? current.postCaption, 10_000),
    status: String(input?.status ?? current.status ?? "draft"),
    format: { ...DEFAULT_FORMAT },
    clips,
  };
}

export function validateReel(reel, { requireRenderable = false } = {}) {
  assertSafeId(reel?.id);
  if (!normalizeText(reel.title, 200)) throw new EditorialError("REEL_TITLE_REQUIRED", "릴스 제목을 입력해 주세요.");
  if (!VALID_STATUSES.has(reel.status)) throw new EditorialError("INVALID_REEL_STATUS", "릴스 작업 상태가 올바르지 않습니다.");
  if (!Number.isInteger(reel.revision) || reel.revision < 1) throw new EditorialError("INVALID_REEL_REVISION", "릴스 revision이 올바르지 않습니다.");
  if (!Array.isArray(reel.clips) || reel.clips.length > 20) throw new EditorialError("INVALID_REEL_CLIPS", "클립은 최대 20개까지 넣을 수 있습니다.");
  let totalDuration = 0;
  const clipIds = new Set();
  for (const clip of reel.clips) {
    if (!SAFE_ID.test(clip.id) || clipIds.has(clip.id)) throw new EditorialError("INVALID_REEL_CLIP_ID", "클립 ID가 올바르지 않거나 중복됩니다.");
    clipIds.add(clip.id);
    if (!isHttpUrl(clip.sourceUrl)) throw new EditorialError("INVALID_REEL_SOURCE_URL", "클립 영상 URL은 http 또는 https 주소여야 합니다.");
    if (!clip.attributionText) throw new EditorialError("REEL_ATTRIBUTION_REQUIRED", "각 클립의 화면 출처 문구를 입력해 주세요.");
    if (!Number.isFinite(clip.startSeconds) || !Number.isFinite(clip.endSeconds) || clip.startSeconds < 0 || clip.endSeconds <= clip.startSeconds) {
      throw new EditorialError("INVALID_REEL_SEGMENT", "각 클립의 시작·종료 구간을 올바르게 입력해 주세요.");
    }
    const duration = clip.endSeconds - clip.startSeconds;
    if (duration > 60) throw new EditorialError("REEL_CLIP_TOO_LONG", "클립 한 개는 60초를 넘을 수 없습니다.");
    totalDuration += duration;
    if (!VALID_CROPS.has(clip.crop)) throw new EditorialError("INVALID_REEL_CROP", "클립 화면 중심 위치가 올바르지 않습니다.");
  }
  if (totalDuration > 180) throw new EditorialError("REEL_TOO_LONG", "전체 영상은 180초를 넘을 수 없습니다.");
  if (requireRenderable && reel.clips.length === 0) throw new EditorialError("REEL_CLIP_REQUIRED", "렌더링할 클립을 한 개 이상 추가해 주세요.");
  return reel;
}

export function reelDuration(reel) {
  return reel.clips.reduce((sum, clip) => sum + clip.endSeconds - clip.startSeconds, 0);
}

function normalizeClip(input, index) {
  const fallbackId = `clip-${index + 1}`;
  const id = String(input?.id ?? fallbackId).trim() || fallbackId;
  const songId = String(input?.songId ?? "").trim();
  if (songId && !SAFE_ID.test(songId)) throw new EditorialError("INVALID_REEL_SONG_ID", "연결 응원가 ID가 올바르지 않습니다.");
  return {
    id,
    songId,
    sourceUrl: String(input?.sourceUrl ?? "").trim(),
    startSeconds: finiteNumber(input?.startSeconds, 0),
    endSeconds: finiteNumber(input?.endSeconds, 8),
    headline: normalizeText(input?.headline, 160),
    attributionText: normalizeText(input?.attributionText, 240),
    lyricsLines: normalizeMultiline(input?.lyricsLines, 4_000).split("\n").map((line) => line.trim()).filter(Boolean),
    crop: VALID_CROPS.has(input?.crop) ? input.crop : "center",
  };
}

function normalizeText(value, maxLength) {
  return String(value ?? "").replace(/\s+/gu, " ").trim().slice(0, maxLength);
}

function normalizeMultiline(value, maxLength) {
  const source = Array.isArray(value) ? value.join("\n") : value;
  return String(source ?? "").replace(/\r\n/gu, "\n").trim().slice(0, maxLength);
}

function finiteNumber(value, fallback) {
  const number = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(number) ? Math.round(number * 1000) / 1000 : fallback;
}

function isHttpUrl(value) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function assertSafeId(id) {
  if (!SAFE_ID.test(String(id ?? ""))) throw new EditorialError("INVALID_REEL_ID", "릴스 ID는 영문 소문자·숫자·하이픈만 사용할 수 있습니다.");
}

function assertRevision(current, expectedRevision) {
  if (!Number.isInteger(expectedRevision) || current.revision !== expectedRevision) {
    throw new EditorialError("REVISION_CONFLICT", "릴스 프로젝트가 변경되었습니다. 새로고침한 뒤 다시 시도해 주세요.", 409);
  }
}

function stripRuntime(reel) {
  const { render: _render, ...value } = reel;
  return value;
}

function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 80);
}

function uniqueId(base, usedIds) {
  if (!usedIds.has(base)) return base;
  let suffix = 2;
  while (usedIds.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function emptyRenderStatus() {
  return { status: "idle", progress: 0, phase: "대기", error: null, outputReady: false, startedAt: null, completedAt: null, updatedAt: null };
}
