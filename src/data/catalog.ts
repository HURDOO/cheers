import cheerSongData from "../../data/cheer-songs.json";
import originalSongData from "../../data/original-songs.json";
import teamData from "../../data/teams.json";
import type {
  CatalogFile,
  CheerSong,
  CheerSongRecord,
  OriginalSong,
  Team,
} from "./types";

const teamsFile = teamData as CatalogFile<Team>;
const originalsFile = originalSongData as CatalogFile<OriginalSong>;
const cheerSongsFile = cheerSongData as CatalogFile<CheerSongRecord>;

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
    cheerSongsFile.schemaVersion !== 1
  ) {
    throw new Error("지원하지 않는 데이터 스키마 버전입니다.");
  }

  assertUniqueIds("teams.json", teamsFile.items);
  assertUniqueIds("original-songs.json", originalsFile.items);
  assertUniqueIds("cheer-songs.json", cheerSongsFile.items);

  const teamIds = new Set(teamsFile.items.map(({ id }) => id));
  const originalSongIds = new Set(originalsFile.items.map(({ id }) => id));

  cheerSongsFile.items.forEach((song) => {
    if (!teamIds.has(song.teamId)) {
      throw new Error(`응원가 '${song.id}'의 teamId '${song.teamId}'를 찾을 수 없습니다.`);
    }
    if (!originalSongIds.has(song.originalSongId)) {
      throw new Error(`응원가 '${song.id}'의 originalSongId '${song.originalSongId}'를 찾을 수 없습니다.`);
    }
  });
}

assertCatalogIntegrity();

export const TEAMS: readonly Team[] = teamsFile.items;
export const ORIGINAL_SONGS: readonly OriginalSong[] = originalsFile.items;

const teamById = new Map(TEAMS.map((team) => [team.id, team]));
const originalSongById = new Map(ORIGINAL_SONGS.map((song) => [song.id, song]));

export const CHEER_SONGS: readonly CheerSong[] = cheerSongsFile.items.map((song) => {
  const team = teamById.get(song.teamId)!;

  return {
    ...song,
    abbr: team.abbreviation,
    team: team.name,
    teamType: team.type,
    teamColor: team.colors.primary,
    teamColorAlt: team.colors.secondary,
    region: team.region,
    duration: song.durationSeconds,
    lyricLine1: song.lyrics[0] ?? "",
    lyricLine2: song.lyrics[1] ?? "",
  };
});

export function getOriginalSong(id: string) {
  return originalSongById.get(id);
}

