import { parseInlineNotes } from "../../../shared/inline-notes.mjs";
import { CHEER_SONGS, ORIGINAL_SONGS, TEAMS, getOriginalSong } from "../../data/catalog";
import type { CheerSong, OriginalSong } from "../../data/types";

export type TeamFilter = "all" | "baseball" | "university" | string;

/** 연도를 알 수 없으면 null을 돌려주고, 화면에서는 배지를 생략합니다. */
export function yearBadge(song: CheerSong) {
  if (song.timelineYear === null) {
    const label = song.yearLabel?.trim();
    return label && label !== "-" && label !== "—" ? label : null;
  }
  if (song.yearStatus === "confirmed" && song.year !== null) return String(song.year);
  if (song.yearStatus === "earliest-documented") return `${song.timelineYear} 확인`;
  return `${song.timelineYear} 추정`;
}

export function originalYearLabel(original: OriginalSong) {
  return original.yearLabel ?? (original.year === null ? "연도 미상" : String(original.year));
}

export function isUnlinked(original: OriginalSong) {
  return original.id.startsWith("unlinked-");
}

export function isCommissioned(song: CheerSong, original = getOriginalSong(song.originalSongId)) {
  return song.originType === "commissioned-original" || original?.kind === "commissioned";
}

/** 카드 하단에 붙는 "원곡 · 제목" 한 줄. */
export function originLine(song: CheerSong) {
  const original = getOriginalSong(song.originalSongId);
  if (!original || isUnlinked(original)) return null;
  if (isCommissioned(song, original)) return { label: "자체 제작", title: original.title };
  return { label: "원곡", title: original.title };
}

const originalOrder = new Map(ORIGINAL_SONGS.map((original, index) => [original.id, index]));

function byTimeline(left: CheerSong, right: CheerSong) {
  return (left.timelineYear ?? Number.MAX_SAFE_INTEGER) - (right.timelineYear ?? Number.MAX_SAFE_INTEGER);
}

/** Admin에서 정한 원곡 순서를 따르고, 같은 원곡 안에서는 오래된 순. */
export const ORDERED_SONGS: readonly CheerSong[] = [...CHEER_SONGS].sort((left, right) => (
  (originalOrder.get(left.originalSongId) ?? 999) - (originalOrder.get(right.originalSongId) ?? 999)
  || byTimeline(left, right)
));

export function songsOfOriginal(originalId: string) {
  return ORDERED_SONGS.filter((song) => song.originalSongId === originalId);
}

/** 응원가가 두 곡 이상 연결된 원곡만 모은 "같은 멜로디" 묶음. */
export const SHARED_ORIGINALS = ORIGINAL_SONGS
  .map((original) => ({ original, songs: songsOfOriginal(original.id) }))
  .filter(({ original, songs }) => songs.length > 1 && !isUnlinked(original));

/** 이야기 첫 문단을 주석 없이 한 덩어리 문장으로 만듭니다. */
export function storyExcerpt(song: CheerSong) {
  const firstParagraph = (song.descriptionText || song.description || "").split(/\n{2,}/u)[0] ?? "";
  return parseInlineNotes(firstParagraph)
    .filter((token) => token.type !== "note")
    .map((token) => token.value)
    .join("")
    .replace(/\s+/gu, " ")
    .trim();
}

/** 히어로 배너에 쓸 곡: 실제 원곡이 따로 있는 응원가. */
export const HERO_SONGS = ORDERED_SONGS.filter((song) => {
  const original = getOriginalSong(song.originalSongId);
  return original && !isUnlinked(original) && !isCommissioned(song, original) && song.symbolicLine1;
});

const teamsInUse = new Set(CHEER_SONGS.map((song) => song.teamId));
const songCountByTeam = new Map<string, number>();
CHEER_SONGS.forEach((song) => songCountByTeam.set(song.teamId, (songCountByTeam.get(song.teamId) ?? 0) + 1));

export const FILTER_TEAMS = TEAMS
  .filter((team) => teamsInUse.has(team.id))
  .sort((left, right) => (
    (left.type === right.type ? 0 : left.type === "university" ? -1 : 1)
    || (songCountByTeam.get(right.id) ?? 0) - (songCountByTeam.get(left.id) ?? 0)
    || left.name.localeCompare(right.name, "ko")
  ));

export const STATS = {
  songs: CHEER_SONGS.length,
  originals: new Set(CHEER_SONGS.map((song) => song.originalSongId)).size,
  teams: teamsInUse.size,
};

export function matchesFilter(song: CheerSong, filter: TeamFilter) {
  if (filter === "all") return true;
  if (filter === "baseball" || filter === "university") return song.teamType === filter;
  return song.teamId === filter;
}

export function matchesSearch(song: CheerSong, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko");
  if (!normalizedQuery) return true;

  const original = getOriginalSong(song.originalSongId);
  return [song.title, ...song.aliases, ...song.symbolicLines, song.team, song.region, original?.title, original?.artist]
    .filter(Boolean)
    .some((value) => value!.toLocaleLowerCase("ko").includes(normalizedQuery));
}

/** 가사 줄이 카드 폭을 꽉 채우도록 쓰는 대략적인 글자 폭(공백은 좁게). */
export function visualLength(line: string) {
  let length = 0;
  for (const character of line) length += character === " " ? 0.28 : /[A-Za-z0-9]/u.test(character) ? 0.58 : 0.9;
  return Math.max(length, 3);
}

export function lyricFit(lines: string[]) {
  return Math.max(...lines.filter(Boolean).map(visualLength), 3);
}

export function teamGradient(song: Pick<CheerSong, "teamColor" | "teamColorAlt">) {
  return `linear-gradient(145deg, ${song.teamColor} 0%, ${song.teamColorAlt} 100%)`;
}

export function songHref(songId: string) {
  return `?song=${encodeURIComponent(songId)}`;
}

