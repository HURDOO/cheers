import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ExternalLink, Mic, Share2 } from "lucide-react";
import { InlineNotes } from "../components/InlineNotes";
import { getCheerSong, getOriginalSong } from "../../data/catalog";
import type { CheerSong, OriginalSong } from "../../data/types";
import { LyricCard, openSongLink, songStyle, type Navigate } from "./LyricCard";
import { SingAlong } from "./SingAlong";
import { VideoPlayer } from "./VideoPlayer";
import {
  ORDERED_SONGS,
  isCommissioned,
  isUnlinked,
  originalYearLabel,
  songHref,
  songsOfOriginal,
  toStanzas,
  yearBadge,
} from "./lib";

const SOURCE_SCOPE_LABEL = { title: "표기", origin: "원곡", chronology: "연도", usage: "용례" } as const;

function OriginPanel({ song, original, navigate }: { song: CheerSong; original: OriginalSong; navigate: Navigate }) {
  const sourceCheer = song.sourceCheerSongId ? getCheerSong(song.sourceCheerSongId) : undefined;
  const secondaryOriginals = (song.secondaryOriginalSongIds ?? [])
    .map((id) => getOriginalSong(id))
    .filter((item): item is OriginalSong => Boolean(item));

  if (isUnlinked(original)) {
    return (
      <section className="origin origin--pending" aria-label="원곡">
        <span className="origin__label">원곡</span>
        <p className="origin__title">원곡 정보 준비 중</p>
      </section>
    );
  }

  const commissioned = isCommissioned(song, original);
  const meta = [originalYearLabel(original), original.genre, original.country].filter(Boolean).join(" · ");

  return (
    <section className="origin" aria-label="원곡">
      <span className="origin__label">{commissioned ? "응원가로 새로 만든 곡" : "이 응원가의 원곡"}</span>
      <p className="origin__title">{original.title}</p>
      <p className="origin__artist">{original.artist}</p>
      {meta && <p className="origin__meta">{meta}</p>}
      {song.originNote && <p className="origin__note">{song.originNote}</p>}

      {(secondaryOriginals.length > 0 || sourceCheer) && (
        <ul className="origin__extra">
          {secondaryOriginals.map((secondary) => (
            <li key={secondary.id}><span>함께 쓴 모티브</span>{secondary.title} · {secondary.artist}</li>
          ))}
          {sourceCheer && (
            <li>
              <span>먼저 불린 응원가</span>
              <a href={songHref(sourceCheer.id)} onClick={(event) => openSongLink(event, sourceCheer.id, navigate)}>
                {sourceCheer.title} · {sourceCheer.team}
              </a>
            </li>
          )}
        </ul>
      )}

      {original.sources?.[0] && (
        <a className="origin__link" href={original.sources[0].url} target="_blank" rel="noreferrer">
          원곡 출처 <ExternalLink size={12} />
        </a>
      )}
    </section>
  );
}

/** 폰에서는 기본 공유 창을, 그 외에는 링크 복사를 씁니다. 주소는 곡별 미리보기가 붙는 /songs/<id>/ 입니다. */
function ShareButton({ song }: { song: CheerSong }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${songHref(song.id)}`;
    const title = `${song.title} · ${song.team} 응원가`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // 사용자가 공유 창을 닫은 경우입니다.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("링크를 복사하세요", url);
    }
  }

  return (
    <button type="button" className="sing-button sing-button--ghost" onClick={share}>
      {copied ? <><Check size={16} /> 링크 복사됨</> : <><Share2 size={16} /> 공유</>}
    </button>
  );
}

function Lyrics({ song, onSing }: { song: CheerSong; onSing: () => void }) {

  const stanzas = toStanzas(song.lyrics);

  return (
    <section className="lyrics" aria-labelledby="lyrics-title">
      <div className="lyrics__head">
        <h2 id="lyrics-title" className="section-label">가사</h2>
        <button type="button" className="sing-button sing-button--quiet" onClick={onSing}>
          <Mic size={15} /> 따라 부르기
        </button>
      </div>
      <div className="lyrics__body">
        {stanzas.map((stanza, index) => (
          <p key={index}>
            {stanza.map((line, lineIndex) => <span key={lineIndex}>{line}</span>)}
          </p>
        ))}
      </div>
    </section>
  );
}

function Facts({ song }: { song: CheerSong }) {
  const facts = (song.quickFacts ?? []).filter(({ value }) => value && value.trim() && value.trim() !== "—");

  return (
    <section aria-labelledby="facts-title">
      <h2 id="facts-title" className="section-label">기본 정보</h2>
      <dl className="facts">
      {facts.map(({ label, value }, index) => (
        <div key={`${index}-${label}`}>
          <dt>{label || "정보"}</dt>
          <dd>{value}</dd>
        </div>
      ))}
      {song.aliases.length > 0 && (
        <div>
          <dt>다른 이름</dt>
          <dd>{song.aliases.join(", ")}</dd>
        </div>
      )}
      {song.chronologyNote && (
        <div className="facts__wide">
          <dt>도입 시점</dt>
          <dd>{song.chronologyNote}</dd>
        </div>
      )}
      </dl>
    </section>
  );
}

export function SongPage({ song, navigate, singing, onSing }: {
  song: CheerSong;
  navigate: Navigate;
  singing: boolean;
  onSing: (singing: boolean) => void;
}) {
  const original = getOriginalSong(song.originalSongId)!;
  const titleRef = useRef<HTMLHeadingElement>(null);
  const story = song.descriptionText
    ?? [song.description, song.usageContext].filter((value, index, values) => value && values.indexOf(value) === index).join("\n\n");
  const siblings = songsOfOriginal(song.originalSongId).filter(({ id }) => id !== song.id);
  const position = ORDERED_SONGS.findIndex(({ id }) => id === song.id);
  const siblingIds = new Set(siblings.map(({ id }) => id));
  const nextSongs = Array.from({ length: ORDERED_SONGS.length - 1 }, (_, offset) => ORDERED_SONGS[(position + offset + 1) % ORDERED_SONGS.length])
    .filter(({ id }) => !siblingIds.has(id))
    .slice(0, 3);
  const heroLines = [song.symbolicLine1, song.symbolicLine2].filter(Boolean);
  const hasLyrics = song.lyrics.some((line) => line.trim());
  const openSing = () => onSing(true);
  const closeSing = useCallback(() => onSing(false), [onSing]);

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [song.id]);

  return (
    <article className="song" style={songStyle(song, heroLines)}>
      {singing && hasLyrics && <SingAlong song={song} onClose={closeSing} />}
      <header className="song__hero">
        <div className="song__heading">
          <p className="song__meta">
            <span>{song.teamType === "baseball" ? "야구" : "대학"}</span>
            <span>{song.team}</span>
            {yearBadge(song) && <span>{yearBadge(song)}</span>}
          </p>
          <h1 ref={titleRef} tabIndex={-1} className="song__title">{song.title}</h1>
          <div className="song__actions">
            {hasLyrics && (
              <button type="button" className="sing-button" onClick={openSing}>
                <Mic size={16} /> 따라 부르기
              </button>
            )}
            <ShareButton song={song} />
          </div>
          {heroLines.length > 0 && (
            <p className="song__lyrics" aria-label={`대표 가사: ${heroLines.join(" ")}`}>
              {heroLines.map((line) => <span key={line}>{line}</span>)}
            </p>
          )}
        </div>
      </header>

      <div className="song__layout">
        <aside className="song__aside">
          <OriginPanel song={song} original={original} navigate={navigate} />
          <VideoPlayer key={song.id} song={song} />
        </aside>

        <div className="song__main">
          {hasLyrics && <Lyrics song={song} onSing={openSing} />}
          <Facts song={song} />
          {story && (
            <section className="story" aria-labelledby="story-title">
              <h2 id="story-title" className="section-label">이야기</h2>
              <InlineNotes text={story} className="story__body" />
            </section>
          )}
          {(song.sources?.length ?? 0) > 0 && (
            <section className="refs" aria-labelledby="refs-title">
              <h2 id="refs-title" className="section-label">참고 자료</h2>
              <ul>
                {song.sources!.map((source) => (
                  <li key={`${source.scope ?? "source"}-${source.url}`}>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.scope && <span>{SOURCE_SCOPE_LABEL[source.scope]}</span>}
                      {source.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {siblings.length > 0 && (
        <section className="more" aria-labelledby="siblings-title">
          <p className="eyebrow">같은 원곡 · {original.title}</p>
          <h2 id="siblings-title" className="more__title">같은 멜로디로 불리는 다른 응원가</h2>
          <div className="grid">
            {siblings.map((item) => <LyricCard key={item.id} song={item} navigate={navigate} showOrigin={false} />)}
          </div>
        </section>
      )}

      <section className="more" aria-labelledby="next-title">
        <h2 id="next-title" className="more__title">이어서 볼 응원가</h2>
        <div className="grid">
          {nextSongs.map((item) => <LyricCard key={item.id} song={item} navigate={navigate} />)}
        </div>
      </section>
    </article>
  );
}
