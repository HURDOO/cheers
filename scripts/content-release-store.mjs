import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { EditorialError } from "./content-editorial-store.mjs";

const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const VIDEO_ROLES = ["official-or-lyrics", "featured-field", "additional", "additional", "additional"];
const INTERNAL_SONG_FIELDS = new Set([
  "workflowStage",
  "scopeStatus",
  "discoveredBy",
  "researchText",
  "createdAt",
  "updatedAt",
  "revision",
  "isPublished",
  "persisted",
]);

export class ContentReleaseStore {
  constructor(projectRoot, editorialStore, { now = () => new Date() } = {}) {
    this.projectRoot = path.resolve(projectRoot);
    this.editorialStore = editorialStore;
    this.now = now;
    this.dataDirectory = path.join(this.projectRoot, "data");
    this.releasesDirectory = path.join(this.projectRoot, "content", "releases");
    this.generatedDirectory = path.join(this.projectRoot, "src", "data", "generated");
    this.generatedCatalogPath = path.join(this.generatedDirectory, "catalog.json");
  }

  async initialize() {
    await Promise.all([
      mkdir(this.releasesDirectory, { recursive: true }),
      mkdir(this.generatedDirectory, { recursive: true }),
    ]);
    try {
      const catalog = await this.readCurrent();
      validatePublicCatalog(catalog);
      return catalog;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      return (await this.#seedFromCanonicalCatalog()).catalog;
    }
  }

  async readCurrent() {
    return JSON.parse(await readFile(this.generatedCatalogPath, "utf8"));
  }

  async describe(editorialState = null) {
    const [catalog, state, canonicalById] = await Promise.all([
      this.initialize(),
      editorialState ? Promise.resolve(editorialState) : this.editorialStore.state(),
      this.#canonicalSongMap(),
    ]);
    const releasedById = new Map(catalog.songs.map((song) => [song.id, song]));
    const releasedOrganizationById = new Map(catalog.organizations.map((organization) => [organization.id, organization]));
    const organizationById = new Map(state.organizations.map((organization) => [organization.id, organization]));
    const songs = {};

    for (const song of state.songs) {
      const released = releasedById.get(song.id);
      if (!released) {
        songs[song.id] = { status: "unpublished", releaseId: null, sourceRevision: null };
        continue;
      }
      const organization = organizationById.get(song.organizationId);
      const current = toPublicSong(song, canonicalById.get(song.id));
      const organizationIsCurrent = organization
        && JSON.stringify(releasedOrganizationById.get(organization.id)) === JSON.stringify(toPublicOrganization(organization));
      songs[song.id] = {
        status: released.contentHash === current.contentHash && organizationIsCurrent ? "current" : "changes_pending",
        releaseId: catalog.releaseId,
        sourceRevision: released.sourceRevision,
      };
    }

    return {
      current: {
        releaseId: catalog.releaseId,
        generatedAt: catalog.generatedAt,
        songCount: catalog.songs.length,
      },
      songs,
    };
  }

  async publishSongs(items) {
    const requested = normalizeRequestedItems(items);
    const [current, state, canonicalById] = await Promise.all([
      this.initialize(),
      this.editorialStore.state(),
      this.#canonicalSongMap(),
    ]);
    const songById = new Map(state.songs.map((song) => [song.id, song]));
    const organizationById = new Map(state.organizations.map((organization) => [organization.id, organization]));
    const nextSongs = new Map(current.songs.map((song) => [song.id, song]));
    const nextOrganizations = new Map(current.organizations.map((organization) => [organization.id, organization]));

    for (const request of requested) {
      const song = songById.get(request.id);
      if (!song) throw new EditorialError("SONG_NOT_FOUND", `응원가 '${request.id}'을 찾을 수 없습니다.`, 404);
      if (song.revision !== request.expectedRevision) {
        throw new EditorialError("REVISION_CONFLICT", `${song.title}이 변경되었습니다. 새로고침한 뒤 다시 시도해 주세요.`, 409);
      }
      if (song.scopeStatus === "rejected") {
        throw new EditorialError("REJECTED_SONG", `${song.title}은 조사 제외 상태라 공개할 수 없습니다.`);
      }
      const organization = organizationById.get(song.organizationId);
      if (!organization) throw new EditorialError("ORGANIZATION_NOT_FOUND", `${song.title}의 대학·구단을 찾을 수 없습니다.`);
      nextOrganizations.set(organization.id, toPublicOrganization(organization));
      nextSongs.set(song.id, toPublicSong(song, canonicalById.get(song.id)));
    }

    return this.#commit({
      current,
      organizations: [...nextOrganizations.values()],
      songs: [...nextSongs.values()],
      action: "publish",
      changedSongIds: requested.map(({ id }) => id),
    });
  }

  async unpublishSongs(items) {
    const requested = normalizeRequestedItems(items);
    const [current, state] = await Promise.all([this.initialize(), this.editorialStore.state()]);
    const songById = new Map(state.songs.map((song) => [song.id, song]));
    const nextSongs = new Map(current.songs.map((song) => [song.id, song]));

    for (const request of requested) {
      const song = songById.get(request.id);
      if (!song) throw new EditorialError("SONG_NOT_FOUND", `응원가 '${request.id}'을 찾을 수 없습니다.`, 404);
      if (song.revision !== request.expectedRevision) {
        throw new EditorialError("REVISION_CONFLICT", `${song.title}이 변경되었습니다. 새로고침한 뒤 다시 시도해 주세요.`, 409);
      }
      nextSongs.delete(song.id);
    }

    return this.#commit({
      current,
      organizations: current.organizations,
      songs: [...nextSongs.values()],
      action: "unpublish",
      changedSongIds: requested.map(({ id }) => id),
    });
  }

  async #seedFromCanonicalCatalog() {
    const [teams, cheerSongs, media] = await Promise.all([
      this.#catalog("teams.json"),
      this.#catalog("cheer-songs.json"),
      this.#catalog("media.json"),
    ]);
    const mediaBySongId = new Map();
    for (const item of media) {
      const group = mediaBySongId.get(item.cheerSongId) ?? [];
      group.push(item);
      mediaBySongId.set(item.cheerSongId, group);
    }
    const songs = cheerSongs.map((song) => toPublicSong(
      canonicalToEditorialSong(song, mediaBySongId.get(song.id) ?? []),
      song,
    ));
    return this.#commit({
      current: null,
      organizations: teams.map(toPublicOrganization),
      songs,
      action: "seed",
      changedSongIds: songs.map(({ id }) => id),
    });
  }

  async #commit({ current, organizations, songs, action, changedSongIds }) {
    const now = this.now();
    const generatedAt = now.toISOString();
    const sortedOrganizations = [...organizations].sort((left, right) => left.id.localeCompare(right.id, "en"));
    const sortedSongs = [...songs].sort((left, right) => left.id.localeCompare(right.id, "en"));
    const digest = createHash("sha256")
      .update(JSON.stringify({ parentReleaseId: current?.releaseId ?? null, action, changedSongIds, sortedOrganizations, sortedSongs }))
      .digest("hex")
      .slice(0, 10);
    const stamp = generatedAt.replace(/[-:.]/gu, "");
    const releaseId = `${stamp}-${digest}`;
    const catalog = {
      schemaVersion: 1,
      releaseId,
      generatedAt,
      organizations: sortedOrganizations,
      songs: sortedSongs,
    };
    const snapshot = {
      ...catalog,
      parentReleaseId: current?.releaseId ?? null,
      action,
      changedSongIds: [...changedSongIds],
    };
    validatePublicCatalog(catalog);
    await writeFile(
      path.join(this.releasesDirectory, `${releaseId}.json`),
      `${JSON.stringify(snapshot, null, 2)}\n`,
      { encoding: "utf8", flag: "wx" },
    );
    await writeJsonAtomic(this.generatedCatalogPath, catalog);
    return { release: snapshot, catalog };
  }

  async #canonicalSongMap() {
    return new Map((await this.#catalog("cheer-songs.json")).map((song) => [song.id, song]));
  }

  async #catalog(fileName) {
    const value = JSON.parse(await readFile(path.join(this.dataDirectory, fileName), "utf8"));
    if (value?.schemaVersion !== 1 || !Array.isArray(value.items)) {
      throw new EditorialError("INVALID_CATALOG", `${fileName} 형식이 올바르지 않습니다.`, 500);
    }
    return value.items;
  }
}

export function toPublicOrganization(organization) {
  return {
    id: String(organization.id),
    name: String(organization.name),
    abbreviation: String(organization.abbreviation),
    type: organization.type,
    region: String(organization.region),
    colors: {
      primary: String(organization.colors?.primary),
      secondary: String(organization.colors?.secondary),
    },
  };
}

export function toPublicSong(song, canonical = null) {
  const canonicalLegacy = canonical ? {
    year: canonical.year ?? null,
    timelineYear: canonical.timelineYear ?? null,
    yearStatus: canonical.yearStatus ?? "reported",
    yearLabel: canonical.yearLabel ?? "",
    originType: canonical.originType ?? "adaptation",
    originNote: canonical.originNote ?? "",
    chronologyNote: canonical.chronologyNote ?? "",
    durationSeconds: canonical.durationSeconds ?? null,
    status: canonical.status ?? "verified",
    sources: canonical.sources ?? [],
    description: canonical.description ?? "",
    usageContext: canonical.usageContext ?? "",
  } : null;
  const legacy = canonicalLegacy || song.legacy
    ? { ...canonicalLegacy, ...(song.legacy ?? {}) }
    : null;
  const payload = {
    id: String(song.id),
    organizationId: String(song.organizationId),
    title: String(song.title),
    aliases: [...(song.aliases ?? [])],
    symbolicLines: [...(song.symbolicLines ?? [])].slice(0, 2),
    descriptionText: String(song.descriptionText ?? ""),
    lyrics: {
      lines: [...(song.lyrics?.lines ?? [])],
      collapsedPreviewLineCount: 2,
    },
    quickFacts: [...(song.quickFacts ?? [])].slice(0, 3).map((item) => ({
      label: String(item.label ?? ""),
      value: String(item.value ?? ""),
    })),
    videos: [...(song.videos ?? [])].map((video) => ({
      rank: Number(video.rank),
      role: video.role,
      sourceUrl: String(video.sourceUrl),
      videoId: String(video.videoId),
      title: String(video.title ?? ""),
      channelName: String(video.channelName ?? ""),
      attributionText: String(video.attributionText ?? ""),
    })),
    relationships: [...(song.relationships ?? [])].map((relationship) => ({
      type: relationship.type,
      targetId: String(relationship.targetId),
    })),
    ...(legacy ? { legacy } : {}),
  };
  return {
    ...payload,
    sourceRevision: Number.isInteger(song.revision) ? song.revision : 0,
    contentHash: hashPublicSong(payload),
  };
}

export function validatePublicCatalog(catalog) {
  const details = [];
  if (catalog?.schemaVersion !== 1) details.push("공개 카탈로그 schemaVersion은 1이어야 합니다.");
  if (!String(catalog?.releaseId ?? "").trim()) details.push("공개 카탈로그 releaseId가 없습니다.");
  if (Number.isNaN(Date.parse(catalog?.generatedAt))) details.push("공개 카탈로그 생성 시각이 올바르지 않습니다.");
  if (!Array.isArray(catalog?.organizations)) details.push("공개 대학·구단 목록이 없습니다.");
  if (!Array.isArray(catalog?.songs)) details.push("공개 응원가 목록이 없습니다.");
  if (details.length > 0) throw new EditorialError("INVALID_PUBLIC_CATALOG", "공개 카탈로그가 올바르지 않습니다.", 500, details);

  const organizationIds = new Set();
  for (const organization of catalog.organizations) {
    if (!SAFE_ID.test(organization?.id ?? "")) details.push(`대학·구단 ID '${organization?.id ?? ""}'가 올바르지 않습니다.`);
    if (organizationIds.has(organization.id)) details.push(`대학·구단 ID '${organization.id}'가 중복되었습니다.`);
    organizationIds.add(organization.id);
    if (!String(organization.name ?? "").trim()) details.push(`${organization.id}: 이름이 없습니다.`);
  }

  const songIds = new Set();
  for (const song of catalog.songs) {
    if (!SAFE_ID.test(song?.id ?? "")) details.push(`응원가 ID '${song?.id ?? ""}'가 올바르지 않습니다.`);
    if (songIds.has(song.id)) details.push(`응원가 ID '${song.id}'가 중복되었습니다.`);
    songIds.add(song.id);
    if (!organizationIds.has(song.organizationId)) details.push(`${song.id}: 공개 대학·구단을 찾을 수 없습니다.`);
    if (!String(song.title ?? "").trim()) details.push(`${song.id}: 제목이 없습니다.`);
    if (!Array.isArray(song.aliases) || !Array.isArray(song.symbolicLines)) details.push(`${song.id}: 제목 보조 정보가 올바르지 않습니다.`);
    if (!Array.isArray(song.lyrics?.lines) || !Array.isArray(song.quickFacts) || !Array.isArray(song.videos) || !Array.isArray(song.relationships)) {
      details.push(`${song.id}: 공개 본문 부가 정보가 올바르지 않습니다.`);
    }
    const ranks = new Set();
    for (const video of song.videos ?? []) {
      if (!Number.isInteger(video.rank) || video.rank < 1 || video.rank > 5 || ranks.has(video.rank)) {
        details.push(`${song.id}: 영상 순위가 올바르지 않습니다.`);
      }
      ranks.add(video.rank);
    }
    for (const relationship of song.relationships ?? []) {
      if (!SAFE_ID.test(relationship.targetId ?? "")) details.push(`${song.id}: 관계 ID가 올바르지 않습니다.`);
    }
    for (const field of INTERNAL_SONG_FIELDS) {
      if (Object.hasOwn(song, field)) details.push(`${song.id}: 내부 필드 '${field}'가 공개 데이터에 포함되었습니다.`);
    }
    const { contentHash, sourceRevision: _sourceRevision, ...payload } = song;
    if (!Number.isInteger(song.sourceRevision) || song.sourceRevision < 0) details.push(`${song.id}: 원본 revision이 올바르지 않습니다.`);
    if (contentHash !== hashPublicSong(payload)) details.push(`${song.id}: 공개 내용 해시가 일치하지 않습니다.`);
  }

  if (details.length > 0) throw new EditorialError("INVALID_PUBLIC_CATALOG", "공개 카탈로그가 올바르지 않습니다.", 500, details);
  return catalog;
}

function canonicalToEditorialSong(song, media) {
  const storyParts = [song.description, song.usageContext]
    .map((value) => String(value ?? "").trim())
    .filter((value, index, values) => value && values.indexOf(value) === index);
  const sortedMedia = [...media].sort((left, right) => Number(right.preferred) - Number(left.preferred));
  return {
    id: song.id,
    organizationId: song.teamId,
    title: song.title,
    aliases: song.aliases ?? [],
    symbolicLines: song.symbolicLines ?? [],
    descriptionText: storyParts.join("\n\n"),
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
    revision: 0,
  };
}

function normalizeRequestedItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new EditorialError("EMPTY_PUBLICATION", "공개할 응원가를 한 곡 이상 선택해 주세요.");
  }
  if (items.length > 200) throw new EditorialError("PUBLICATION_TOO_LARGE", "한 번에 최대 200곡까지 공개할 수 있습니다.", 413);
  const result = items.map((item) => ({ id: String(item?.id ?? ""), expectedRevision: item?.expectedRevision }));
  const ids = new Set();
  for (const item of result) {
    if (!SAFE_ID.test(item.id)) throw new EditorialError("INVALID_SONG_ID", "공개할 응원가 ID가 올바르지 않습니다.");
    if (!Number.isInteger(item.expectedRevision) || item.expectedRevision < 0) throw new EditorialError("INVALID_REVISION", "응원가 revision이 올바르지 않습니다.");
    if (ids.has(item.id)) throw new EditorialError("DUPLICATE_PUBLICATION", "같은 응원가를 두 번 공개할 수 없습니다.");
    ids.add(item.id);
  }
  return result;
}

function hashPublicSong(payload) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function writeJsonAtomic(filePath, value) {
  const temporaryPath = `${filePath}.${process.pid}.${createHash("sha256").update(`${Date.now()}-${Math.random()}`).digest("hex").slice(0, 10)}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
}
