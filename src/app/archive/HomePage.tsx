import { useState } from "react";
import { ArrowLeft, ArrowRight, Search, X } from "lucide-react";
import { getOriginalSong } from "../../data/catalog";
import { LyricCard, openSongLink, songStyle, type Navigate } from "./LyricCard";
import {
  FILTER_TEAMS,
  HERO_SONGS,
  ORDERED_SONGS,
  SHARED_ORIGINALS,
  STATS,
  matchedLyricLines,
  matchesFilter,
  matchesSearch,
  originalYearLabel,
  songHref,
  storyExcerpt,
  yearBadge,
  type TeamFilter,
} from "./lib";

// ── 대표 응원가 배너 ─────────────────────────────────────────────────────────

function Feature({ navigate }: { navigate: Navigate }) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * HERO_SONGS.length));
  const song = HERO_SONGS[index];
  const original = getOriginalSong(song.originalSongId)!;
  const lines = [song.symbolicLine1, song.symbolicLine2].filter(Boolean);
  const excerpt = storyExcerpt(song);

  function move(step: number) {
    setIndex((current) => (current + step + HERO_SONGS.length) % HERO_SONGS.length);
  }

  return (
    <section className="feature" aria-labelledby="feature-title">
      <div className="feature__bar">
        <div>
          <h1 id="feature-title" className="feature__heading">대학·야구 응원가와 그 원곡</h1>
          <p className="feature__stats">응원가 {STATS.songs} · 원곡 {STATS.originals} · 학교·구단 {STATS.teams}</p>
        </div>
        <div className="feature__nav">
          <span>{index + 1} / {HERO_SONGS.length}</span>
          <button type="button" onClick={() => move(-1)} aria-label="이전 응원가"><ArrowLeft size={16} /></button>
          <button type="button" onClick={() => move(1)} aria-label="다음 응원가"><ArrowRight size={16} /></button>
        </div>
      </div>

      <div className="feature__card" style={songStyle(song, lines)} key={song.id}>
        <div className="feature__main">
          <p className="feature__meta">
            <span>{song.team}</span>
            {yearBadge(song) && <span>{yearBadge(song)}</span>}
          </p>
          <p className="feature__lyrics" aria-hidden="true">
            {lines.map((line) => <span key={line}>{line}</span>)}
          </p>
          <a className="feature__title" href={songHref(song.id)} onClick={(event) => openSongLink(event, song.id, navigate)}>
            {song.title}
          </a>
        </div>

        <div className="feature__side">
          <span className="feature__label">원곡</span>
          <p className="feature__original">{original.title}</p>
          <p className="feature__artist">{original.artist} · {originalYearLabel(original)}</p>
          {excerpt && <p className="feature__excerpt">{excerpt}</p>}
          <a className="feature__more" href={songHref(song.id)} onClick={(event) => openSongLink(event, song.id, navigate)}>
            가사와 이야기 보기 <ArrowRight size={15} />
          </a>
        </div>
      </div>
    </section>
  );
}

// ── 목록 ──────────────────────────────────────────────────────────────────────

function FilterBar({ filter, query, onFilter, onQuery }: {
  filter: TeamFilter;
  query: string;
  onFilter: (filter: TeamFilter) => void;
  onQuery: (query: string) => void;
}) {
  const chips: Array<{ value: TeamFilter; label: string; color?: string }> = [
    { value: "all", label: "전체" },
    { value: "university", label: "대학" },
    { value: "baseball", label: "야구" },
    ...FILTER_TEAMS.map((team) => ({ value: team.id, label: team.name, color: team.colors.primary })),
  ];

  return (
    <div className="filters">
      <label className="search">
        <Search size={16} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="응원가, 가사 한 구절, 원곡으로 찾기"
          aria-label="응원가 검색"
          type="search"
        />
        {query && (
          <button type="button" onClick={() => onQuery("")} aria-label="검색어 지우기"><X size={14} /></button>
        )}
      </label>
      <div className="chips" role="group" aria-label="학교·구단 선택">
        {chips.map((chip, index) => (
          <button
            key={chip.value}
            type="button"
            className={`chip ${index === 3 ? "chip--split" : ""}`}
            aria-pressed={filter === chip.value}
            onClick={() => onFilter(chip.value)}
          >
            {chip.color && <i style={{ background: chip.color }} />}
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SharedOriginals({ navigate }: { navigate: Navigate }) {
  return (
    <section className="block" aria-labelledby="shared-title">
      <header className="block__head">
        <p className="eyebrow">같은 멜로디, 다른 응원석</p>
        <h2 id="shared-title" className="block__title">한 곡이 여러 응원가가 되기도 합니다</h2>
        <p className="block__desc">같은 원곡이 학교와 구단을 건너 다른 가사로 불린 경우입니다.</p>
      </header>
      <div className="shared">
        {SHARED_ORIGINALS.map(({ original, songs }) => (
          <article key={original.id} className="shared__row">
            <div className="shared__origin">
              <span className="shared__label">원곡</span>
              <h3>{original.title}</h3>
              <p>{original.artist}</p>
              <span className="shared__count">{originalYearLabel(original)} · 응원가 {songs.length}곡</span>
            </div>
            <div className="shared__songs">
              {songs.map((song) => <LyricCard key={song.id} song={song} navigate={navigate} showOrigin={false} />)}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HomePage({ filter, query, onFilter, onQuery, navigate }: {
  filter: TeamFilter;
  query: string;
  onFilter: (filter: TeamFilter) => void;
  onQuery: (query: string) => void;
  navigate: Navigate;
}) {
  const results = ORDERED_SONGS.filter((song) => matchesFilter(song, filter) && matchesSearch(song, query));
  const isBrowsingAll = filter === "all" && !query.trim();
  const activeLabel = filter === "all" ? "전체 응원가"
    : filter === "university" ? "대학 응원가"
      : filter === "baseball" ? "야구 응원가"
        : `${FILTER_TEAMS.find((team) => team.id === filter)?.name ?? ""} 응원가`;

  return (
    <>
      <Feature navigate={navigate} />

      <div id="songs" className="browse">
        <FilterBar filter={filter} query={query} onFilter={onFilter} onQuery={onQuery} />

        {isBrowsingAll && <SharedOriginals navigate={navigate} />}

        <section className="block" aria-labelledby="all-title">
          <header className="block__head block__head--row">
            <h2 id="all-title" className="block__title">
              {query.trim() ? `‘${query.trim()}’ 검색 결과` : activeLabel}
            </h2>
            <span className="block__count">{results.length}곡</span>
          </header>
          {results.length ? (
            <div className="grid">
              {results.map((song) => (
                <LyricCard key={song.id} song={song} navigate={navigate} matchedLines={matchedLyricLines(song, query)} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <p>찾는 응원가가 아직 없어요.</p>
              <span>다른 이름이나 가사 한 구절로 검색해 보세요.</span>
              {filter !== "all" && (
                <button type="button" className="chip" onClick={() => onFilter("all")}>전체에서 찾기</button>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
