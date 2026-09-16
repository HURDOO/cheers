import { Fragment, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Headphones, Play, X } from "lucide-react";
import { getCheerSong } from "../../data/catalog";
import type { ResolvedSideContent, Side, SongSummary } from "../korea-yonsei-games-2026/eventTypes";
import { SharedYouTubeFrame, useDPlayback } from "./playback";

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
      {song.media ? song.media.embeddable === false ? <a className="listening-player__find" href={song.media.sourceUrl} target="_blank" rel="noreferrer"><span>임베드가 제한된 영상입니다.<br />YouTube에서 {song.title} 재생</span><ArrowUpRight size={20} aria-hidden="true" /></a> : playing ? <SharedYouTubeFrame
        videoId={song.media.videoId}
        startSeconds={song.media.startSeconds}
        title={`${song.title} 영상`}
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
  const { activeKey, activate, close } = useDPlayback();
  const [essential, setEssential] = useState(content.mustKnowSongs[0]);
  const [memory, setMemory] = useState<SongSummary | null>(null);
  const playerPanels = useRef<Record<string, HTMLDivElement | null>>({});
  const essentialButtons = useRef<Record<string, HTMLButtonElement | null>>({});
  const memoryButtons = useRef<Record<string, HTMLButtonElement | null>>({});

  function playerKey(group: "essential" | "memory", song: SongSummary) {
    return `${group}:${song.id}`;
  }

  function revealPlayer(key: string) {
    requestAnimationFrame(() => playerPanels.current[key]?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "nearest",
    }));
  }

  function selectEssential(song: SongSummary) {
    const key = playerKey("essential", song);
    setEssential(song);
    if (activeKey === key) close();
    else { activate(key); revealPlayer(key); }
  }

  function selectMemory(song: SongSummary) {
    const key = playerKey("memory", song);
    setMemory(song);
    if (activeKey === key) close();
    else { activate(key); revealPlayer(key); }
  }

  function closePlayer(group: "essential" | "memory", song: SongSummary) {
    close();
    requestAnimationFrame(() => {
      const buttons = group === "essential" ? essentialButtons : memoryButtons;
      buttons.current[song.id]?.focus({ preventScroll: true });
    });
  }

  return <>
    <section className="match-songs" id="match-songs" aria-labelledby="match-songs-title">
      <div className="match-shell">
        <header className="match-section-heading listening-heading">
          <div><strong>행사 전 꼭 들을 {content.mustKnowSongs.length}곡</strong></div>
          <h2 id="match-songs-title">{side === "yonsei" ? "연대," : "고대,"}<br /><em>{side === "yonsei" ? "함성 발사!" : "애니멀 사운드 발사!"}</em></h2>
          <p>대표 응원가부터 올해 신곡까지. <br />응원석에서 함께 부를 여섯 곡을 미리 들어보세요.</p>
        </header>
        <div className="match-songs__layout is-inline">
          <div className="match-song-list" role="group" aria-label="필수 응원가 6곡">
            {content.mustKnowSongs.map((song, index) => {
              const key = playerKey("essential", song);
              const isActive = activeKey === key;
              return <Fragment key={song.id}>
                <button ref={(element) => { essentialButtons.current[song.id] = element; }} type="button" className={isActive ? "is-active" : ""} aria-pressed={isActive} aria-expanded={isActive} aria-controls={`essential-player-${song.id}`} onClick={() => selectEssential(song)}>
                  <span>{String(index + 1).padStart(2, "0")}</span><div><strong>{song.title}</strong>{getListeningNote(song).line && <span className="listening-song-line">{getListeningNote(song).line}</span>}</div><Play size={16} fill={isActive ? "currentColor" : "none"} aria-hidden="true" />
                </button>
                {isActive && essential.id === song.id && <div className="listening-inline-player" id={`essential-player-${song.id}`} ref={(element) => { playerPanels.current[key] = element; }} data-playback-key={key}>
                  <ListeningPlayer song={essential} queue={content.mustKnowSongs} onSelect={selectEssential} playing onPlay={() => activate(playerKey("essential", essential))} onClose={() => closePlayer("essential", essential)} closeLabel="필수 응원가 플레이어 닫기" />
                </div>}
              </Fragment>;
            })}
          </div>
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
          {content.memorySongs.map((song, index) => {
            const key = playerKey("memory", song);
            const isActive = activeKey === key;
            return <Fragment key={song.id}>
              <button ref={(element) => { memoryButtons.current[song.id] = element; }} type="button" aria-pressed={isActive} aria-expanded={isActive} aria-controls={`memory-player-${song.id}`} onClick={() => selectMemory(song)}>
                <span>{String(index + 1).padStart(2, "0")}</span><div><strong>{song.title}</strong>{getListeningNote(song).line && <span className="listening-song-line">{getListeningNote(song).line}</span>}</div><Play size={17} fill={isActive ? "currentColor" : "none"} aria-hidden="true" />
              </button>
              {isActive && memory?.id === song.id && <div className="match-memory__player listening-inline-player" id={`memory-player-${song.id}`} ref={(element) => { playerPanels.current[key] = element; }} data-playback-key={key}>
                <ListeningPlayer song={memory} queue={content.memorySongs} onSelect={selectMemory} playing onPlay={() => activate(playerKey("memory", memory))} onClose={() => closePlayer("memory", memory)} />
              </div>}
            </Fragment>;
          })}
        </div>
      </div>
    </section>
  </>;
}
