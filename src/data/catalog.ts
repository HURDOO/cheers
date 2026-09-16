import publicCatalogData from "./generated/catalog.json";
import originalSongData from "../../data/original-songs.json";
import type {
  CatalogFile,
  CheerSong,
  CheerSongOriginType,
  CheerSongRecord,
  CheerSongYearStatus,
  OriginalSong,
  QuickFact,
  SourceReference,
  Team,
  YouTubeMedia,
} from "./types";

interface PublishedVideo {
  rank: number;
  role: "official-or-lyrics" | "featured-field" | "additional";
  sourceUrl: string;
  videoId: string;
  title: string;
  channelName: string;
  attributionText: string;
}

interface PublishedRelationship {
  type: "original-song" | "secondary-original-song" | "source-cheer-song";
  targetId: string;
}

interface PublishedLegacy {
  year?: number | null;
  timelineYear?: number | null;
  yearStatus?: CheerSongYearStatus;
  yearLabel?: string;
  originType?: CheerSongOriginType;
  originNote?: string;
  chronologyNote?: string;
  durationSeconds?: number | null;
  status?: "draft" | "verified";
  sources?: SourceReference[];
  description?: string;
  usageContext?: string;
}

interface PublishedSong {
  id: string;
  organizationId: string;
  title: string;
  aliases: string[];
  symbolicLines: string[];
  descriptionText: string;
  lyrics: { lines: string[]; collapsedPreviewLineCount: number };
  quickFacts: QuickFact[];
  videos: PublishedVideo[];
  relationships: PublishedRelationship[];
  legacy?: PublishedLegacy;
  sourceRevision: number;
  contentHash: string;
}

interface PublishedCatalog {
  schemaVersion: 1;
  releaseId: string;
  generatedAt: string;
  organizations: Team[];
  songs: PublishedSong[];
}

const publicCatalog = publicCatalogData as PublishedCatalog;
const originalsFile = originalSongData as CatalogFile<OriginalSong>;

function assertUniqueIds(label: string, records: Array<{ id: string }>) {
  const ids = new Set<string>();
  records.forEach(({ id }) => {
    if (ids.has(id)) throw new Error(`${label}: 중복 ID '${id}'`);
    ids.add(id);
  });
}

function assertCatalogIntegrity() {
  if (publicCatalog.schemaVersion !== 1 || originalsFile.schemaVersion !== 1) {
    throw new Error("지원하지 않는 데이터 스키마 버전입니다.");
  }
  assertUniqueIds("generated/catalog.json organizations", publicCatalog.organizations);
  assertUniqueIds("generated/catalog.json songs", publicCatalog.songs);
  assertUniqueIds("original-songs.json", originalsFile.items);
  const teamIds = new Set(publicCatalog.organizations.map(({ id }) => id));
  publicCatalog.songs.forEach((song) => {
    if (!teamIds.has(song.organizationId)) {
      throw new Error(`응원가 '${song.id}'의 organizationId '${song.organizationId}'를 찾을 수 없습니다.`);
    }
  });
}

assertCatalogIntegrity();

export const PUBLIC_RELEASE = {
  id: publicCatalog.releaseId,
  generatedAt: publicCatalog.generatedAt,
} as const;

export const TEAMS: readonly Team[] = publicCatalog.organizations;

const baseOriginals = originalsFile.items;
const baseOriginalIds = new Set(baseOriginals.map(({ id }) => id));
const syntheticOriginals: OriginalSong[] = publicCatalog.songs
  .filter((song) => {
    const originalId = relationshipTargets(song, "original-song")[0];
    return !originalId || !baseOriginalIds.has(originalId);
  })
  .map((song) => ({
    id: `unlinked-${song.id}`,
    title: "원곡 정보 준비 중",
    artist: "미등록",
    kind: "source",
    year: null,
    yearLabel: "연도 미상",
    status: "verified",
  }));

export const ORIGINAL_SONGS: readonly OriginalSong[] = [...baseOriginals, ...syntheticOriginals];

const teamById = new Map(TEAMS.map((team) => [team.id, team]));
const originalSongById = new Map(ORIGINAL_SONGS.map((song) => [song.id, song]));
const syntheticOriginalBySongId = new Map(syntheticOriginals.map((original) => [original.id.slice("unlinked-".length), original.id]));

function relationshipTargets(song: PublishedSong, type: PublishedRelationship["type"]) {
  return song.relationships.filter((relationship) => relationship.type === type).map(({ targetId }) => targetId);
}

function timelineYear(song: PublishedSong): number | null {
  if (Number.isInteger(song.legacy?.timelineYear)) return song.legacy!.timelineYear!;
  const match = song.quickFacts[0]?.value.match(/(?:18|19|20)\d{2}/u);
  return match ? Number.parseInt(match[0], 10) : null;
}

function parseYouTubeTimeValue(value: string | null): number | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;

  const numeric = normalized.match(/^(\d+(?:\.\d+)?)s?$/u);
  if (numeric) {
    const seconds = Math.floor(Number.parseFloat(numeric[1]));
    return seconds > 0 ? seconds : undefined;
  }

  const colonParts = normalized.split(":");
  if (colonParts.length >= 2 && colonParts.length <= 3 && colonParts.every((part) => /^\d+$/u.test(part))) {
    const seconds = colonParts.reduce((total, part) => total * 60 + Number.parseInt(part, 10), 0);
    return seconds > 0 ? seconds : undefined;
  }

  const units = normalized.match(/^(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?$/u);
  if (!units || !units.slice(1).some(Boolean)) return undefined;
  const seconds = Math.floor(
    Number.parseFloat(units[1] ?? "0") * 3600
    + Number.parseFloat(units[2] ?? "0") * 60
    + Number.parseFloat(units[3] ?? "0"),
  );
  return seconds > 0 ? seconds : undefined;
}

export function parseYouTubeStartSeconds(sourceUrl: string): number | undefined {
  try {
    const url = new URL(sourceUrl);
    const queryValue = url.searchParams.get("t") ?? url.searchParams.get("start");
    const hashValue = new URLSearchParams(url.hash.replace(/^#/u, "")).get("t");
    return parseYouTubeTimeValue(queryValue ?? hashValue);
  } catch {
    return undefined;
  }
}

function toYouTubeMedia(song: PublishedSong, video: PublishedVideo): YouTubeMedia {
  const role = video.role === "featured-field"
    ? "stadium-recording"
    : video.role === "official-or-lyrics" ? "official-performance" : "reference";
  const startSeconds = parseYouTubeStartSeconds(video.sourceUrl);
  return {
    id: `youtube-${song.id}-${video.rank}`,
    cheerSongId: song.id,
    videoId: video.videoId,
    title: video.title || `${song.title} 영상 ${video.rank}`,
    channelName: video.channelName || "채널 정보 없음",
    channelType: "fan",
    role,
    sourceUrl: video.sourceUrl,
    preferred: video.rank === 1,
    availability: "unchecked",
    rank: video.rank,
    ...(startSeconds ? { startSeconds } : {}),
    attributionText: video.attributionText || undefined,
  };
}

export const YOUTUBE_MEDIA: readonly YouTubeMedia[] = publicCatalog.songs.flatMap((song) => (
  song.videos.map((video) => toYouTubeMedia(song, video))
));

export const CHEER_SONGS: readonly CheerSong[] = publicCatalog.songs.map((published) => {
  const team = teamById.get(published.organizationId)!;
  const requestedOriginalId = relationshipTargets(published, "original-song")[0];
  const originalSongId = requestedOriginalId && originalSongById.has(requestedOriginalId)
    ? requestedOriginalId
    : syntheticOriginalBySongId.get(published.id)!;
  const secondaryOriginalSongIds = relationshipTargets(published, "secondary-original-song")
    .filter((id) => originalSongById.has(id));
  const sourceCheerSongId = relationshipTargets(published, "source-cheer-song")[0];
  const videos = published.videos.map((video) => toYouTubeMedia(published, video)).sort((left, right) => (left.rank ?? 99) - (right.rank ?? 99));
  const previewLines = published.lyrics.lines.filter((line) => line.trim() !== "");
  const yearValue = timelineYear(published);
  const record: CheerSongRecord = {
    id: published.id,
    title: published.title,
    aliases: published.aliases,
    symbolicLines: [published.symbolicLines[0] ?? "", published.symbolicLines[1] ?? ""],
    teamId: published.organizationId,
    originalSongId,
    ...(secondaryOriginalSongIds.length ? { secondaryOriginalSongIds } : {}),
    ...(sourceCheerSongId ? { sourceCheerSongId } : {}),
    originType: published.legacy?.originType ?? "adaptation",
    originNote: published.legacy?.originNote ?? "",
    year: published.legacy?.year ?? null,
    timelineYear: yearValue,
    yearStatus: published.legacy?.yearStatus ?? "reported",
    yearLabel: published.legacy?.yearLabel || published.quickFacts[0]?.value || "시기 미상",
    chronologyNote: published.legacy?.chronologyNote ?? "",
    ...(published.legacy?.durationSeconds ? { durationSeconds: published.legacy.durationSeconds } : {}),
    lyrics: published.lyrics.lines,
    description: published.legacy?.description || published.descriptionText,
    descriptionText: published.descriptionText,
    usageContext: published.legacy?.usageContext ?? "",
    quickFacts: published.quickFacts,
    status: "verified",
    ...(published.legacy?.sources?.length ? { sources: published.legacy.sources } : {}),
  };

  return {
    ...record,
    abbr: team.abbreviation,
    team: team.name,
    teamType: team.type,
    teamColor: team.colors.primary,
    teamColorAlt: team.colors.secondary,
    region: team.region,
    duration: videos[0]?.durationSeconds ?? record.durationSeconds ?? null,
    lyricLine1: previewLines[0] ?? "",
    lyricLine2: previewLines[1] ?? "",
    symbolicLine1: record.symbolicLines[0],
    symbolicLine2: record.symbolicLines[1],
    youtubeMedia: videos[0],
    youtubeMediaList: videos,
  };
});

export function getOriginalSong(id: string) {
  return originalSongById.get(id);
}

const cheerSongById = new Map(CHEER_SONGS.map((song) => [song.id, song]));

export function getCheerSong(id: string) {
  return cheerSongById.get(id);
}
