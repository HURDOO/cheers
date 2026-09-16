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
  Headphones,
  MapPin,
  Music2,
  Play,
  Swords,
  Trophy,
} from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { EVENT, SIDE_META, TIMELINE } from "../korea-yonsei-games-2026/eventConfig";
import { getPreviewSideContent, getSideContent, KBO_TEAMS } from "../korea-yonsei-games-2026/eventContent";
import type { ResolvedSideContent, Side, SongSummary } from "../korea-yonsei-games-2026/eventTypes";

type SongSet = "essential" | "recall";
type Concept = "C" | "D";

const SCHOOL_LOGOS: Record<Side, string> = {
  yonsei: "/events/korea-yonsei-games-2026-alt/yonsei-emblem.png",
  korea: "/events/korea-yonsei-games-2026-alt/korea-global-symbol.png",
};

function initialSide(): Side {
  if (typeof window === "undefined") return "yonsei";
  return new URLSearchParams(window.location.search).get("school") === "korea" ? "korea" : "yonsei";
}

function opposite(side: Side): Side {
  return side === "yonsei" ? "korea" : "yonsei";
}

function statusLabel(dateTime: string, endDateTime: string) {
  const now = Date.now();
  const start = new Date(dateTime).getTime();
  const end = new Date(endDateTime).getTime();
  if (now > end) return "종료";
  if (now >= start) return "진행 중";
  return "예정";
}

function formatDuration(seconds?: number) {
  if (!seconds) return "준비 중";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function SchoolMark({ side }: { side: Side }) {
  return <img className={`match-school-mark is-${side}`} src={SCHOOL_LOGOS[side]} alt="" aria-hidden="true" />;
}

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: 0.62, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SidePicker({ side, onChange, compact = false }: { side: Side; onChange: (side: Side) => void; compact?: boolean }) {
  return (
    <div className={`match-side-picker ${compact ? "is-compact" : ""}`} role="group" aria-label="학교 관점 선택">
      {(["yonsei", "korea"] as Side[]).map((value) => (
        <button
          key={value}
          className={`is-${value}`}
          type="button"
          aria-label={`${SIDE_META[value].shortName} 관점`}
          aria-pressed={side === value}
          onClick={() => onChange(value)}
        >
          <motion.i animate={{ scale: side === value ? 1 : 0.84, opacity: side === value ? 1 : 0.62 }}>
            <SchoolMark side={value} />
          </motion.i>
          {!compact && <span>{SIDE_META[value].name}</span>}
        </button>
      ))}
    </div>
  );
}

function Header({ side, onChange, concept, externalSchoolPicker = false }: { side: Side; onChange: (side: Side) => void; concept: Concept; externalSchoolPicker?: boolean }) {
  return (
    <header className={`match-header${externalSchoolPicker ? " has-traveling-picker" : ""}`}>
      <a className="match-header__brand" href="/"><ArrowLeft size={16} aria-hidden="true" /> 응원가 아카이브</a>
      <nav aria-label="페이지 바로가기">
        <a href="#match-schedule">일정</a>
        <a href="#match-songs">응원가</a>
        <a href="#match-rivalry">라이벌리</a>
        {concept === "D" && <a href="#match-baseball">야구 응원</a>}
      </nav>
      {externalSchoolPicker ? <div id="rivalry-school-dock" className="rivalry-school-dock" aria-hidden="true" /> : <SidePicker side={side} onChange={onChange} compact />}
      <div className="match-header__variants" aria-label="시안 비교">
        <a href={`/events/korea-yonsei-games-2026/?school=${side}`}>A</a>
        <a href={`/events/korea-yonsei-games-2026-alt/?school=${side}`}>B</a>
        {concept === "C" ? <span aria-current="page">C</span> : <a href={`/events/korea-yonsei-games-2026-c/?school=${side}`}>C</a>}
        {concept === "D" && <span aria-current="page">D</span>}
      </div>
    </header>
  );
}

function Hero({ side, onChange, concept }: { side: Side; onChange: (side: Side) => void; concept: Concept }) {
  const opponent = opposite(side);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-4, 4]), { stiffness: 120, damping: 22 });
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [3, -3]), { stiffness: 120, damping: 22 });

  function move(event: ReactPointerEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  }

  function reset() {
    pointerX.set(0);
    pointerY.set(0);
  }

  return (
    <section className="match-hero" onPointerMove={move} onPointerLeave={reset} aria-labelledby="match-title">
      <AnimatePresence initial={false}>
        <motion.div
          key={side}
          className={`match-hero__field is-${side}`}
          initial={{ clipPath: "inset(0 100% 0 0)" }}
          animate={{ clipPath: "inset(0 0% 0 0)" }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden="true"
        />
      </AnimatePresence>
      <div className="match-hero__grid" aria-hidden="true" />
      <div className="match-hero__sweep" aria-hidden="true" />
      {concept === "D" && (
        <>
          <div className="match-hero__halo" aria-hidden="true"><i /><i /><i /></div>
          <div className="match-hero__edition" aria-hidden="true"><span>MATCH</span><span>PROGRAM</span><strong>2026</strong></div>
        </>
      )}

      <div className="match-hero__shell">
        <div className="match-hero__meta">
          <span>2026 정기전</span>
          <strong>10월 2—3일</strong>
        </div>

        <motion.div className="match-hero__title-stage" style={{ rotateX, rotateY, transformPerspective: 1100 }}>
          <h1 id="match-title" aria-label={`2026 정기 ${SIDE_META[side].rivalryName}`}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={`${side}-lead`}
                className={`is-${side} is-lead`}
                initial={{ opacity: 0, y: 70, rotateX: -50 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, y: -45, rotateX: 35 }}
                transition={{ type: "spring", stiffness: 165, damping: 20 }}
              >
                {SIDE_META[side].symbol}
              </motion.span>
              <motion.span
                key={`${opponent}-follow`}
                className={`is-${opponent} is-follow`}
                initial={{ opacity: 0, y: -70, rotateX: 50 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, y: 45, rotateX: -35 }}
                transition={{ type: "spring", stiffness: 165, damping: 20, delay: 0.04 }}
              >
                {SIDE_META[opponent].symbol}
              </motion.span>
            </AnimatePresence>
            <strong>전</strong>
          </h1>
        </motion.div>

        <div className="match-hero__bottom">
          <div>
            <p>{concept === "D" ? <>응원석에 들어가기 전,<br />오늘 필요한 것부터.</> : <>{SIDE_META[side].name}의 관점으로<br />일정과 응원가를 먼저 만나보세요.</>}</p>
            <button type="button" onClick={() => scrollToSection("match-songs")}>
              <Play size={15} fill="currentColor" aria-hidden="true" /> {concept === "D" ? "필수 6곡 바로 듣기" : "응원가 듣기"} <ArrowDown size={16} aria-hidden="true" />
            </button>
          </div>
          <SidePicker side={side} onChange={onChange} />
        </div>
      </div>
    </section>
  );
}

function MatchDayDock() {
  return (
    <nav className="match-day-dock" aria-label="매치데이 빠른 메뉴">
      <a href="#match-schedule"><CalendarDays size={17} aria-hidden="true" /><span>일정</span></a>
      <a className="is-primary" href="#match-songs"><Play size={17} fill="currentColor" aria-hidden="true" /><span>필수 6곡</span></a>
      <a href="#match-rivalry"><Trophy size={17} aria-hidden="true" /><span>라이벌리</span></a>
    </nav>
  );
}

function SectionHeading({ number, eyebrow, title, description, light = false }: { number?: string; eyebrow: string; title: ReactNode; description?: string; light?: boolean }) {
  return (
    <Reveal className={`match-section-heading ${light ? "is-light" : ""}`}>
      <div>{number && <span>{number}</span>}<strong>{eyebrow}</strong></div>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </Reveal>
  );
}

function ScheduleSection({ side, concept = "C" }: { side: Side; concept?: Concept }) {
  return (
    <section className="match-schedule" id="match-schedule" aria-labelledby="match-schedule-title">
      <div className="match-shell">
        <SectionHeading
          number={concept === "D" ? undefined : "01"}
          eyebrow="일정"
          title={<>첫 함성부터 <em id="match-schedule-title">정기전까지.</em></>}
          description={concept === "D" ? undefined : "응원 OT와 합동응원전, 정기전을 한 흐름으로 모았습니다. 선택한 학교 일정은 색으로 표시됩니다."}
          light
        />
        <div className="match-schedule__layout">
          <Reveal className="match-schedule__summary">
            {concept === "D" ? <div className="match-schedule__final-date" data-camp="neutral">
              <span>2026 정기 {SIDE_META[side].rivalryName}</span>
              <strong className="match-schedule__korean-date" aria-label="10월 2일부터 3일까지">10월 2~3일</strong>
            </div> : <><CalendarDays size={26} aria-hidden="true" /><span>정기전</span><strong>10.02<br />—03</strong><p>두 학교의 함성이<br />잠실과 목동에 모이는 이틀.</p></>}
            {concept === "D" && <dl className="match-schedule__venues">
              <div><dt>야구</dt><dd><span>잠실야구장</span><span className="match-schedule__admission is-open">자율 입장</span></dd></div>
              <div><dt>농구</dt><dd><span>잠실학생체육관</span><span className="match-schedule__admission">티켓 필요</span></dd></div>
              <div><dt>럭비·축구</dt><dd><span>목동종합운동장</span><span className="match-schedule__admission">티켓 필요</span></dd></div>
              <div><dt>빙구</dt><dd><span>목동 아이스링크</span><span className="match-schedule__admission">티켓 필요</span></dd></div>
            </dl>}
          </Reveal>
          <ol className="match-schedule__list">
            {TIMELINE.filter((item) => concept !== "D" || !item.isFinal).map((item, index) => (
              <motion.li
                key={item.id}
                data-camp={item.side ?? "neutral"}
                className={`${item.side === side ? "is-own" : ""} ${item.isFinal ? "is-final" : ""}`}
                initial={{ opacity: 0, x: 28 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.48, delay: index * 0.045 }}
              >
                {concept !== "D" && <span>{String(index + 1).padStart(2, "0")}</span>}
                <time dateTime={item.dateTime}>{concept === "D" ? item.isFinal ? "10월 2~3일" : item.dateLabel.replace(/^0?(\d+)\.0?(\d+) (.)$/, "$1월 $2일 ($3)") : item.dateLabel}{concept === "D" && item.timeLabel && <span className="match-schedule__time">{item.timeLabel}</span>}</time>
                <div><strong>{item.isFinal ? `2026 정기 ${SIDE_META[side].rivalryName}` : item.title}</strong><p>{item.detail}</p></div>
                <i className={item.side ? `is-${item.side}` : ""}>
                  {item.side ? <SchoolMark side={item.side} /> : item.isFinal ? <CalendarDays size={20} /> : concept === "D" ? <Swords size={28} aria-hidden="true" /> : "합"}
                </i>
                <small>{statusLabel(item.dateTime, item.endDateTime)}</small>
              </motion.li>
            ))}
          </ol>
        </div>
        {concept !== "D" && <p className="match-note">일정은 기획용 데이터입니다. 방문 전 각 학교 응원단의 공식 안내를 확인해주세요.</p>}
      </div>
    </section>
  );
}

function PlayerScreen({ song, concept = "C" }: { song: SongSummary; concept?: Concept }) {
  if (song.media) {
    const params = new URLSearchParams({ rel: "0" });
    if (song.media.startSeconds) params.set("start", String(song.media.startSeconds));
    return (
      <iframe
        src={`https://www.youtube.com/embed/${song.media.videoId}?${params.toString()}`}
        title={`${song.title} 영상`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  }

  return (
    <div className="match-player__pending">
      <div aria-hidden="true">{[36, 72, 48, 88, 58, 78, 42, 66, 50].map((height, index) => <i key={index} style={{ "--height": `${height}%` } as CSSProperties} />)}</div>
      <Music2 size={28} aria-hidden="true" />
      <strong>영상 준비 중</strong>
      {concept !== "D" && <span>정본 미디어가 등록되면 이 자리에 연결됩니다.</span>}
    </div>
  );
}

function SongPlayer({ song, queue, onSelect, concept = "C" }: { song: SongSummary; queue: SongSummary[]; onSelect: (song: SongSummary) => void; concept?: Concept }) {
  function move(offset: number) {
    const current = queue.findIndex((item) => item.id === song.id);
    const base = current < 0 ? 0 : current;
    onSelect(queue[(base + offset + queue.length) % queue.length]);
  }

  return (
    <motion.aside key={song.id} className="match-player" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38 }} aria-label={`${song.title} 상세 정보`}>
      <div className="match-player__top">
        <span><Headphones size={15} aria-hidden="true" /> {concept === "D" ? song.teamName : "선택한 응원가"}</span>
        <div><button type="button" aria-label="이전 곡" onClick={() => move(-1)}><ArrowLeft size={17} /></button><button type="button" aria-label="다음 곡" onClick={() => move(1)}><ArrowRight size={17} /></button></div>
      </div>
      <div className="match-player__screen"><PlayerScreen song={song} concept={concept} /></div>
      <div className="match-player__body">
        {concept !== "D" && <small>{song.teamName}</small>}
        <h3>{song.title}</h3>
        {concept !== "D" && <span>{song.tags.join(" · ")}</span>}
        {concept !== "D" && <dl>
          <div><dt>도입·분류</dt><dd>{song.yearLabel ?? "준비 중"}</dd></div>
          <div><dt>재생시간</dt><dd>{formatDuration(song.durationSeconds)}</dd></div>
          <div><dt>데이터</dt><dd>{song.dataStatus === "mock" ? "목 데이터" : "확인 완료"}</dd></div>
        </dl>}
        <p>{song.description}</p>
        {concept !== "D" && song.usageContext && <p>{song.usageContext}</p>}
        <div className="match-player__links">
          {song.media && <a href={song.media.sourceUrl} target="_blank" rel="noreferrer">YouTube <ArrowUpRight size={14} /></a>}
          {song.archiveHref && <a href={song.archiveHref}>전체 정보 <ArrowRight size={14} /></a>}
        </div>
      </div>
    </motion.aside>
  );
}

function SongSection({ content, selected, onSelect, concept = "C" }: { content: ResolvedSideContent; selected: SongSummary; onSelect: (song: SongSummary) => void; concept?: Concept }) {
  const [set, setSet] = useState<SongSet>("essential");
  const songs = set === "essential" ? content.mustKnowSongs : content.memorySongs;

  useEffect(() => setSet("essential"), [content]);

  function changeSet(next: SongSet) {
    setSet(next);
    onSelect(next === "essential" ? content.mustKnowSongs[0] : content.memorySongs[0]);
  }

  return (
    <section className="match-songs" id="match-songs" aria-labelledby="match-songs-title">
      <div className="match-shell">
        <SectionHeading
          number={concept === "D" ? undefined : "02"}
          eyebrow="응원가"
          title={concept === "D" ? <>우리의 노래부터,<br /><em id="match-songs-title">함께 부를 준비.</em></> : <>목록은 단정하게,<br /><em id="match-songs-title">재생은 바로.</em></>}
          description={concept === "D" ? undefined : "곡을 누르면 영상과 맥락이 같은 화면에 표시됩니다. 정본 데이터로 교체해도 이 구조는 유지됩니다."}
        />
        <div className="match-song-tabs" role="tablist" aria-label="응원가 묶음">
          <button type="button" role="tab" aria-selected={set === "essential"} onClick={() => changeSet("essential")}>필수 6곡</button>
          <button type="button" role="tab" aria-selected={set === "recall"} onClick={() => changeSet("recall")}>다시 듣기 8곡</button>
        </div>
        <div className="match-songs__layout">
          <div className="match-song-list" role="tabpanel">
            {songs.map((song, index) => (
              <button key={song.id} className={selected.id === song.id ? "is-active" : ""} type="button" aria-pressed={selected.id === song.id} onClick={() => onSelect(song)}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>{concept !== "D" && <small>{song.tags.slice(0, 2).join(" · ")}</small>}<strong>{song.title}</strong>{concept !== "D" && <p>{song.description}</p>}</div>
                <Play size={16} fill={selected.id === song.id ? "currentColor" : "none"} aria-hidden="true" />
              </button>
            ))}
          </div>
          <SongPlayer song={selected} queue={songs} onSelect={onSelect} concept={concept} />
        </div>
      </div>
    </section>
  );
}

function RivalrySection({ side, contents, onSelect }: { side: Side; contents: Record<Side, ResolvedSideContent>; onSelect: (song: SongSummary) => void }) {
  const order: Side[] = [side, opposite(side)];
  return (
    <section className="match-rivalry" id="match-rivalry" aria-labelledby="match-rivalry-title">
      <div className="match-shell">
        <SectionHeading
          number="03"
          eyebrow="라이벌리 응원가"
          title={<>두 진영의<br /><em id="match-rivalry-title">정면 승부.</em></>}
          description="상대를 부르는 노래도 정기전의 일부입니다. 선택한 학교의 응원가를 먼저 배치했습니다."
          light
        />
        <div className="match-rivalry__grid">
          {order.map((camp, campIndex) => (
            <motion.article key={camp} className={`is-${camp} ${campIndex === 0 ? "is-first" : ""}`} initial={{ opacity: 0, x: campIndex ? 36 : -36 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.58 }}>
              <header><span><SchoolMark side={camp} /></span><div><small>{SIDE_META[camp].shortName} 응원가 4곡</small><h3>{SIDE_META[camp].name}</h3></div></header>
              <div>
                {contents[camp].rivalrySongs.map((song, index) => (
                  <button key={song.id} type="button" onClick={() => onSelect(song)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{song.title}</strong><small>{song.tags.join(" · ")}</small><ArrowUpRight size={15} /></button>
                ))}
              </div>
            </motion.article>
          ))}
          <motion.div className="match-rivalry__vs" initial={{ scale: 0.6, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 170, damping: 18 }} aria-hidden="true">VS</motion.div>
        </div>
      </div>
    </section>
  );
}

function BaseballSection({ content, onSelect }: { content: ResolvedSideContent; onSelect: (song: SongSummary) => void }) {
  return (
    <section className="match-baseball" aria-labelledby="match-baseball-title">
      <div className="match-shell">
        <SectionHeading
          number="04"
          eyebrow="야구 응원가"
          title={<>캠퍼스의 멜로디가<br /><em id="match-baseball-title">야구장으로.</em></>}
          description="같은 원곡과 직접 차용 관계가 확인되는 프로야구 응원가를 모았습니다."
        />
        <div className="match-baseball__layout">
          <div className="match-baseball__songs">
            {content.baseballSongs.map((song, index) => (
              <motion.button key={song.id} type="button" onClick={() => onSelect(song)} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.045 }} whileHover={{ x: 6 }}>
                <span>{String(index + 1).padStart(2, "0")}</span><div><small>{song.teamName}</small><strong>{song.title}</strong><p>{song.tags.join(" · ")}</p></div><ArrowUpRight size={16} />
              </motion.button>
            ))}
          </div>
          <div className="match-clubs">
            <header><Trophy size={18} aria-hidden="true" /><strong>KBO 10개 구단</strong></header>
            <div>
              {KBO_TEAMS.map((team) => team.archiveHref ? (
                <a key={team.id} href={team.archiveHref} style={{ "--club": team.primaryColor } as CSSProperties}><span>{team.abbreviation}</span><strong>{team.shortName}</strong></a>
              ) : (
                <span key={team.id} className="is-pending" style={{ "--club": team.primaryColor } as CSSProperties}><span>{team.abbreviation}</span><strong>{team.shortName}</strong></span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer({ side, concept }: { side: Side; concept: Concept }) {
  return (
    <footer className="match-footer">
      <div className="match-shell">
        {concept !== "D" && <p><Check size={16} aria-hidden="true" /> 2026 정기전</p>}
        <h2>함성은<br /><em>계속된다.</em></h2>
        <div>
          {concept === "D" ? (
            <>
              <a href="#match-songs"><strong>우리 응원 다시 듣기</strong><ArrowUpRight size={17} /></a>
              <a href="/"><strong>전체 응원가 둘러보기</strong><ArrowUpRight size={17} /></a>
            </>
          ) : (
            <>
              <a href={`/events/korea-yonsei-games-2026/?school=${side}`}><span>시안 A</span><strong>깔끔한 버전 보기</strong><ArrowUpRight size={17} /></a>
              <a href={`/events/korea-yonsei-games-2026-alt/?school=${side}`}><span>시안 B</span><strong>화려한 버전 보기</strong><ArrowUpRight size={17} /></a>
            </>
          )}
        </div>
        <small>{concept === "D" ? "비공식 응원가 아카이브" : <>비공식 응원가 아카이브 · 일정과 장소는 공식 채널에서 확인해주세요. · 최종 갱신 {EVENT.updatedAt}</>}</small>
      </div>
    </footer>
  );
}

export function KoreaYonseiGamesCPage({ concept = "C", renderHero, renderRivalry, renderBaseball, renderSchoolPicker, renderSongs, renderFooter }: {
  concept?: Concept;
  renderSchoolPicker?: (props: { side: Side; onChange: (side: Side) => void }) => ReactNode;
  renderHero?: (props: { side: Side; onChange: (side: Side) => void }) => ReactNode;
  renderRivalry?: (props: { side: Side; contents: Record<Side, ResolvedSideContent> }) => ReactNode;
  renderBaseball?: (props: { side: Side; contents: Record<Side, ResolvedSideContent> }) => ReactNode;
  renderSongs?: (props: { side: Side; content: ResolvedSideContent }) => ReactNode;
  renderFooter?: (props: { side: Side }) => ReactNode;
}) {
  const [side, setSide] = useState<Side>(initialSide);
  const contents = useMemo<Record<Side, ResolvedSideContent>>(() => ({
    yonsei: concept === "D" ? getPreviewSideContent("yonsei") : getSideContent("yonsei"),
    korea: concept === "D" ? getPreviewSideContent("korea") : getSideContent("korea"),
  }), [concept]);
  const [selected, setSelected] = useState<SongSummary>(() => contents[side].mustKnowSongs[0]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("school", side);
    window.history.replaceState({}, "", url);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", side === "yonsei" ? "#071a30" : "#250711");
    setSelected(contents[side].mustKnowSongs[0]);
  }, [contents, side]);

  function revealSong(song: SongSummary) {
    setSelected(song);
    requestAnimationFrame(() => scrollToSection("match-songs"));
  }

  return (
    <div className={`match-page ${concept === "D" ? "is-concept-d" : ""}`} data-side={side}>
      <Header side={side} onChange={setSide} concept={concept} externalSchoolPicker={Boolean(renderSchoolPicker)} />
      {renderSchoolPicker?.({ side, onChange: setSide })}
      <main>
        {renderHero ? renderHero({ side, onChange: setSide }) : <Hero side={side} onChange={setSide} concept={concept} />}
        <ScheduleSection side={side} concept={concept} />
        {renderSongs ? renderSongs({ side, content: contents[side] }) : <SongSection content={contents[side]} selected={selected} onSelect={setSelected} concept={concept} />}
        {renderRivalry
          ? renderRivalry({ side, contents })
          : <RivalrySection side={side} contents={contents} onSelect={revealSong} />}
        {renderBaseball
          ? renderBaseball({ side, contents })
          : <BaseballSection content={contents[side]} onSelect={revealSong} />}
      </main>
      {renderFooter ? renderFooter({ side }) : <Footer side={side} concept={concept} />}
      {concept === "D" && <MatchDayDock />}
      <div className="match-sr-only" aria-live="polite">{SIDE_META[side].name} 관점으로 보는 2026 정기 {SIDE_META[side].rivalryName}</div>
    </div>
  );
}
