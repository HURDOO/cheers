import cheerSongData from "../../data/cheer-songs.json";
import mediaData from "../../data/media.json";
import originalSongData from "../../data/original-songs.json";
import teamData from "../../data/teams.json";
import type {
  CatalogFile,
  CheerSong,
  CheerSongRecord,
  OriginalSong,
  Team,
  YouTubeMedia,
} from "./types";

const teamsFile = teamData as CatalogFile<Team>;
const originalsFile = originalSongData as CatalogFile<OriginalSong>;
const cheerSongsFile = cheerSongData as CatalogFile<CheerSongRecord>;
const mediaFile = mediaData as CatalogFile<YouTubeMedia>;

function assertUniqueIds(label: string, records: Array<{ id: string }>) {
  const ids = new Set<string>();

  records.forEach(({ id }) => {
    if (ids.has(id)) throw new Error(`${label}: 중복 ID '${id}'`);
    ids.add(id);
  });
}

function assertCatalogIntegrity() {
  if (
    teamsFile.schemaVersion !== 1 ||
    originalsFile.schemaVersion !== 1 ||
    cheerSongsFile.schemaVersion !== 1 ||
    mediaFile.schemaVersion !== 1
  ) {
    throw new Error("지원하지 않는 데이터 스키마 버전입니다.");
  }

  assertUniqueIds("teams.json", teamsFile.items);
  assertUniqueIds("original-songs.json", originalsFile.items);
  assertUniqueIds("cheer-songs.json", cheerSongsFile.items);
  assertUniqueIds("media.json", mediaFile.items);

  const teamIds = new Set(teamsFile.items.map(({ id }) => id));
  const originalSongIds = new Set(originalsFile.items.map(({ id }) => id));
  const cheerSongIds = new Set(cheerSongsFile.items.map(({ id }) => id));

  cheerSongsFile.items.forEach((song) => {
    if (!teamIds.has(song.teamId)) {
      throw new Error(`응원가 '${song.id}'의 teamId '${song.teamId}'를 찾을 수 없습니다.`);
    }
    if (!originalSongIds.has(song.originalSongId)) {
      throw new Error(`응원가 '${song.id}'의 originalSongId '${song.originalSongId}'를 찾을 수 없습니다.`);
    }
    song.secondaryOriginalSongIds?.forEach((originalSongId) => {
      if (!originalSongIds.has(originalSongId)) {
        throw new Error(`응원가 '${song.id}'의 secondaryOriginalSongId '${originalSongId}'를 찾을 수 없습니다.`);
      }
    });
    if (song.sourceCheerSongId && !cheerSongIds.has(song.sourceCheerSongId)) {
      throw new Error(`응원가 '${song.id}'의 sourceCheerSongId '${song.sourceCheerSongId}'를 찾을 수 없습니다.`);
    }
  });

  mediaFile.items.forEach((media) => {
    if (!cheerSongIds.has(media.cheerSongId)) {
      throw new Error(`미디어 '${media.id}'의 cheerSongId '${media.cheerSongId}'를 찾을 수 없습니다.`);
    }
  });
}

assertCatalogIntegrity();

export const TEAMS: readonly Team[] = teamsFile.items;
export const ORIGINAL_SONGS: readonly OriginalSong[] = originalsFile.items;
export const YOUTUBE_MEDIA: readonly YouTubeMedia[] = mediaFile.items;

const teamById = new Map(TEAMS.map((team) => [team.id, team]));
const originalSongById = new Map(ORIGINAL_SONGS.map((song) => [song.id, song]));
const mediaByCheerSongId = new Map<string, YouTubeMedia[]>();

YOUTUBE_MEDIA.forEach((media) => {
  const current = mediaByCheerSongId.get(media.cheerSongId) ?? [];
  current.push(media);
  mediaByCheerSongId.set(media.cheerSongId, current);
});

export const CHEER_SONGS: readonly CheerSong[] = cheerSongsFile.items.map((song) => {
  const team = teamById.get(song.teamId)!;
  const youtubeMediaList = [...(mediaByCheerSongId.get(song.id) ?? [])].sort((left, right) => {
    const leftRank = left.rank ?? (left.preferred ? 1 : Number.MAX_SAFE_INTEGER);
    const rightRank = right.rank ?? (right.preferred ? 1 : Number.MAX_SAFE_INTEGER);
    return leftRank - rightRank || left.id.localeCompare(right.id, "en");
  });
  const youtubeMedia = youtubeMediaList[0];
  const previewLines = song.lyrics.filter((line) => line.trim() !== "");

  return {
    ...song,
    abbr: team.abbreviation,
    team: team.name,
    teamType: team.type,
    teamColor: team.colors.primary,
    teamColorAlt: team.colors.secondary,
    region: team.region,
    duration: youtubeMedia?.durationSeconds ?? song.durationSeconds ?? null,
    lyricLine1: previewLines[0] ?? "",
    lyricLine2: previewLines[1] ?? "",
    symbolicLine1: song.symbolicLines[0],
    symbolicLine2: song.symbolicLines[1],
    youtubeMedia,
    youtubeMediaList,
  };
});

export function getOriginalSong(id: string) {
  return originalSongById.get(id);
}

const cheerSongById = new Map(CHEER_SONGS.map((song) => [song.id, song]));

export function getCheerSong(id: string) {
  return cheerSongById.get(id);
}
