import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Headphones, Play, X } from "lucide-react";
import { getCheerSong } from "../../data/catalog";
import type { ResolvedSideContent, Side, SongSummary } from "../korea-yonsei-games-2026/eventTypes";

// Short excerpt checked against the official cheer squad's online OT.
// https://www.youtube.com/watch?v=1VSZTxcxEcU — D preview only, not a catalog publication.
const PREVIEW_LINES: Record<string, string> = {
  "korea-university-elise-reul-wihayeo": "지성의 힘으로 야성의 힘으로",
  // Sentence-like excerpts for D's editorial list, not the main archive's chant cards.
  // https://namu.moe/w/연세대학교/응원가/2000년%20이전
  "yonsei-university-wonsirim": "일어나 이제는 응원을 해야지!",
  // https://tcatmon.com/wiki/연세대학교/응원가
  "yonsei-university-yonseiyeo-saranghanda": "내 가슴속에 영원히 남을 사랑이 되어라",
  // Correct the preview's '외쳐랴' typo without editing the approved catalog.
  "yonsei-university-haneul-kkeutkkaji": "승리를 향해 외쳐라 하늘 끝까지",
};

export function getListeningNote(song: SongSummary) {
  const canonical = getCheerSong(song.id);
  // Keep D's reviewed preview excerpts, then reuse available lyrics or approved lines.
  const line = PREVIEW_LINES[song.id] ?? song.lyrics?.find((text) => text.trim())
    ?? canonical?.symbolicLines.filter(Boolean).join(" ");
  const description = song.id === "yonsei-university-wonsirim"
    ? "연고전에서 점수가 날 때마다 부르는 응원곡. 고대의 뱃노래와 대조된다."
    : canonical?.description ?? song.description;
  return { line, description };
}

export function ListeningPlayer({ song, queue, playing, onPlay, onSelect, onClose, closeLabel = "다시 듣기 플레이어 닫기" }: {
  song: SongSummary; queue: SongSummary[]; playing: boolean;
  onPlay: () => void; onSelect: (song: SongSummary) => void; onClose?: () => void;
  closeLabel?: string;
}) {
  const note = getListeningNote(song);
  function move(offset: number) {
    const index = queue.findIndex((item) => item.id === song.id);
    onSelect(queue[(index + offset + queue.length) % queue.length]);
  }
  return <aside className="match-player listening-player" aria-label={`${song.title} 상세 정보`}>
    <div className="match-player__top">
      <span><Headphones size={15} aria-hidden="true" />{song.teamName}</span>
      <div>
        <button type="button" aria-label="이전 곡" onClick={() => move(-1)}><ArrowLeft size={17} /></button>
        <button type="button" aria-label="다음 곡" onClick={() => move(1)}><ArrowRight size={17} /></button>
        {onClose && <button type="button" aria-label={closeLabel} onClick={onClose}><X size={17} /></button>}
      </div>
    </div>
    <div className="match-player__screen">
      {song.media ? playing ? <iframe
        key={song.media.videoId}
        src={`https://www.youtube.com/embed/${song.media.videoId}?autoplay=1&playsinline=1&rel=0&start=${song.media.startSeconds ?? 0}`}
        title={`${song.title} 영상`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin" allowFullScreen
      /> : <button className="listening-player__play" type="button" onClick={onPlay} aria-label={`${song.title} 영상 재생`}>
        <img src={`https://i.ytimg.com/vi/${song.media.videoId}/hqdefault.jpg`} alt="" width="480" height="360" loading="lazy" onError={(e) => { e.currentTarget.hidden = true; }} />
        <span><Play size={25} fill="currentColor" aria-hidden="true" /></span>
      </button> : <a className="listening-player__find" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.teamName} 응원가 ${song.title}`)}`} target="_blank" rel="noreferrer">{song.title} 영상 찾기<ArrowUpRight size={20} aria-hidden="true" /></a>}
    </div>
    <div className="match-player__body">
      <h3>{song.title}</h3>
      {note.line && <blockquote className="listening-player__line">{note.line}</blockquote>}
      <p>{note.description}</p>
      <div className="match-player__links">
        {song.media && <a href={song.media.sourceUrl} target="_blank" rel="noreferrer">{song.media.channelName ?? "YouTube"}<ArrowUpRight size={14} aria-hidden="true" /></a>}
        {song.archiveHref && <a className="listening-player__detail" href={song.archiveHref}>자세히 보기<ArrowRight size={16} aria-hidden="true" /></a>}
      </div>
    </div>
  </aside>;
}

export function SongSections({ side, content }: { side: Side; content: ResolvedSideContent }) {
  const [essential, setEssential] = useState(content.mustKnowSongs[0]);
  const [memory, setMemory] = useState<SongSummary | null>(null);
  // Only one listening iframe is mounted across the two sections.
  const [playingId, setPlayingId] = useState<string | null>(null);
  const memoryPlayer = useRef<HTMLDivElement>(null);
  const memoryButtons = useRef<Record<string, HTMLButtonElement | null>>({});
  function selectEssential(song: SongSummary) { setEssential(song); setPlayingId(null); }
  function selectMemory(song: SongSummary) {
    setMemory(song); setPlayingId(null);
    requestAnimationFrame(() => memoryPlayer.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" }));
  }
  return <>
    <section className="match-songs" id="match-songs" aria-labelledby="match-songs-title">
      <div className="match-shell">
        <header className="match-section-heading listening-heading">
          <div><strong>행사 전 꼭 들을 {content.mustKnowSongs.length}곡</strong></div>
          <h2 id="match-songs-title">{side === "yonsei" ? "연대," : "고대,"}<br /><em>{side === "yonsei" ? "함성 발사!" : "애니멀 사운드 발사!"}</em></h2>
          <p>대표 응원가부터 올해 신곡까지. <br />응원석에서 함께 부를 여섯 곡을 미리 들어보세요.</p>
        </header>
        <div className="match-songs__layout">
          <div className="match-song-list" role="group" aria-label="필수 응원가 6곡">
            {content.mustKnowSongs.map((song, index) => <button key={song.id} type="button" className={essential.id === song.id ? "is-active" : ""} aria-pressed={essential.id === song.id} onClick={() => selectEssential(song)}>
              <span>{String(index + 1).padStart(2, "0")}</span><div><strong>{song.title}</strong>{getListeningNote(song).line && <span className="listening-song-line">{getListeningNote(song).line}</span>}</div><Play size={16} fill={essential.id === song.id ? "currentColor" : "none"} aria-hidden="true" />
            </button>)}
          </div>
          <ListeningPlayer song={essential} queue={content.mustKnowSongs} onSelect={selectEssential} playing={playingId === essential.id} onPlay={() => setPlayingId(essential.id)} />
        </div>
      </div>
    </section>
    <section className="match-memory" id="match-memory" aria-labelledby="match-memory-title">
      <div className="match-shell">
        <header className="match-section-heading listening-heading">
          <div><strong>다시 듣기 {content.memorySongs.length}곡</strong></div>
          <h2 id="match-memory-title">1학기, 어디까지<br /><em>기억나?</em></h2>
          <p>1학기 합동응원전에서 들었던, <br />한 소절 들으면 따라부를 수 있는 노래들</p>
        </header>
        <div className="match-memory__rail" role="group" aria-label="1학기 응원가 8곡">
          {content.memorySongs.map((song, index) => <button key={song.id} ref={(element) => { memoryButtons.current[song.id] = element; }} type="button" aria-pressed={memory?.id === song.id} aria-controls="match-memory-player" onClick={() => selectMemory(song)}>
            <span>{String(index + 1).padStart(2, "0")}</span><div><strong>{song.title}</strong>{getListeningNote(song).line && <span className="listening-song-line">{getListeningNote(song).line}</span>}</div><Play size={17} fill={memory?.id === song.id ? "currentColor" : "none"} aria-hidden="true" />
          </button>)}
        </div>
        <div className="match-memory__player" id="match-memory-player" ref={memoryPlayer} hidden={!memory}>
          {memory && <ListeningPlayer song={memory} queue={content.memorySongs} onSelect={selectMemory} playing={playingId === memory.id} onPlay={() => setPlayingId(memory.id)} onClose={() => {
            setMemory(null); setPlayingId(null); requestAnimationFrame(() => memoryButtons.current[memory.id]?.focus({ preventScroll: true }));
          }} />}
        </div>
      </div>
    </section>
  </>;
}
