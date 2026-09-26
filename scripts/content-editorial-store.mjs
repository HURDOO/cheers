import { createHash, randomBytes } from "node:crypto";
import { readFile, readdir, mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { extractYouTubeVideoId } from "../shared/youtube.mjs";
export { extractYouTubeVideoId } from "../shared/youtube.mjs";

const ORGANIZATION_TYPES = new Set(["baseball", "university"]);
const DISCOVERED_BY = new Set(["user", "ai"]);
const SCOPE_STATUSES = new Set(["target", "deferred", "discovered_pending", "rejected"]);
const WORKFLOW_STAGES = new Set([
  "listed",
  "needs_work",
  "researching",
  "research_ready",
  "editing",
  "review_ready",
  "approved",
  "published",
]);
const DESCRIPTION_STATUSES = new Set(["draft", "polished"]);
const RELATIONSHIP_TYPES = new Set(["original-song", "secondary-original-song", "source-cheer-song"]);
const VIDEO_ROLES = ["official-or-lyrics", "featured-field", "additional", "additional", "additional"];
const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const HEX_COLOR = /^#[0-9a-f]{6}$/iu;

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

export class EditorialStore {
  constructor(projectRoot) {
    this.projectRoot = path.resolve(projectRoot);
    this.dataDirectory = path.join(this.projectRoot, "data");
    this.editorialDirectory = path.join(this.projectRoot, "content", "editorial");
    this.organizationsDirectory = path.join(this.editorialDirectory, "organizations");
    this.songsDirectory = path.join(this.editorialDirectory, "songs");
  }

  async initialize() {
    await Promise.all([
      mkdir(this.organizationsDirectory, { recursive: true }),
      mkdir(this.songsDirectory, { recursive: true }),
    ]);
  }

  async state() {
    await this.initialize();
    const [canonicalOrganizations, canonicalSongs, media, organizationOverlays, songOverlays] = await Promise.all([
      this.#catalog("teams.json"),
      this.#catalog("cheer-songs.json"),
      this.#catalog("media.json"),
      this.#readOrganizationOverlays(),
      this.#readSongOverlays(),
    ]);

    const canonicalOrganizationById = new Map(
      canonicalOrganizations.map((organization) => [organization.id, this.#legacyOrganization(organization)]),
    );
    const mergedOrganizations = new Map(canonicalOrganizationById);
    for (const overlay of organizationOverlays) {
      if (overlay.deleted) {
        validateTombstone(overlay, "대학·구단");
        mergedOrganizations.delete(overlay.id);
        continue;
      }
      validateEditorialOrganization(overlay);
      const canonical = canonicalOrganizationById.get(overlay.id);
      mergedOrganizations.set(overlay.id, {
        ...(canonical ?? {}),
        ...overlay,
        isPublished: Boolean(canonical),
        persisted: true,
      });
    }
    const activeOrganizations = [...mergedOrganizations.values()].sort(compareOrganizations);
    const activeOrganizationIds = new Set(activeOrganizations.map(({ id }) => id));

    const mediaBySong = new Map();
    for (const item of media) {
      const group = mediaBySong.get(item.cheerSongId) ?? [];
      group.push(item);
      mediaBySong.set(item.cheerSongId, group);
    }

    const canonicalSongById = new Map(
      canonicalSongs
        .filter((song) => activeOrganizationIds.has(song.teamId))
        .map((song) => [song.id, this.#legacySong(song, mediaBySong.get(song.id) ?? [])]),
    );
    const mergedSongs = new Map(canonicalSongById);
    for (const overlay of songOverlays) {
      if (overlay.deleted) {
        validateTombstone(overlay, "응원가");
        mergedSongs.delete(overlay.id);
        continue;
      }
      validateEditorialSong(overlay, activeOrganizations);
      const canonical = canonicalSongById.get(overlay.id);
      const merged = { ...(canonical ?? {}), ...overlay };
      mergedSongs.set(overlay.id, {
        ...merged,
        descriptionStatus: merged.descriptionStatus ?? defaultDescriptionStatus(merged),
        isPublished: Boolean(canonical),
        persisted: true,
      });
    }

    const songs = [...mergedSongs.values()]
      .filter((song) => activeOrganizationIds.has(song.organizationId))
      .sort(compareSongs);
    const songCounts = new Map();
    for (const song of songs) songCounts.set(song.organizationId, (songCounts.get(song.organizationId) ?? 0) + 1);
    const organizations = activeOrganizations.map((organization) => ({
      ...organization,
      songCount: songCounts.get(organization.id) ?? 0,
    }));

    return { schemaVersion: 1, organizations, songs };
  }

  async getOrganization(id) {
    assertSafeId(id, "대학·구단");
    const organization = (await this.state()).organizations.find((item) => item.id === id);
    if (!organization) throw new EditorialError("ORGANIZATION_NOT_FOUND", "대학·구단을 찾을 수 없습니다.", 404);
    return organization;
  }

  async createOrganization(input) {
    const state = await this.state();
    const fields = normalizeOrganizationInput(input);
    ensureUniqueOrganizationName(state.organizations, fields.name);

    const overlays = await this.#readOrganizationOverlays();
    const usedIds = new Set([
      ...(await this.#catalog("teams.json")).map(({ id }) => id),
      ...overlays.map(({ id }) => id),
    ]);
    const requestedId = String(input?.id ?? "").trim();
    if (requestedId) {
      assertSafeId(requestedId, "대학·구단");
      if (usedIds.has(requestedId)) throw new EditorialError("ID_CONFLICT", "이미 사용 중인 대학·구단 ID입니다.", 409);
    }
    const id = requestedId || uniqueId(organizationIdBase(fields.name), usedIds);
    const now = new Date().toISOString();
    const organization = { id, ...fields, revision: 1, createdAt: now, updatedAt: now };
    validateEditorialOrganization(organization);
    await this.#writeOrganization(organization);
    return { ...organization, isPublished: false, persisted: true, songCount: 0 };
  }

  async saveOrganization(id, input, expectedRevision) {
    assertSafeId(id, "대학·구단");
    const state = await this.state();
    const current = state.organizations.find((item) => item.id === id);
    if (!current) throw new EditorialError("ORGANIZATION_NOT_FOUND", "대학·구단을 찾을 수 없습니다.", 404);
    assertRevision(current, expectedRevision);

    const fields = normalizeOrganizationInput(input, current);
    ensureUniqueOrganizationName(state.organizations, fields.name, id);
    const updated = {
      ...stripRuntimeFields(current),
      ...fields,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
    };
    validateEditorialOrganization(updated);
    await this.#writeOrganization(updated);
    return { ...updated, isPublished: current.isPublished, persisted: true, songCount: current.songCount };
  }

  async deleteOrganization(id, expectedRevision, { cascade = false } = {}) {
    assertSafeId(id, "대학·구단");
    const state = await this.state();
    const current = state.organizations.find((item) => item.id === id);
    if (!current) throw new EditorialError("ORGANIZATION_NOT_FOUND", "대학·구단을 찾을 수 없습니다.", 404);
    assertRevision(current, expectedRevision);
    const linkedSongs = state.songs.filter((song) => song.organizationId === id);
    if (linkedSongs.length > 0 && !cascade) {
      throw new EditorialError(
        "ORGANIZATION_HAS_SONGS",
        `연결된 응원가 ${linkedSongs.length}곡이 있습니다. 함께 삭제할지 확인해 주세요.`,
        409,
        [{ songCount: linkedSongs.length, songIds: linkedSongs.map(({ id: songId }) => songId) }],
      );
    }

    const now = new Date().toISOString();
    await Promise.all(linkedSongs.map((song) => this.#writeSong({
      id: song.id,
      deleted: true,
      revision: song.revision + 1,
      deletedAt: now,
      updatedAt: now,
    })));
    await this.#writeOrganization({
      id,
      deleted: true,
      revision: current.revision + 1,
      deletedAt: now,
      updatedAt: now,
    });
    return { id, deleted: true, deletedSongIds: linkedSongs.map(({ id: songId }) => songId) };
  }

  async getSong(id) {
    assertSafeId(id, "응원가");
    const song = (await this.state()).songs.find((item) => item.id === id);
    if (!song) throw new EditorialError("SONG_NOT_FOUND", "응원가를 찾을 수 없습니다.", 404);
    return song;
  }

  async createSong(input) {
    const state = await this.state();
    const fields = normalizeSongInput(input);
    ensureOrganizationExists(state.organizations, fields.organizationId);
    ensureUniqueSong(state.songs, fields);

    const overlays = await this.#readSongOverlays();
    const usedIds = new Set([
      ...(await this.#catalog("cheer-songs.json")).map(({ id }) => id),
      ...overlays.map(({ id }) => id),
    ]);
    const requestedId = String(input?.id ?? "").trim();
    if (requestedId) {
      assertSafeId(requestedId, "응원가");
      if (usedIds.has(requestedId)) throw new EditorialError("ID_CONFLICT", "이미 사용 중인 응원가 ID입니다.", 409);
    }
    const id = requestedId || uniqueId(songIdBase(fields.organizationId, fields.title), usedIds);
    const now = new Date().toISOString();
    const song = { id, ...fields, revision: 1, createdAt: now, updatedAt: now };
    validateEditorialSong(song, state.organizations);
    await this.#writeSong(song);
    return { ...song, isPublished: false, persisted: true };
  }

  async saveSong(id, input, expectedRevision) {
    assertSafeId(id, "응원가");
    const state = await this.state();
    const current = state.songs.find((item) => item.id === id);
    if (!current) throw new EditorialError("SONG_NOT_FOUND", "응원가를 찾을 수 없습니다.", 404);
    assertRevision(current, expectedRevision);

    const fields = normalizeSongInput(input, current);
    ensureOrganizationExists(state.organizations, fields.organizationId);
    ensureUniqueSong(state.songs, fields, id);
    const updated = {
      ...stripRuntimeFields(current),
      ...fields,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
    };
    validateEditorialSong(updated, state.organizations);
    await this.#writeSong(updated);
    return { ...updated, isPublished: current.isPublished, persisted: true };
  }

  async deleteSong(id, expectedRevision) {
    assertSafeId(id, "응원가");
    const current = await this.getSong(id);
    assertRevision(current, expectedRevision);
    const now = new Date().toISOString();
    const tombstone = {
      id,
      deleted: true,
      revision: current.revision + 1,
      deletedAt: now,
      updatedAt: now,
    };
    await this.#writeSong(tombstone);
    return tombstone;
  }

  async readResearch(id) {
    assertSafeId(id, "응원가");
    try {
      return await readFile(path.join(this.songsDirectory, id, "research.md"), "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") return "";
      throw error;
    }
  }

  async importSongs({ organizationId, targetText = "", deferredText = "", discoveredText = "" }) {
    const requested = [
      ...parseBulkTitles(targetText).map((title) => ({ title, discoveredBy: "user", scopeStatus: "target" })),
      ...parseBulkTitles(deferredText).map((title) => ({ title, discoveredBy: "user", scopeStatus: "deferred" })),
      ...parseBulkTitles(discoveredText).map((title) => ({ title, discoveredBy: "ai", scopeStatus: "discovered_pending" })),
    ];
    if (requested.length === 0) throw new EditorialError("EMPTY_IMPORT", "추가할 응원가 제목을 한 곡 이상 입력해 주세요.");

    const created = [];
    const skipped = [];
    for (const request of requested) {
      try {
        created.push(await this.createSong({ organizationId, ...request }));
      } catch (error) {
        if (error instanceof EditorialError && error.code === "DUPLICATE_TITLE") {
          skipped.push({ title: request.title, existingId: error.details[0]?.existingId ?? null });
          continue;
        }
        throw error;
      }
    }
    return { created, skipped };
  }

  async #catalog(fileName) {
    const value = JSON.parse(await readFile(path.join(this.dataDirectory, fileName), "utf8"));
    if (value?.schemaVersion !== 1 || !Array.isArray(value.items)) {
      throw new EditorialError("INVALID_CATALOG", `${fileName} 형식이 올바르지 않습니다.`, 500);
    }
    return value.items;
  }

  async #readOrganizationOverlays() {
    return this.#readOverlays(this.organizationsDirectory, "organization.json", "organization");
  }

  async #readSongOverlays() {
    return this.#readOverlays(this.songsDirectory, "song.json", "song");
  }

  async #readOverlays(directory, fileName, property) {
    const entries = await readdir(directory, { withFileTypes: true });
    const directories = entries.filter((entry) => entry.isDirectory() && SAFE_ID.test(entry.name));
    const overlays = await Promise.all(directories.map(async (entry) => {
      try {
        const file = JSON.parse(await readFile(path.join(directory, entry.name, fileName), "utf8"));
        if (file?.schemaVersion !== 1 || file?.[property]?.id !== entry.name) {
          throw new EditorialError("INVALID_EDITORIAL_FILE", `${entry.name}/${fileName} 형식이 올바르지 않습니다.`, 500);
        }
        return file[property];
      } catch (error) {
        if (error?.code === "ENOENT") return null;
        throw error;
      }
    }));
    return overlays.filter(Boolean);
  }

  #legacyOrganization(organization) {
    return {
      ...organization,
      revision: 0,
      createdAt: null,
      updatedAt: null,
      isPublished: true,
      persisted: false,
    };
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
      descriptionStatus: "polished",
      lyrics: { lines: song.lyrics ?? [], collapsedPreviewLineCount: 2 },
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
        attributionText: item.attributionText ?? "",
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

  async #writeOrganization(organization) {
    return this.#writeEntity(this.organizationsDirectory, organization.id, "organization.json", "organization", organization);
  }

  async #writeSong(song) {
    return this.#writeEntity(this.songsDirectory, song.id, "song.json", "song", song);
  }

  async #writeEntity(rootDirectory, id, fileName, property, entity) {
    const directory = path.join(rootDirectory, id);
    await mkdir(directory, { recursive: true });
    const filePath = path.join(directory, fileName);
    const temporaryPath = path.join(directory, `.${fileName}.${process.pid}.${randomBytes(5).toString("hex")}.tmp`);
    await writeFile(temporaryPath, `${JSON.stringify({ schemaVersion: 1, [property]: stripRuntimeFields(entity) }, null, 2)}\n`, "utf8");
    await rename(temporaryPath, filePath);
  }
}

export function validateEditorialOrganization(organization) {
  const details = [];
  if (!SAFE_ID.test(organization.id ?? "")) details.push("id 형식이 올바르지 않습니다.");
  if (!ORGANIZATION_TYPES.has(organization.type)) details.push("대학·구단 유형이 올바르지 않습니다.");
  if (!Number.isInteger(organization.revision) || organization.revision < 0) details.push("revision이 올바르지 않습니다.");
  try {
    requiredText(organization.name, "이름", 200);
    requiredText(organization.abbreviation, "약칭", 30);
    requiredText(organization.region, "지역", 100);
    normalizeColor(organization.colors?.primary, "대표 색상");
    normalizeColor(organization.colors?.secondary, "보조 색상");
  } catch (error) {
    details.push(error.message);
  }
  if (details.length > 0) {
    throw new EditorialError("INVALID_ORGANIZATION", "대학·구단 데이터가 올바르지 않습니다.", 400, details);
  }
  return organization;
}

export function validateEditorialSong(song, organizations) {
  const details = [];
  if (!SAFE_ID.test(song.id ?? "")) details.push("id 형식이 올바르지 않습니다.");
  if (!organizations.some(({ id }) => id === song.organizationId)) details.push("존재하지 않는 대학·구단입니다.");
  if (!DISCOVERED_BY.has(song.discoveredBy)) details.push("발견 주체가 올바르지 않습니다.");
  if (!SCOPE_STATUSES.has(song.scopeStatus)) details.push("조사 범위가 올바르지 않습니다.");
  if (!WORKFLOW_STAGES.has(song.workflowStage)) details.push("진행 상태가 올바르지 않습니다.");
  if (song.descriptionStatus !== undefined && !DESCRIPTION_STATUSES.has(song.descriptionStatus)) details.push("본문 상태가 올바르지 않습니다.");
  if (!Number.isInteger(song.revision) || song.revision < 0) details.push("revision이 올바르지 않습니다.");
  try {
    requiredText(song.title, "제목", 200);
    uniqueTexts(song.aliases, "별칭", 100);
    normalizeSymbolicLines(song.symbolicLines);
    limitedText(song.descriptionText, "설명", 60_000);
    normalizeLyrics(song.lyrics);
    normalizeQuickFacts(song.quickFacts);
    normalizeVideos(song.videos);
    normalizeRelationships(song.relationships);
  } catch (error) {
    details.push(error.message);
  }
  if (details.length > 0) {
    throw new EditorialError("INVALID_SONG", "응원가 편집 데이터가 올바르지 않습니다.", 400, details);
  }
  return song;
}

function normalizeOrganizationInput(input, defaults = {}) {
  const type = String(input?.type ?? defaults.type ?? "baseball");
  if (!ORGANIZATION_TYPES.has(type)) throw new EditorialError("INVALID_ORGANIZATION_TYPE", "유형을 확인해 주세요.");
  return {
    name: requiredText(input?.name ?? defaults.name, "이름", 200),
    abbreviation: requiredText(input?.abbreviation ?? defaults.abbreviation, "약칭", 30),
    type,
    region: requiredText(input?.region ?? defaults.region, "지역", 100),
    colors: {
      primary: normalizeColor(input?.colors?.primary ?? defaults.colors?.primary, "대표 색상"),
      secondary: normalizeColor(input?.colors?.secondary ?? defaults.colors?.secondary, "보조 색상"),
    },
  };
}

function normalizeSongInput(input, defaults = {}) {
  const discoveredBy = String(input?.discoveredBy ?? defaults.discoveredBy ?? "user");
  const scopeStatus = String(input?.scopeStatus ?? defaults.scopeStatus ?? "target");
  const workflowStage = String(input?.workflowStage ?? defaults.workflowStage ?? "listed");
  if (!DISCOVERED_BY.has(discoveredBy)) throw new EditorialError("INVALID_DISCOVERY", "발견 주체를 확인해 주세요.");
  if (!SCOPE_STATUSES.has(scopeStatus)) throw new EditorialError("INVALID_SCOPE", "조사 범위를 확인해 주세요.");
  if (!WORKFLOW_STAGES.has(workflowStage)) throw new EditorialError("INVALID_STAGE", "진행 상태를 확인해 주세요.");
  const descriptionStatus = String(input?.descriptionStatus ?? defaults.descriptionStatus ?? defaultDescriptionStatus({ workflowStage }));
  if (!DESCRIPTION_STATUSES.has(descriptionStatus)) throw new EditorialError("INVALID_DESCRIPTION_STATUS", "본문 상태를 확인해 주세요.");

  const title = requiredText(input?.title ?? defaults.title, "제목", 200);
  return {
    organizationId: requiredText(input?.organizationId ?? defaults.organizationId, "대학·구단", 200),
    discoveredBy,
    scopeStatus,
    workflowStage,
    title,
    aliases: uniqueTexts(input?.aliases ?? defaults.aliases ?? [], "별칭", 100),
    symbolicLines: normalizeSymbolicLines(input?.symbolicLines ?? defaults.symbolicLines ?? [title, ""]),
    descriptionText: limitedText(input?.descriptionText ?? defaults.descriptionText ?? "", "설명", 60_000),
    descriptionStatus,
    lyrics: normalizeLyrics(input?.lyrics ?? defaults.lyrics ?? { lines: [] }),
    quickFacts: normalizeQuickFacts(input?.quickFacts ?? defaults.quickFacts ?? []),
    videos: normalizeVideos(input?.videos ?? defaults.videos ?? []),
    relationships: normalizeRelationships(input?.relationships ?? defaults.relationships ?? []),
  };
}

// 본문 상태가 없던 기존 레코드는 이미 공개한 곡만 다듬은 본문으로 본다.
function defaultDescriptionStatus(song) {
  return song.workflowStage === "published" ? "polished" : "draft";
}

function validateTombstone(entity, label) {
  assertSafeId(entity.id, label);
  if (entity.deleted !== true || !Number.isInteger(entity.revision) || entity.revision < 1) {
    throw new EditorialError("INVALID_TOMBSTONE", `${label} 삭제 기록이 올바르지 않습니다.`, 500);
  }
}

function assertRevision(current, expectedRevision) {
  if (!Number.isInteger(expectedRevision) || current.revision !== expectedRevision) {
    throw new EditorialError(
      "REVISION_CONFLICT",
      "다른 화면에서 내용이 변경되었습니다. 새로고침한 뒤 다시 시도해 주세요.",
      409,
      [{ expectedRevision, currentRevision: current.revision }],
    );
  }
}

function ensureOrganizationExists(organizations, organizationId) {
  if (!organizations.some(({ id }) => id === organizationId)) {
    throw new EditorialError("ORGANIZATION_NOT_FOUND", "대학·구단을 찾을 수 없습니다.", 404);
  }
}

function ensureUniqueOrganizationName(organizations, name, excludedId = null) {
  const normalized = normalizeComparableTitle(name);
  const duplicate = organizations.find((organization) => (
    organization.id !== excludedId && normalizeComparableTitle(organization.name) === normalized
  ));
  if (duplicate) {
    throw new EditorialError("DUPLICATE_ORGANIZATION", `'${duplicate.name}'이 이미 있습니다.`, 409, [{ existingId: duplicate.id }]);
  }
}

function ensureUniqueSong(songs, candidate, excludedId = null) {
  const candidateNames = new Set([candidate.title, ...candidate.aliases].map(normalizeComparableTitle).filter(Boolean));
  const duplicate = songs.find((song) => (
    song.id !== excludedId
    && song.organizationId === candidate.organizationId
    && [song.title, ...(song.aliases ?? [])].some((value) => candidateNames.has(normalizeComparableTitle(value)))
  ));
  if (duplicate) {
    throw new EditorialError(
      "DUPLICATE_TITLE",
      `같은 대학·구단에 '${duplicate.title}'이 이미 있습니다.`,
      409,
      [{ existingId: duplicate.id }],
    );
  }
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

function normalizeSymbolicLines(value) {
  if (!Array.isArray(value)) throw new EditorialError("INVALID_SYMBOLIC_LINES", "대표 문구 형식이 올바르지 않습니다.");
  const lines = value.slice(0, 2).map((line) => limitedText(line, "대표 문구", 200).trim());
  while (lines.length < 2) lines.push("");
  return lines;
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

function normalizeRelationships(value) {
  if (!Array.isArray(value)) throw new EditorialError("INVALID_RELATIONSHIPS", "관계 형식이 올바르지 않습니다.");
  const result = [];
  const seen = new Set();
  for (const item of value.slice(0, 50)) {
    const type = String(item?.type ?? "");
    const targetId = String(item?.targetId ?? "").trim();
    if (!targetId) continue;
    if (!RELATIONSHIP_TYPES.has(type) || !SAFE_ID.test(targetId)) {
      throw new EditorialError("INVALID_RELATIONSHIP", "원곡·응원가 관계를 확인해 주세요.");
    }
    const key = `${type}\0${targetId}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ type, targetId });
    }
  }
  return result;
}

function normalizeColor(value, label) {
  const color = String(value ?? "").trim();
  if (!HEX_COLOR.test(color)) throw new EditorialError("INVALID_COLOR", `${label}은 #RRGGBB 형식이어야 합니다.`);
  return color.toUpperCase();
}

function slugSegment(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 64);
}

function organizationIdBase(name) {
  const slug = slugSegment(name);
  if (slug) return slug;
  const digest = createHash("sha256").update(String(name)).digest("hex").slice(0, 10);
  return `organization-${digest}`;
}

function songIdBase(organizationId, title) {
  const slug = slugSegment(title);
  if (slug) return `${organizationId}-${slug}`.slice(0, 150).replace(/-+$/u, "");
  const digest = createHash("sha256").update(`${organizationId}\0${title}`).digest("hex").slice(0, 10);
  return `${organizationId}-song-${digest}`;
}

function uniqueId(base, usedIds) {
  let id = base;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function stripRuntimeFields(entity) {
  const {
    isPublished: _isPublished,
    persisted: _persisted,
    songCount: _songCount,
    researchText: _researchText,
    ...stored
  } = entity;
  return stored;
}

function assertSafeId(id, label) {
  if (!SAFE_ID.test(String(id ?? ""))) {
    throw new EditorialError("INVALID_ID", `${label} ID가 올바르지 않습니다.`, 400);
  }
}

function compareOrganizations(left, right) {
  return left.type.localeCompare(right.type, "en") || left.name.localeCompare(right.name, "ko");
}

function compareSongs(left, right) {
  return left.organizationId.localeCompare(right.organizationId, "en") || left.title.localeCompare(right.title, "ko");
}
