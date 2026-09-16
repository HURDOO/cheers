import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Headphones,
  MapPin,
  Music2,
  Orbit,
  Play,
  Radio,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { EVENT, SCHEDULES, SIDE_META, TIMELINE } from "../korea-yonsei-games-2026/eventConfig";
import { getSideContent, KBO_TEAMS } from "../korea-yonsei-games-2026/eventContent";
import type { ResolvedSideContent, Side, SongSummary } from "../korea-yonsei-games-2026/eventTypes";

type SongSet = "essential" | "recall";

function initialSide(): Side {
  if (typeof window === "undefined") return "yonsei";
  return new URLSearchParams(window.location.search).get("school") === "korea" ? "korea" : "yonsei";
}

function opposite(side: Side): Side {
  return side === "yonsei" ? "korea" : "yonsei";
}

const SCHOOL_LOGOS: Record<Side, string> = {
  yonsei: "/events/korea-yonsei-games-2026-alt/yonsei-emblem.png",
  korea: "/events/korea-yonsei-games-2026-alt/korea-global-symbol.png",
};

function SchoolMark({ side }: { side: Side }) {
  return <img className={`arena-school-mark is-${side}`} src={SCHOOL_LOGOS[side]} alt="" aria-hidden="true" />;
}

function dateOnly(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function statusOf(dateTime: string, endDateTime: string) {
  const now = new Date();
  if (dateOnly(dateTime) === dateOnly(now)) return "오늘";
  if (new Date(endDateTime).getTime() < now.getTime()) return "종료";
  return "예정";
}

function formatDuration(seconds?: number) {
  if (!seconds) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 56, rotateX: 8 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SchoolToggle({ side, onChange, compact = false }: { side: Side; onChange: (side: Side) => void; compact?: boolean }) {
  return (
    <div className={`arena-school-toggle ${compact ? "is-compact" : ""}`} role="group" aria-label="학교 관점 선택">
      <motion.span layout className={`is-${side}`} transition={{ type: "spring", stiffness: 380, damping: 34 }} aria-hidden="true" />
      {(["yonsei", "korea"] as Side[]).map((value) => (
        <button key={value} type="button" aria-label={`${SIDE_META[value].shortName} 관점`} aria-pressed={side === value} onClick={() => onChange(value)}>
          <i><SchoolMark side={value} /></i>
          {!compact && <span><strong>{SIDE_META[value].shortName}</strong></span>}
        </button>
      ))}
    </div>
  );
}

function Header({ side, onChange }: { side: Side; onChange: (side: Side) => void }) {
  return (
    <header className="arena-header">
      <a href="/" className="arena-header__brand"><span><Orbit size={16} aria-hidden="true" /></span><strong>응원가 아카이브</strong></a>
      <div className="arena-header__signal"><i /><span>2026 정기전</span><small>10.02—03</small></div>
      <SchoolToggle side={side} onChange={onChange} compact />
      <a className="arena-header__compare" href={`/events/korea-yonsei-games-2026/?school=${side}`}>시안 A <ArrowUpRight size={13} aria-hidden="true" /></a>
    </header>
  );
}

function Hero({ side, onChange }: { side: Side; onChange: (side: Side) => void }) {
  const opponent = opposite(side);
  const pointX = useMotionValue(0);
  const pointY = useMotionValue(0);
  const rotateY = useSpring(useTransform(pointX, [-0.5, 0.5], [-11, 11]), { stiffness: 130, damping: 22 });
  const rotateX = useSpring(useTransform(pointY, [-0.5, 0.5], [9, -9]), { stiffness: 130, damping: 22 });
  const lightX = useTransform(pointX, [-0.5, 0.5], ["28%", "72%"]);

  function move(event: ReactPointerEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    pointX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    pointY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  }

  function reset() {
    pointX.set(0);
    pointY.set(0);
  }

  return (
    <section className="arena-hero" onPointerMove={move} onPointerLeave={reset} aria-labelledby="arena-title">
      <div className="arena-hero__grid" aria-hidden="true" />
      <div className="arena-hero__beam is-blue" aria-hidden="true" />
      <div className="arena-hero__beam is-red" aria-hidden="true" />
      <div className="arena-hero__particles" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ "--particle": index } as CSSProperties} />)}</div>
      <motion.div className="arena-hero__spot" style={{ left: lightX }} aria-hidden="true" />

      <div className="arena-hero__copy">
        <motion.p initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>
          <Zap size={13} fill="currentColor" aria-hidden="true" /> 두 학교, 하나의 함성
        </motion.p>
        <h1 id="arena-title" aria-label={`2026 정기 ${SIDE_META[side].rivalryName}`}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={`${side}-first`} initial={{ opacity: 0, y: 90, rotateX: -70 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} exit={{ opacity: 0, y: -70, rotateX: 60 }} transition={{ type: "spring", stiffness: 170, damping: 20 }} className={`is-${side} is-active`}>{SIDE_META[side].symbol}</motion.span>
            <motion.span key={`${side}-second`} initial={{ opacity: 0, y: -90, rotateX: 70 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} exit={{ opacity: 0, y: 70, rotateX: -60 }} transition={{ type: "spring", stiffness: 170, damping: 20, delay: 0.05 }} className={`is-${opponent} is-opponent`}>{SIDE_META[opponent].symbol}</motion.span>
          </AnimatePresence>
          <strong>전</strong>
        </h1>
        <motion.div className="arena-hero__intro" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.7 }}>
          <span>2026. 10. 02—03</span>
          <p>{SIDE_META[side].name}의 시선으로<br />함성의 궤도에 진입하세요.</p>
        </motion.div>
        <SchoolToggle side={side} onChange={onChange} />
        <button className="arena-hero__cta" type="button" onClick={() => scrollTo("arena-songs")}><span><Play size={14} fill="currentColor" aria-hidden="true" /></span><strong>응원가 먼저 듣기</strong><ArrowDown size={16} aria-hidden="true" /></button>
      </div>

      <motion.div className="arena-stage" style={{ rotateX, rotateY, transformPerspective: 1100 }}>
        <div className="arena-stage__orbit is-one" aria-hidden="true"><i /><i /><i /></div>
        <div className="arena-stage__orbit is-two" aria-hidden="true"><i /><i /></div>
        <motion.div key={side} className={`arena-stage__core is-${side}`} initial={{ scale: 0.7, opacity: 0, rotate: -20 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 130, damping: 18 }}>
          <span><SchoolMark side={side} /></span>
          <small>{SIDE_META[side].shortName}</small>
        </motion.div>
        <div className="arena-stage__glass is-date"><small>정기전</small><strong>02—03</strong><span>2026년 10월</span></div>
        <div className="arena-stage__glass is-guide"><Radio size={14} aria-hidden="true" /><span>현장 응원 가이드</span><i /></div>
        <div className="arena-stage__glass is-school"><small>현재 관점</small><strong>{SIDE_META[side].shortName}</strong></div>
        <div className="arena-stage__floor" aria-hidden="true" />
      </motion.div>

    </section>
  );
}

function SectionTitle({ number, eyebrow, title, copy }: { number: string; eyebrow: string; title: ReactNode; copy: string }) {
  return (
    <Reveal className="arena-section-title">
      <div><span>{number}</span><small>{eyebrow}</small></div>
      <h2>{title}</h2>
      <p>{copy}</p>
    </Reveal>
  );
}

function ScheduleSection({ side }: { side: Side }) {
  return (
    <section className="arena-schedule" id="arena-schedule" aria-labelledby="arena-schedule-title">
      <div className="arena-shell">
        <SectionTitle number="01" eyebrow="응원 OT" title={<>응원은 이미<br /><strong id="arena-schedule-title">시작됐다.</strong></>} copy="두 학교 네 개 캠퍼스에서 시작되는 첫 함성. 현재 선택한 학교의 일정이 더 가까이 떠오릅니다." />
        <div className="arena-schedule__deck">
          {SCHEDULES.map((item, index) => (
            <motion.article
              key={item.id}
              className={`is-${item.side} ${item.side === side ? "is-active" : ""}`}
              initial={{ opacity: 0, y: 70, rotateY: index % 2 ? 8 : -8 }}
              whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
              whileHover={{ y: -14, rotateX: 3, rotateY: index % 2 ? -3 : 3, scale: 1.015 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.55, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="arena-schedule__shine" aria-hidden="true" />
              <header><span>{String(index + 1).padStart(2, "0")}</span><i>{statusOf(item.dateTime, item.endDateTime)}</i></header>
              <div className="arena-schedule__symbol"><SchoolMark side={item.side} /><span>{SIDE_META[item.side].shortName}</span></div>
              <time><strong>{item.dateLabel.slice(0, 5)}</strong><span>{item.dateLabel.slice(6)}</span></time>
              <div className="arena-schedule__info"><p><Clock3 size={13} aria-hidden="true" />{item.timeLabel}</p><h3>{item.campus}</h3><span><MapPin size={13} aria-hidden="true" />{item.venue}</span></div>
            </motion.article>
          ))}
        </div>
        <p className="arena-note"><Sparkles size={12} aria-hidden="true" /> 일정은 기획용 데이터입니다. 방문 전 각 학교 응원단의 공식 안내를 확인해주세요.</p>
      </div>
    </section>
  );
}

function SongRow({ song, index, active, onSelect }: { song: SongSummary; index: number; active: boolean; onSelect: (song: SongSummary) => void }) {
  return (
    <motion.button
      layout
      className={`arena-song-row ${active ? "is-active" : ""}`}
      type="button"
      onClick={() => onSelect(song)}
      aria-pressed={active}
      whileHover={{ x: 8 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
    >
      <span>{String(index + 1).padStart(2, "0")}</span>
      <div><small>{song.tags.join(" / ")}</small><strong>{song.title}</strong><p>{song.description}</p></div>
      <i>{song.media ? <Play size={13} fill="currentColor" aria-hidden="true" /> : <Music2 size={13} aria-hidden="true" />}</i>
    </motion.button>
  );
}

function Player({ song, queue, onMove }: { song: SongSummary; queue: SongSummary[]; onMove: (offset: number) => void }) {
  const index = Math.max(0, queue.findIndex((item) => item.id === song.id));
  const params = new URLSearchParams({ autoplay: "0", playsinline: "1", rel: "0" });
  if (song.media?.startSeconds) params.set("start", String(song.media.startSeconds));

  return (
    <motion.aside layout className="arena-player" id="arena-player" aria-label={`${song.title} 상세 정보`}>
      <div className="arena-player__halo" aria-hidden="true" />
      <header><div><Headphones size={14} aria-hidden="true" /><span>재생 중</span></div><small>{String(index + 1).padStart(2, "0")} / {String(queue.length).padStart(2, "0")}</small></header>
      <div className="arena-player__screen">
        <AnimatePresence mode="wait">
          <motion.div key={song.id} initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.35 }}>
            {song.media ? (
              <iframe src={`https://www.youtube-nocookie.com/embed/${song.media.videoId}?${params.toString()}`} title={`${song.title} 응원 영상`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            ) : (
              <div className="arena-player__pending"><div>{Array.from({ length: 12 }, (_, bar) => <i key={bar} style={{ "--bar": `${32 + ((bar * 17) % 62)}%` } as CSSProperties} />)}</div><Music2 size={26} aria-hidden="true" /><strong>영상 신호 준비 중</strong><span>정본 미디어가 등록되면 자동 연결됩니다.</span></div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="arena-player__heading">
        <AnimatePresence mode="wait">
          <motion.div key={song.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <small>{song.teamName}</small><h3>{song.title}</h3><span>{song.tags.join(" · ")}</span>
          </motion.div>
        </AnimatePresence>
        <div><button type="button" onClick={() => onMove(-1)} aria-label="이전 곡"><ChevronLeft size={18} aria-hidden="true" /></button><button type="button" onClick={() => onMove(1)} aria-label="다음 곡"><ChevronRight size={18} aria-hidden="true" /></button></div>
      </div>
      <dl className="arena-player__facts"><div><dt>도입·분류</dt><dd>{song.yearLabel ?? "준비 중"}</dd></div><div><dt>재생시간</dt><dd>{formatDuration(song.durationSeconds)}</dd></div><div><dt>데이터</dt><dd>{song.dataStatus === "mock" ? "목 데이터" : "확인 완료"}</dd></div></dl>
      <div className="arena-player__story"><small>곡 소개</small><p>{song.description}</p>{song.usageContext && <p>{song.usageContext}</p>}</div>
      <footer>{song.media && <a href={song.media.sourceUrl} target="_blank" rel="noreferrer">YouTube <ExternalLink size={11} aria-hidden="true" /></a>}{song.archiveHref ? <a href={song.archiveHref}>전체 정보 <ArrowRight size={12} aria-hidden="true" /></a> : <span>정본 연결 대기</span>}</footer>
    </motion.aside>
  );
}

function SongSection({ content, side, selected, onSelect }: { content: ResolvedSideContent; side: Side; selected: SongSummary; onSelect: (song: SongSummary) => void }) {
  const [set, setSet] = useState<SongSet>("essential");
  const songs = set === "essential" ? content.mustKnowSongs : content.memorySongs;
  const queue = songs.some((song) => song.id === selected.id) ? songs : [selected];

  useEffect(() => setSet("essential"), [side]);

  function select(song: SongSummary) {
    onSelect(song);
    if (window.matchMedia("(max-width: 860px)").matches) {
      window.requestAnimationFrame(() => document.getElementById("arena-player")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  function changeSet(next: SongSet) {
    setSet(next);
    onSelect((next === "essential" ? content.mustKnowSongs : content.memorySongs)[0]);
  }

  function move(offset: number) {
    const index = Math.max(0, queue.findIndex((song) => song.id === selected.id));
    select(queue[(index + offset + queue.length) % queue.length]);
  }

  return (
    <section className="arena-songs" id="arena-songs" aria-labelledby="arena-songs-title">
      <div className="arena-shell">
        <SectionTitle number="02" eyebrow={`${SIDE_META[side].shortName} 응원가`} title={<>함성을<br /><strong id="arena-songs-title">장착하세요.</strong></>} copy="필수곡과 다시 듣고 싶은 곡을 고르면 영상과 설명이 바로 이어집니다." />
        <div className="arena-song-tabs" role="tablist" aria-label="응원가 묶음"><button type="button" role="tab" aria-selected={set === "essential"} onClick={() => changeSet("essential")}><Zap size={12} aria-hidden="true" />필수 6곡</button><button type="button" role="tab" aria-selected={set === "recall"} onClick={() => changeSet("recall")}><Radio size={12} aria-hidden="true" />다시 듣기 8곡</button></div>
        <div className="arena-song-console">
          <div className="arena-song-list" role="tabpanel">{songs.map((song, index) => <SongRow key={song.id} song={song} index={index} active={selected.id === song.id} onSelect={select} />)}</div>
          <Player song={selected} queue={queue} onMove={move} />
        </div>
      </div>
    </section>
  );
}

function RivalrySection({ side, contents, onSelect }: { side: Side; contents: Record<Side, ResolvedSideContent>; onSelect: (song: SongSummary) => void }) {
  return (
    <section className="arena-rivalry" aria-labelledby="arena-rivalry-title">
      <div className="arena-rivalry__lights" aria-hidden="true"><i /><i /></div>
      <div className="arena-shell">
        <SectionTitle number="03" eyebrow="라이벌리 응원가" title={<>두 진영,<br /><strong id="arena-rivalry-title">여덟 개의 도발.</strong></>} copy="상대를 부르는 노래까지 정기전의 일부입니다. 선택한 진영의 응원가부터 만나보세요." />
        <div className="arena-duel">
          {([side, opposite(side)] as Side[]).map((camp, campIndex) => (
            <motion.div key={camp} layout className={`arena-duel__camp is-${camp} ${campIndex === 0 ? "is-front" : ""}`} initial={{ opacity: 0, x: campIndex ? 80 : -80, rotateY: campIndex ? -10 : 10 }} whileInView={{ opacity: 1, x: 0, rotateY: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
              <header><div><span><SchoolMark side={camp} /></span><i /></div><small>{SIDE_META[camp].shortName} · 라이벌리 응원가 {contents[camp].rivalrySongs.length}곡</small><strong>{SIDE_META[camp].name}</strong></header>
              <div>{contents[camp].rivalrySongs.map((song, index) => <motion.button key={song.id} type="button" onClick={() => onSelect(song)} whileHover={{ x: 9 }}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{song.title}</strong><small>{song.tags.join(" · ")}</small></div><Play size={13} fill="currentColor" aria-hidden="true" /></motion.button>)}</div>
            </motion.div>
          ))}
          <motion.div className="arena-duel__vs" initial={{ scale: 0, rotate: -90 }} whileInView={{ scale: 1, rotate: 0 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 160, damping: 17 }} aria-hidden="true"><span>V</span><span>S</span><i /></motion.div>
        </div>
      </div>
    </section>
  );
}

function BaseballSection({ content, onSelect }: { content: ResolvedSideContent; onSelect: (song: SongSummary) => void }) {
  return (
    <section className="arena-baseball" aria-labelledby="arena-baseball-title">
      <div className="arena-shell">
        <SectionTitle number="04" eyebrow="야구 응원가" title={<>캠퍼스 너머<br /><strong id="arena-baseball-title">야구장의 메아리.</strong></>} copy="익숙한 멜로디가 프로야구 관중석에서 다른 이름과 함성으로 다시 반사됩니다." />
        <div className="arena-baseball__panel">
          <div className="arena-baseball__songs">{content.baseballSongs.map((song, index) => <motion.button key={song.id} type="button" onClick={() => onSelect(song)} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.06 }} whileHover={{ x: 10 }}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{song.teamName}</small><strong>{song.title}</strong><p>{song.tags.join(" · ")}</p></div><ArrowUpRight size={15} aria-hidden="true" /></motion.button>)}</div>
          <div className="arena-clubs"><header><Trophy size={15} aria-hidden="true" /><span>KBO 응원가 아카이브</span><small>10개 구단</small></header><div>{KBO_TEAMS.map((team, index) => team.archiveHref ? <motion.a key={team.id} href={team.archiveHref} style={{ "--club": team.primaryColor } as CSSProperties} initial={{ opacity: 0, scale: 0.7 }} whileInView={{ opacity: 1, scale: 1 }} whileHover={{ y: -8, rotateX: 8, scale: 1.06 }} viewport={{ once: true }} transition={{ delay: index * 0.035 }}><span>{team.abbreviation}</span><strong>{team.shortName}</strong></motion.a> : <motion.span key={team.id} className="is-pending" style={{ "--club": team.primaryColor } as CSSProperties} initial={{ opacity: 0 }} whileInView={{ opacity: 0.38 }} viewport={{ once: true }}><span>{team.abbreviation}</span><strong>{team.shortName}</strong></motion.span>)}</div></div>
        </div>
      </div>
    </section>
  );
}

function TimelineSection({ side }: { side: Side }) {
  return (
    <section className="arena-timeline" aria-labelledby="arena-timeline-title">
      <div className="arena-shell">
        <SectionTitle number="05" eyebrow="전체 일정" title={<>정기전까지<br /><strong id="arena-timeline-title">고도를 높여.</strong></>} copy="각 일정이 다음 함성으로 이어지고, 10월의 이틀에 모든 응원이 모입니다." />
        <div className="arena-timeline__path"><div className="arena-timeline__beam" aria-hidden="true" />{TIMELINE.map((item, index) => <motion.article key={item.id} className={`${item.isFinal ? "is-final" : ""} ${item.side === side ? "is-active" : ""}`} initial={{ opacity: 0, x: index % 2 ? 48 : -48, z: -100 }} whileInView={{ opacity: 1, x: 0, z: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 0.55, delay: index * 0.035 }}><span>{String(index + 1).padStart(2, "0")}</span><time>{item.dateLabel}</time><div><small>{item.isFinal ? "정기전" : item.side ? SIDE_META[item.side].shortName : "합동 일정"}</small><h3>{item.isFinal ? `2026 정기 ${SIDE_META[side].rivalryName}` : item.title}</h3><p>{item.detail}</p></div>{item.isFinal ? <CalendarDays size={20} aria-hidden="true" /> : <i className={item.side ? `is-${item.side}` : ""}>{item.side ? <SchoolMark side={item.side} /> : "×"}</i>}</motion.article>)}</div>
      </div>
    </section>
  );
}

function Footer({ side }: { side: Side }) {
  return (
    <footer className="arena-footer"><div className="arena-footer__orb" aria-hidden="true" /><div className="arena-shell"><p><Check size={13} aria-hidden="true" /> 2026 정기전</p><h2>함성은<br /><span>계속된다.</span></h2><div><a href={`/events/korea-yonsei-games-2026/?school=${side}`}><small>다른 시안</small><strong>시안 A 보기</strong><ArrowUpRight size={17} aria-hidden="true" /></a><a href="/"><small>더 둘러보기</small><strong>전체 아카이브</strong><ArrowUpRight size={17} aria-hidden="true" /></a></div><span>비공식 응원가 아카이브 · 일정과 장소는 공식 채널에서 확인해주세요. · 최종 갱신 {EVENT.updatedAt}</span></div></footer>
  );
}

export function KoreaYonseiGamesAltPage() {
  const [side, setSide] = useState<Side>(initialSide);
  const contents = useMemo<Record<Side, ResolvedSideContent>>(() => ({ yonsei: getSideContent("yonsei"), korea: getSideContent("korea") }), []);
  const [selected, setSelected] = useState<SongSummary>(() => contents[side].mustKnowSongs[0]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("school", side);
    window.history.replaceState({}, "", url);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", side === "yonsei" ? "#030d1a" : "#17030a");
    setSelected(contents[side].mustKnowSongs[0]);
  }, [contents, side]);

  function revealSong(song: SongSummary) {
    setSelected(song);
    scrollTo("arena-songs");
  }

  return (
    <div className="arena-page" data-side={side}>
      <Header side={side} onChange={setSide} />
      <main><Hero side={side} onChange={setSide} /><ScheduleSection side={side} /><SongSection content={contents[side]} side={side} selected={selected} onSelect={setSelected} /><RivalrySection side={side} contents={contents} onSelect={revealSong} /><BaseballSection content={contents[side]} onSelect={revealSong} /><TimelineSection side={side} /></main>
      <Footer side={side} />
      <a className="arena-compare-float" href={`/events/korea-yonsei-games-2026/?school=${side}`}><ArrowLeft size={13} aria-hidden="true" /> 시안 A</a>
      <div className="arena-sr-only" aria-live="polite">{SIDE_META[side].name} 관점으로 보는 2026 정기 {SIDE_META[side].rivalryName}</div>
    </div>
  );
}
