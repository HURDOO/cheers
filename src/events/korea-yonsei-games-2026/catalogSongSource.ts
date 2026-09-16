import {
  CHEER_SONGS,
  ORIGINAL_SONGS,
  TEAMS,
  getCheerSong,
  getOriginalSong,
} from "../../data/catalog";
import type { CheerSong } from "../../data/types";
import type {
  CheerSongSource,
  LineageFamily,
  RelationKind,
  SongSummary,
  TeamSummary,
} from "./eventTypes";

function teamHref(name: string, type: "baseball" | "university") {
  return `/?view=team&type=${type}&q=${encodeURIComponent(name)}`;
}

function toTeamSummary(team: (typeof TEAMS)[number]): TeamSummary {
  return {
    id: team.id,
    name: team.name,
    shortName: team.name.replace(/대학교| 베어스| 트윈스| 이글스| 타이거즈| 히어로즈| 자이언츠/u, ""),
    abbreviation: team.abbreviation,
    primaryColor: team.colors.primary,
    secondaryColor: team.colors.secondary,
    archiveHref: teamHref(team.name, team.type),
  };
}

function toSongSummary(song: CheerSong): SongSummary {
  return {
    id: song.id,
    title: song.title,
    teamId: song.teamId,
    teamName: song.team,
    teamShortName: song.team.replace(/대학교| 베어스| 트윈스| 이글스| 타이거즈| 히어로즈| 자이언츠/u, ""),
    description: song.descriptionText ?? song.description,
    tags: [song.teamType === "university" ? "대학 응원" : "프로야구", song.yearLabel],
    aliases: song.aliases,
    yearLabel: song.yearLabel,
    usageContext: song.usageContext,
    chronologyNote: song.chronologyNote,
    lyrics: song.lyrics,
    durationSeconds: song.duration ?? undefined,
    media: song.youtubeMedia ? {
      kind: "youtube",
      videoId: song.youtubeMedia.videoId,
      sourceUrl: song.youtubeMedia.sourceUrl,
      startSeconds: song.youtubeMedia.startSeconds,
      title: song.youtubeMedia.title,
      channelName: song.youtubeMedia.channelName,
    } : undefined,
    archiveHref: `/?song=${encodeURIComponent(song.id)}`,
    dataStatus: song.status === "verified" ? "verified" : "mock",
  };
}

function relationKind(song: CheerSong): RelationKind {
  if (song.sourceCheerSongId) return "cheer_to_cheer_adaptation";
  return "same_original";
}

function toFamily(originalId: string): LineageFamily | undefined {
  const original = getOriginalSong(originalId);
  if (!original) return undefined;

  const members = CHEER_SONGS
    .filter((song) => song.originalSongId === originalId)
    .map((song) => ({ song: toSongSummary(song), relationKind: relationKind(song) }));

  if (!members.length) return undefined;

  return {
    id: original.id,
    original: {
      id: original.id,
      title: original.title,
      artist: original.artist,
      yearLabel: original.yearLabel ?? (original.year ? String(original.year) : undefined),
    },
    members,
    note: "정본 카탈로그에서 같은 원곡과 직접 차용 관계를 연결한 계보입니다.",
    archiveHref: `/?view=origin&q=${encodeURIComponent(original.title)}`,
  };
}

const teamById = new Map(TEAMS.map((team) => [team.id, toTeamSummary(team)]));
const originalIds = new Set(ORIGINAL_SONGS.map((original) => original.id));

/**
 * 응원가가 정본에 모두 들어오면 songSource.ts의 export만 이 소스로 교체합니다.
 * 이벤트 컴포넌트와 큐레이션 ID는 그대로 유지됩니다.
 */
export const catalogSongSource: CheerSongSource = {
  getSong(id) {
    const song = getCheerSong(id);
    return song ? toSongSummary(song) : undefined;
  },
  getTeam(id) {
    return teamById.get(id);
  },
  getFamily(id) {
    return originalIds.has(id) ? toFamily(id) : undefined;
  },
};
