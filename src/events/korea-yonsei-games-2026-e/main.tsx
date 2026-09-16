import { Fragment, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Headphones, Pause, Play, X } from "lucide-react";
import "../../styles/index.css";
import type { Side, SongSummary } from "../korea-yonsei-games-2026/eventTypes";
import { EVENT, SIDE_META, TIMELINE } from "../korea-yonsei-games-2026/eventConfig";
import { getSideContent } from "../korea-yonsei-games-2026/eventContent";
import { getListeningNote } from "../korea-yonsei-games-2026-d/SongSections";
import { archiveHref, campusPerformances, extraConnections, familiarPairs, rivalryPerformances, rivalryReplies, type VideoClip } from "./storyData";
import "../korea-yonsei-games-2026-c/styles.css";
import "../korea-yonsei-games-2026-d/hero.css";
import "../korea-yonsei-games-2026-d/rivalry.css";
import "../korea-yonsei-games-2026-d/baseball.css";
import "../korea-yonsei-games-2026-d/styles.css";
import "../korea-yonsei-games-2026-d/listening.css";
import "../korea-yonsei-games-2026-d/schedule.css";
import "../korea-yonsei-games-2026-d/baseball-layout.css";
import "../korea-yonsei-games-2026-d/light-band.css";
import "./styles.css";

const E_LISTENING_LINES: Record<string, string> = {
  "korea-university-minjogui-aria": "조국의 영원한 고동이 되리라",
  "korea-university-forever": "우리의 함성은 신화가 되리라",
  "korea-university-deureora-boara-geurigo-gieokhara": "기억하라 우리의 붉은 함성을",
  "korea-university-seungni-ui-hamseong": "승리의 함성 외쳐라 고대 영원한 승리 노래하라",
  "yonsei-university-wonsirim": "앉고 서고 STOP, 뛰고뛰고뛰고",
  "yonsei-university-yonseiyeo-saranghanda": "내 가슴속에 영원히 남을 사랑이 되어라",
  "yonsei-university-haneul-kkeutkkaji": "승리를 향해 외쳐라 하늘 끝까지",
};

function getEContent(side: Side) {
  const content = getSideContent(side);
  const songs = content.mustKnowSongs.map((song) => E_LISTENING_LINES[song.id]
    ? { ...song, lyrics: [E_LISTENING_LINES[song.id]] }
    : song);
  if (side === "yonsei") {
    const index = songs.findIndex((song) => song.id === "yonsei-university-wonsirim");
    if (index >= 0) {
      const [wonsirim] = songs.splice(index, 1);
      if (wonsirim) songs.splice(2, 0, wonsirim);
    }
  }
  return { ...content, mustKnowSongs: songs };
}

const contents = { korea: getEContent("korea"), yonsei: getEContent("yonsei") };

function getEListeningNote(song: SongSummary) {
  const note = getListeningNote(song);
  return { ...note, line: E_LISTENING_LINES[song.id] ?? note.line };
}

// D's player markup stays in place; E only substitutes its requested excerpt.
function EListeningPlayer({ song, queue, playing, onPlay, onSelect }: {
  song: SongSummary;
  queue: SongSummary[];
  playing: boolean;
  onPlay: () => void;
  onSelect: (song: SongSummary) => void;
}) {
  const note = getEListeningNote(song);
  function move(offset: number) {
    const index = queue.findIndex((item) => item.id === song.id);
    onSelect(queue[(index + offset + queue.length) % queue.length]);
  }
  return <aside className="match-player listening-player" aria-label={`${song.title} 상세 정보`}>
    <div className="match-player__top"><span><Headphones size={15} aria-hidden="true" />{song.teamName}</span><div><button type="button" aria-label="이전 곡" onClick={() => move(-1)}><ArrowLeft size={17} /></button><button type="button" aria-label="다음 곡" onClick={() => move(1)}><ArrowRight size={17} /></button></div></div>
    <div className="match-player__screen">{song.media ? playing ? <iframe key={song.media.videoId} src={`https://www.youtube.com/embed/${song.media.videoId}?autoplay=1&playsinline=1&rel=0&start=${song.media.startSeconds ?? 0}`} title={`${song.title} 영상`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> : <button className="listening-player__play" type="button" onClick={onPlay} aria-label={`${song.title} 영상 재생`}><img src={`https://i.ytimg.com/vi/${song.media.videoId}/hqdefault.jpg`} alt="" width="480" height="360" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} /><span><Play size={25} fill="currentColor" aria-hidden="true" /></span></button> : <a className="listening-player__find" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.teamName} 응원가 ${song.title}`)}`} target="_blank" rel="noreferrer">{song.title} 영상 찾기<ArrowUpRight size={20} aria-hidden="true" /></a>}</div>
    <div className="match-player__body"><h3>{song.title}</h3>{note.line && <blockquote className="listening-player__line">{note.line}</blockquote>}<p>{note.description}</p><div className="match-player__links">{song.media && <a href={song.media.sourceUrl} target="_blank" rel="noreferrer">{song.media.channelName ?? "YouTube"}<ArrowUpRight size={14} aria-hidden="true" /></a>}{song.archiveHref && <a className="listening-player__detail" href={song.archiveHref}>자세히 보기<ArrowRight size={16} aria-hidden="true" /></a>}</div></div>
  </aside>;
}

function EqualHero() {
  const [alternate, setAlternate] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;
    function syncMotion() {
      window.clearInterval(timer);
      if (motionPreference.matches) setAlternate(false);
      if (!motionPreference.matches && !paused) timer = window.setInterval(() => setAlternate((value) => !value), 3000);
    }
    syncMotion();
    motionPreference.addEventListener("change", syncMotion);
    return () => { window.clearInterval(timer); motionPreference.removeEventListener("change", syncMotion); };
  }, [paused]);
  return <section className="rivalry-hero e-rivalry-hero" aria-labelledby="e-hero-title">
    <div className="rivalry-hero__lights" aria-hidden="true"><i /><i /></div>
    <div className="rivalry-hero__shell"><div className="rivalry-hero__composition">
      <header className="rivalry-hero__heading">
        <p className="rivalry-hero__eyebrow"><span>2026 정기전</span><time dateTime="2026-10-02">10월 2~3일</time></p>
        <h1 id="e-hero-title" className="e-rivalry-hero__title" data-alternate={alternate} aria-label="2026 정기 연고전·고연전"><span className="e-rivalry-hero__moving is-yonsei" aria-hidden="true">연</span><span className="e-rivalry-hero__moving is-korea" aria-hidden="true">고</span><span className="e-rivalry-hero__fixed" aria-hidden="true">전</span><span className="e-rivalry-hero__static" aria-hidden="true"><b className="is-yonsei">연</b><b className="is-korea">고</b>전 · <b className="is-korea">고</b><b className="is-yonsei">연</b>전</span></h1>
        <p className="rivalry-hero__statement">고려대학교와 연세대학교의 정기전.</p>
        <button className="e-rivalry-hero__pause" type="button" aria-pressed={paused} aria-label={paused ? "제목 전환 다시 시작" : "제목 전환 멈춤"} title={paused ? "제목 전환 다시 시작" : "제목 전환 멈춤"} onClick={() => setPaused((value) => !value)}>{paused ? <Play size={17} fill="currentColor" aria-hidden="true" /> : <Pause size={17} fill="currentColor" aria-hidden="true" />}</button>
      </header>
      <div className="rivalry-hero__stage e-rivalry-hero__stage" role="group" aria-label="연세대학교와 고려대학교의 맞대결">
        <div className="rivalry-hero__backlight" aria-hidden="true" />
        {(["yonsei", "korea"] as const).map((school) => <div className={`rivalry-hero__camp is-${school}`} key={school}><div className="rivalry-hero__crest"><img src={`/events/korea-yonsei-games-2026-alt/${school === "yonsei" ? "yonsei-emblem.png" : "korea-global-symbol.png"}`} alt="" width="180" height="180" /></div><p>{SIDE_META[school].name}</p></div>)}
        <span className="rivalry-hero__versus" aria-hidden="true">VS</span>
      </div>
    </div></div>
  </section>;
}

type RepresentativeTone = "hanwha" | "yonsei" | "korea" | "lg";

function representativeTone(clip: VideoClip): RepresentativeTone {
  if (clip.id.startsWith("hanwha-")) return "hanwha";
  if (clip.id.startsWith("yonsei-")) return "yonsei";
  if (clip.id.startsWith("korea-")) return "korea";
  return "lg";
}

function VideoCard({ clip, playingId, setPlayingId, tone }: {
  clip: VideoClip;
  playingId: string | null;
  setPlayingId: (id: string | null) => void;
  tone?: RepresentativeTone;
}) {
  const playButton = useRef<HTMLButtonElement>(null);
  const isPlaying = playingId === clip.id;
  const detailHref = archiveHref(clip.archiveSongId);
  function close() {
    setPlayingId(null);
    requestAnimationFrame(() => playButton.current?.focus({ preventScroll: true }));
  }
  return <article className={`baseball-story__version e-video${tone ? ` is-${tone}` : ""}`} data-video-id={clip.videoId}>
    <header><p>{clip.label}</p><h4>{clip.title}</h4></header>
    <div className="baseball-story__screen e-video__screen">
      {isPlaying ? <iframe
        src={`https://www.youtube.com/embed/${clip.videoId}?autoplay=1&playsinline=1&rel=0&start=${clip.startSeconds ?? 0}`}
        title={`${clip.label} ${clip.title} 영상`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      /> : <button ref={playButton} type="button" className="baseball-story__play e-video__play" onClick={() => setPlayingId(clip.id)} aria-label={`${clip.label} ${clip.title} 영상 재생`}>
        <img src={`https://i.ytimg.com/vi/${clip.videoId}/hqdefault.jpg`} alt="" width="480" height="360" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />
        <span><i><Play size={19} fill="currentColor" aria-hidden="true" /></i><strong>영상 재생</strong></span>
      </button>}
    </div>
    <footer className="e-video__footer">
      <a href={clip.sourceUrl} target="_blank" rel="noreferrer">{clip.credit}<ArrowUpRight size={13} aria-hidden="true" /></a>
      {isPlaying && <button type="button" onClick={close} aria-label={`${clip.title} 영상 닫기`}><X size={14} aria-hidden="true" /> 닫기</button>}
      {!isPlaying && detailHref && <a href={detailHref} className="e-video__detail">곡 자세히 보기<ArrowRight size={14} aria-hidden="true" /></a>}
    </footer>
  </article>;
}

function FamiliarPair({ pair, playingId, setPlayingId }: {
  pair: typeof familiarPairs[number];
  playingId: string | null;
  setPlayingId: (id: string | null) => void;
}) {
  const [version, setVersion] = useState<"baseball" | "campus">("baseball");
  const clip = pair[version];
  const first = pair.direction === "baseball-to-campus" ? pair.baseball : pair.campus;
  const second = pair.direction === "baseball-to-campus" ? pair.campus : pair.baseball;
  const venues: ("baseball" | "campus")[] = pair.direction === "baseball-to-campus" ? ["baseball", "campus"] : ["campus", "baseball"];
  function select(next: "baseball" | "campus") {
    setVersion(next);
    setPlayingId(null);
  }
  return <article className={`e-pair is-${pair.school}`}>
    <div className="e-pair__heading"><span>{pair.direction === "baseball-to-campus" ? "한화에서 연세로" : "고려에서 LG로"}</span><h3><span className={`e-pair__song is-${representativeTone(first)}`}>{first.title}</span><span className="e-pair__arrow" aria-hidden="true">→</span><span className={`e-pair__song is-${representativeTone(second)}`}>{second.title}</span></h3><p>{pair.relation}</p></div>
    <div className="e-pair__choices" role="group" aria-label={`${pair.baseball.title}와 ${pair.campus.title} 영상 선택`}>
      {venues.map((venue) => <button key={venue} type="button" aria-pressed={version === venue} onClick={() => select(venue)}>{pair[venue].label} · {pair[venue].title}</button>)}
    </div>
    <VideoCard clip={clip} playingId={playingId} setPlayingId={setPlayingId} tone={representativeTone(clip)} />
  </article>;
}

function RivalryCard({ item, playingId, setPlayingId }: {
  item: typeof rivalryPerformances[number] | typeof rivalryReplies[number];
  playingId: string | null;
  setPlayingId: (id: string | null) => void;
}) {
  const playButton = useRef<HTMLButtonElement>(null);
  const playing = playingId === item.clip.id;
  const opponent = item.school === "korea" ? "yonsei" : "korea";
  return <article className={`rivalry-story__camp e-rivalry-card is-${item.school}`}>
    <div className="rivalry-story__camp-heading"><div className="rivalry-story__direction">
      <img src={`/events/korea-yonsei-games-2026-alt/${item.school === "korea" ? "korea-global-symbol.png" : "yonsei-emblem.png"}`} alt="" width="30" height="30" />
      <strong>{SIDE_META[item.school].shortName}</strong><ArrowRight size={15} aria-hidden="true" /><span>{SIDE_META[opponent].shortName}에게</span>
    </div></div>
    <h3>{item.clip.title}</h3>
    <blockquote className="rivalry-story__lyric">{item.line}</blockquote>
    <div className="rivalry-story__screen">
      {playing ? <iframe src={`https://www.youtube.com/embed/${item.clip.videoId}?autoplay=1&playsinline=1&rel=0&start=${item.clip.startSeconds ?? 0}`} title={`${item.clip.title} 영상`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
        : <button ref={playButton} className="rivalry-story__play" type="button" onClick={() => setPlayingId(item.clip.id)} aria-label={`${item.clip.title} 영상 재생`}>
          <img src={`https://i.ytimg.com/vi/${item.clip.videoId}/hqdefault.jpg`} alt="" loading="lazy" width="480" height="360" onError={(event) => { event.currentTarget.hidden = true; }} />
          <span className="rivalry-story__play-label"><span><Play size={21} fill="currentColor" aria-hidden="true" /></span></span>
        </button>}
    </div>
    <div className="e-rivalry-card__links"><a href={item.clip.sourceUrl} target="_blank" rel="noreferrer">{item.clip.credit}<ArrowUpRight size={13} aria-hidden="true" /></a>{playing && <button type="button" onClick={() => { setPlayingId(null); requestAnimationFrame(() => playButton.current?.focus({ preventScroll: true })); }}>닫기<X size={14} aria-hidden="true" /></button>}{archiveHref(item.clip.archiveSongId) && <a href={archiveHref(item.clip.archiveSongId)}>곡 자세히 보기<ArrowRight size={13} aria-hidden="true" /></a>}</div>
  </article>;
}

function SchoolListening({ side, playingId, setPlayingId }: {
  side: Side;
  playingId: string | null;
  setPlayingId: (id: string | null) => void;
}) {
  const songs = contents[side].mustKnowSongs;
  const [selected, setSelected] = useState<SongSummary | undefined>(songs[0]);
  const name = side === "korea" ? "고려대" : "연세대";
  function select(song: SongSummary) { setSelected(song); setPlayingId(null); }
  return <section className={`match-songs e-school-listening is-${side}`} aria-labelledby={`e-listening-${side}`}>
    <div className="match-shell e-shell">
      <header className="match-section-heading listening-heading e-heading"><div><strong>{SIDE_META[side].name} · 대표 응원가 {songs.length}곡</strong></div><h2 id={`e-listening-${side}`}>{name}<br /><em>응원가 듣기</em></h2></header>
      {selected ? <div className="match-songs__layout">
        <div className="match-song-list" role="group" aria-label={`${name} 대표 응원가`}>
          {songs.map((song, index) => <button key={song.id} type="button" className={selected.id === song.id ? "is-active" : ""} aria-pressed={selected.id === song.id} onClick={() => select(song)}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{song.title}</strong>{getEListeningNote(song).line && <span className="listening-song-line">{getEListeningNote(song).line}</span>}</div><Play size={16} fill={selected.id === song.id ? "currentColor" : "none"} aria-hidden="true" /></button>)}
        </div>
        <EListeningPlayer song={selected} queue={songs} playing={playingId === `song:${selected.id}`} onPlay={() => setPlayingId(`song:${selected.id}`)} onSelect={select} />
      </div> : <p className="e-listening-empty">현재 공개된 대표곡이 없습니다.</p>}
    </div>
  </section>;
}

export function FeaturePage() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedExtra, setSelectedExtra] = useState<string | null>(null);
  const extraDetail = useRef<HTMLDivElement>(null);
  const extraButtons = useRef<Record<string, HTMLButtonElement | null>>({});
  function selectExtra(id: string) {
    const opening = selectedExtra !== id;
    setSelectedExtra(opening ? id : null);
    setPlayingId(null);
    if (opening) requestAnimationFrame(() => {
      extraDetail.current?.focus({ preventScroll: true });
      extraDetail.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
    });
  }
  function closeExtra() {
    const id = selectedExtra;
    setSelectedExtra(null);
    setPlayingId(null);
    requestAnimationFrame(() => { if (id) extraButtons.current[id]?.focus({ preventScroll: true }); });
  }
  const scheduleItems = TIMELINE.filter((item) => !item.isFinal);
  return <MotionConfig reducedMotion="user"><div className="match-page is-concept-d e-page" data-side="yonsei">
    <header className="match-header e-header">
      <a className="match-header__brand" href="/"><ArrowLeft size={16} aria-hidden="true" /> 응원가 아카이브</a>
      <nav aria-label="페이지 바로가기"><a href="#baseball">야구 응원가</a><a href="#campus">응원 현장</a><a href="#rivalry">라이벌리</a><a href="#match-songs">대표곡</a><a href="#match-schedule">일정</a></nav>
      <div className="match-header__variants" aria-label="시안 비교"><a href="/events/korea-yonsei-games-2026-d/">D</a><span aria-current="page">E</span></div>
    </header>

    <main>
      <EqualHero />
      <p className="e-hero-support">야구 응원가로 시작하는 2026 연고전·고연전 안내</p>

      <section className="baseball-story e-baseball" id="baseball" aria-labelledby="e-baseball-title"><div className="baseball-story__shell match-shell e-shell">
        <header className="baseball-story__heading e-heading"><h2 id="e-baseball-title">야구로 알아보는<br /><em>연고대 응원가</em></h2><p>야구장에서 대학으로, 대학에서 야구장으로. 두 응원석을 오간 노래들.</p></header>
        <div className="e-pairs">{familiarPairs.map((pair) => <FamiliarPair key={pair.id} pair={pair} playingId={playingId} setPlayingId={setPlayingId} />)}</div>
        <div className="e-connections" aria-labelledby="e-connections-title"><div className="e-connections__heading"><h3 id="e-connections-title">야구장에서 더 듣기</h3><p>고려·연세와 연결되는 {extraConnections.length}곡.</p></div>
          <div className="e-extras__grid" role="group" aria-label="야구와 대학 응원가 연결">
            {extraConnections.map((connection) => <Fragment key={connection.id}>
              <button ref={(element) => { extraButtons.current[connection.id] = element; }} type="button" className={`e-extra-card is-${connection.school}${selectedExtra === connection.id ? " is-active" : ""}`} aria-expanded={selectedExtra === connection.id} aria-controls={selectedExtra === connection.id ? "e-extra-detail" : undefined} onClick={() => selectExtra(connection.id)}>
                <small>{connection.id === "kt-wiz-apartment" ? "KBO 10개 구단" : connection.baseball.label}</small><strong>{connection.baseball.title}</strong><span>{connection.relation === "같은 원곡" ? "↔" : "←"} {connection.campus.label}{connection.campus.label.includes("고연가") ? " " : " · "}<b className="e-extra-card__campus-song">{connection.campus.title}</b></span><em>{connection.relation}</em><i><Play size={16} aria-hidden="true" /> 영상 비교</i>
              </button>
              {selectedExtra === connection.id && <div className="e-extra-detail" id="e-extra-detail" ref={extraDetail} tabIndex={-1} aria-label={`${connection.baseball.title}와 ${connection.campus.title} 영상 비교`}><div className="e-extra-detail__top"><p>{connection.baseball.title} · {connection.campus.title}</p><button type="button" onClick={closeExtra}>닫기<X size={15} aria-hidden="true" /></button></div><div className="e-extra-detail__videos"><VideoCard clip={connection.baseball} playingId={playingId} setPlayingId={setPlayingId} /><VideoCard clip={connection.campus} playingId={playingId} setPlayingId={setPlayingId} /></div></div>}
            </Fragment>)}
          </div>
        </div>
      </div></section>

      <section className="match-songs e-campus" id="campus" aria-labelledby="e-campus-title"><div className="match-shell e-shell"><header className="match-section-heading listening-heading e-heading"><div><strong>두 학교의 응원 현장</strong></div><h2 id="e-campus-title">응원석에서는<br /><em>이렇게 부른다.</em></h2><p>고려대 ‘Forever’와 연세대 ‘서시’의 현장 영상.</p></header><div className="e-campus__performances"><div className="e-campus__performance is-korea"><h3>고려대학교 · Forever</h3><p>2026 입실렌티 현장</p><VideoCard clip={campusPerformances[0]} playingId={playingId} setPlayingId={setPlayingId} /></div><div className="e-campus__performance is-yonsei"><h3>연세대학교 · 서시</h3><p>2025 합동응원 현장</p><VideoCard clip={campusPerformances[1]} playingId={playingId} setPlayingId={setPlayingId} /></div></div></div></section>

      <section className="rivalry-story e-rivalry" id="rivalry" aria-labelledby="e-rivalry-title"><div className="rivalry-story__shell match-shell e-shell"><header className="rivalry-story__heading e-heading"><div><p className="rivalry-story__eyebrow">라이벌리 응원가</p><h2 id="e-rivalry-title">상대를 향한<br /><em>응원과 응수.</em></h2></div><p className="rivalry-story__intro">합동응원에서는 상대 학교를 겨냥한 곡도 부른다.</p></header><div className="rivalry-story__matchup e-rivalry__grid">{rivalryPerformances.map((item) => <RivalryCard key={item.clip.id} item={item} playingId={playingId} setPlayingId={setPlayingId} />)}</div><h3 className="e-rivalry__subheading">독수리는 치킨, 호랑이는 고양이</h3><div className="rivalry-story__matchup e-rivalry__grid e-rivalry__replies">{rivalryReplies.map((item) => <RivalryCard key={item.clip.id} item={item} playingId={playingId} setPlayingId={setPlayingId} />)}</div></div></section>

      <div id="match-songs" className="e-listening" aria-label="두 학교 대표 응원가"><SchoolListening side="korea" playingId={playingId} setPlayingId={setPlayingId} /><SchoolListening side="yonsei" playingId={playingId} setPlayingId={setPlayingId} /></div>

      <section className="match-schedule e-schedule" id="match-schedule" aria-labelledby="e-schedule-title"><div className="match-shell e-shell"><header className="match-section-heading e-heading"><div><strong>{EVENT.title}</strong></div><h2 id="e-schedule-title">합동응원부터<br /><em>정기전까지.</em></h2><p>정기전은 야구·농구·럭비·축구·빙구 다섯 종목에서 열린다.</p></header><div className="match-schedule__layout"><ol className="match-schedule__list">{scheduleItems.map((item) => <li key={item.id} data-camp={item.side ?? "neutral"}><time dateTime={item.dateTime}>{item.dateLabel.replace(/^0?(\d+)\.0?(\d+) (.)$/, "$1월 $2일 ($3)")}{item.timeLabel && <span className="match-schedule__time">{item.timeLabel}</span>}</time><div><strong>{item.title}</strong><p>{item.detail}</p></div><i aria-hidden="true">{item.side ? SIDE_META[item.side].symbol : "VS"}</i></li>)}</ol><div className="match-schedule__summary"><div className="match-schedule__final-date"><span>2026 정기 연고전 · 고연전</span><strong className="match-schedule__korean-date" aria-label="10월 2일부터 3일까지">10월 2~3일</strong></div><p>야구·농구는 잠실 / 빙구·럭비·축구는 목동</p></div></div></div></section>
    </main>

    <footer className="e-footer"><div className="match-shell e-shell"><div><p>2026 정기 연고전 · 고연전</p><h2>응원가와 일정 더 보기</h2></div><nav aria-label="더 알아보기"><a className="e-footer__primary" href="/events/korea-yonsei-games-2026-d/">연고전 행사 안내 보기<ArrowUpRight size={17} aria-hidden="true" /></a><a href="/">전체 응원가 둘러보기<ArrowUpRight size={17} aria-hidden="true" /></a></nav></div></footer>
  </div></MotionConfig>;
}

if (typeof document !== "undefined") createRoot(document.getElementById("root")!).render(<FeaturePage />);
