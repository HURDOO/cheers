import type { CSSProperties, MouseEvent } from "react";
import type { CheerSong } from "../../data/types";
import { lyricFit, originLine, songHref, yearBadge } from "./lib";

export type Navigate = (songId: string | null) => void;

export function openSongLink(event: MouseEvent<HTMLAnchorElement>, songId: string, navigate: Navigate) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigate(songId);
}

export function songStyle(song: CheerSong, lines: string[] = [song.symbolicLine1, song.symbolicLine2]) {
  return {
    "--c1": song.teamColor,
    "--c2": song.teamColorAlt,
    "--fit": lyricFit(lines),
  } as CSSProperties;
}

export function LyricCard({ song, navigate, showOrigin = true, matchedLines }: {
  song: CheerSong;
  navigate: Navigate;
  showOrigin?: boolean;
  /** 검색어가 걸린 가사 줄. 있으면 대표 가사 대신 밝게 보여 줍니다. */
  matchedLines?: string[] | null;
}) {
  const origin = showOrigin ? originLine(song) : null;
  const lines = matchedLines ?? [song.symbolicLine1, song.symbolicLine2];

  return (
    <a
      className="lcard"
      href={songHref(song.id)}
      onClick={(event) => openSongLink(event, song.id, navigate)}
      style={songStyle(song, lines)}
      aria-label={`${song.title} · ${song.team}`}
    >
      <span className="lcard__top">
        <span className="lcard__abbr">{song.abbr}</span>
        {yearBadge(song) && <span className="lcard__year">{yearBadge(song)}</span>}
      </span>
      <span className={`lcard__lyrics ${matchedLines ? "is-match" : ""}`} aria-hidden={!matchedLines}>
        {lines.map((line, index) => <span key={index}>{line}</span>)}
      </span>
      <span className="lcard__bottom">
        <span className="lcard__title">{song.title}</span>
        <span className="lcard__team">{song.team}</span>
        {origin && (
          <span className="lcard__origin">
            <span>{origin.label}</span>
            {origin.title}
          </span>
        )}
      </span>
    </a>
  );
}
