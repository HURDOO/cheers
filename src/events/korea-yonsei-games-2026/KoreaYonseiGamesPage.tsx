import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  ExternalLink,
  MapPin,
  Music2,
  Pause,
  Play,
  Share2,
  SkipBack,
  SkipForward,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { EVENT, SCHEDULES, SIDE_META, TIMELINE } from "./eventConfig";
import { getSideContent, KBO_TEAMS } from "./eventContent";
import type {
  ResolvedSideContent,
  ScheduleItem,
  Side,
  SongSummary,
  TimelineItem,
} from "./eventTypes";

type EventState = "done" | "today" | "next" | "upcoming";

function initialSide(): Side {
  if (typeof window === "undefined") return "yonsei";
  return new URLSearchParams(window.location.search).get("school") === "korea" ? "korea" : "yonsei";
}

function otherSide(side: Side): Side {
  return side === "yonsei" ? "korea" : "yonsei";
}

function dateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDuration(seconds?: number) {
  if (!seconds) return "영상";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function eventState(
  item: Pick<ScheduleItem | TimelineItem, "id" | "dateTime" | "endDateTime">,
  now: Date,
  nextId?: string,
): EventState {
  if (dateKey(item.dateTime) === dateKey(now)) return "today";
  if (new Date(item.endDateTime).getTime() < now.getTime()) return "done";
  if (item.id === nextId) return "next";
  return "upcoming";
}

function stateLabel(state: EventState) {
  if (state === "done") return "진행 완료";
  if (state === "today") return "오늘";
  if (state === "next") return "다음 일정";
  return "예정";
}

function campaignCopy(now: Date, side: Side) {
  const today = dateKey(now);
  const rivalryName = SIDE_META[side].rivalryName;

  if (today >= "2026-10-02" && today <= "2026-10-03") {
    return { label: `오늘은 정기 ${rivalryName}`, target: "timeline" };
  }
  if (today > "2026-10-03") {
    return { label: `${rivalryName}의 노래 다시 보기`, target: "must-know" };
  }
  if (today === "2026-09-22") {
    return { label: "오늘은 합동응원전", target: "timeline" };
  }
  if (today > "2026-09-14") {
    return { label: "이제 정기전이다", target: "timeline" };
  }
  if (["2026-09-07", "2026-09-09", "2026-09-14"].includes(today)) {
    return { label: "오늘 응원 OT · 현장 모드", target: "next-cheer" };
  }
  return { label: "응원 OT 준비하기", target: "must-know" };
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function ModalShell({
  open,
  onOpenChange,
  className,
  labelledBy,
  describedBy,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  labelledBy: string;
  describedBy: string;
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => contentRef.current?.focus());

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = contentRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onOpenChange, open]);

  if (!open) return null;
  return createPortal(
    <>
      <div className="rivalry-dialog-overlay" onMouseDown={() => onOpenChange(false)} aria-hidden="true" />
      <div
        ref={contentRef}
        className={className}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

function SideSwitch({ side, onChange, compact = false }: { side: Side; onChange: (side: Side) => void; compact?: boolean }) {
  return (
    <div className={`rivalry-side-switch ${compact ? "is-compact" : ""}`} role="group" aria-label="학교 선택">
      {(["yonsei", "korea"] as Side[]).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={side === value}
          onClick={() => onChange(value)}
        >
          <span className="rivalry-side-switch__mark" aria-hidden="true">{SIDE_META[value].symbol}</span>
          <span>
            <strong>{SIDE_META[value].name}</strong>
            {!compact && <small>{side === value ? "선택됨" : `${SIDE_META[value].shortName}에서 보기`}</small>}
          </span>
          <i aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

function EventHeader({ side, onSideChange, showSideSwitch }: { side: Side; onSideChange: (side: Side) => void; showSideSwitch: boolean }) {
  const [shared, setShared] = useState(false);

  async function sharePage() {
    const payload = {
      title: EVENT.title,
      text: `${SIDE_META[side].name}의 시선으로 보는 2026 정기 ${SIDE_META[side].rivalryName}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) await navigator.share(payload);
      else {
        await navigator.clipboard.writeText(window.location.href);
        setShared(true);
        window.setTimeout(() => setShared(false), 1800);
      }
    } catch {
      // Native share sheets may be dismissed without changing the page.
    }
  }

  return (
    <header className="rivalry-header">
      <a className="rivalry-header__brand" href="/">
        <ArrowLeft size={15} aria-hidden="true" />
        <span>응원가 아카이브</span>
      </a>
      <AnimatePresence initial={false}>
        {showSideSwitch && (
          <motion.div
            className="rivalry-header__switch"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <SideSwitch side={side} onChange={onSideChange} compact />
          </motion.div>
        )}
      </AnimatePresence>
      <button className="rivalry-header__share" type="button" onClick={sharePage}>
        {shared ? <Check size={15} aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
        <span>{shared ? "복사됨" : "공유"}</span>
      </button>
    </header>
  );
}

function Hero({ side, onSideChange, heroRef, now }: {
  side: Side;
  onSideChange: (side: Side) => void;
  heroRef: React.RefObject<HTMLElement>;
  now: Date;
}) {
  const order = side === "yonsei"
    ? [{ id: "yonsei", letter: "연" }, { id: "korea", letter: "고" }]
    : [{ id: "korea", letter: "고" }, { id: "yonsei", letter: "연" }];
  const campaign = campaignCopy(now, side);

  return (
    <section ref={heroRef} className="rivalry-hero" aria-labelledby="rivalry-title">
      <AnimatePresence initial={false}>
        <motion.div
          key={side}
          className="rivalry-hero__wipe"
          initial={{ x: side === "korea" ? "-105%" : "105%" }}
          animate={{ x: side === "korea" ? "105%" : "-105%" }}
          transition={{ duration: 0.52, ease: [0.76, 0, 0.24, 1] }}
          aria-hidden="true"
        />
      </AnimatePresence>
      <div className="rivalry-hero__grain" aria-hidden="true" />
      <div className="rivalry-hero__score" aria-hidden="true"><span>2026</span><i>VS</i><span>10.02—03</span></div>
      <div className="rivalry-hero__content">
        <motion.p key={`hero-kicker-${side}`} className="rivalry-kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          2026 정기 · {SIDE_META[side].name}
        </motion.p>
        <h1 id="rivalry-title" className="rivalry-hero__title" aria-label={`2026 정기 ${SIDE_META[side].rivalryName}`}>
          <span className="rivalry-hero__title-pair" aria-hidden="true">
            {order.map((item) => (
              <motion.strong
                layout
                layoutId={`rivalry-letter-${item.id}`}
                key={item.id}
                className={`is-${item.id}`}
                transition={{ type: "spring", stiffness: 430, damping: 38 }}
              >
                {item.letter}
              </motion.strong>
            ))}
          </span>
          <strong className="rivalry-hero__title-games" aria-hidden="true">전</strong>
        </h1>
        <p className="rivalry-hero__question">어느 쪽에서 볼까요?</p>
        <SideSwitch side={side} onChange={onSideChange} />
        <button className="rivalry-hero__cta" type="button" onClick={() => scrollToSection(campaign.target)}>
          <span>{campaign.label}</span><ArrowDown size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="rivalry-hero__edge rivalry-hero__edge--left" aria-hidden="true">YONSEI · 1885</div>
      <div className="rivalry-hero__edge rivalry-hero__edge--right" aria-hidden="true">KOREA · 1905</div>
    </section>
  );
}

function SectionHeading({ number, title, description, inverse = false }: {
  number: string;
  title: ReactNode;
  description?: ReactNode;
  inverse?: boolean;
}) {
  return (
    <header className={`rivalry-section-heading ${inverse ? "is-inverse" : ""}`}>
      <p><span>{number}</span><i /></p>
      <h2>{title}</h2>
      {description && <div className="rivalry-section-heading__description">{description}</div>}
    </header>
  );
}

function ScheduleSection({ side, now }: { side: Side; now: Date }) {
  const schedules = SCHEDULES.filter((schedule) => schedule.side === side);
  const next = schedules.find((schedule) => new Date(schedule.endDateTime).getTime() >= now.getTime());

  return (
    <section className="rivalry-schedule" id="next-cheer" aria-labelledby="next-cheer-title">
      <div className="rivalry-section-shell">
        <Reveal>
          <SectionHeading
            number="01"
            inverse
            title={<><span>응원은 이미</span><strong id="next-cheer-title">시작됐다.</strong></>}
            description={`${SIDE_META[side].name} 응원 OT · 두 캠퍼스 일정을 한눈에 확인하세요.`}
          />
        </Reveal>
        <div className="rivalry-schedule__grid">
          {schedules.map((schedule, index) => {
            const state = eventState(schedule, now, next?.id);
            return (
              <motion.article
                layout
                key={schedule.id}
                className={`rivalry-schedule-card is-${state}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.08 }}
              >
                <div className="rivalry-schedule-card__top">
                  <span>{stateLabel(state)}</span>
                  <small>{String(index + 1).padStart(2, "0")}</small>
                </div>
                <div className="rivalry-schedule-card__date">
                  <strong>{schedule.dateLabel.slice(0, 5)}</strong>
                  <span>{schedule.dateLabel.slice(6)}</span>
                </div>
                <p><Clock3 size={14} aria-hidden="true" /> {schedule.timeLabel}</p>
                <h3>{schedule.campus}</h3>
                <div className="rivalry-schedule-card__venue"><MapPin size={14} aria-hidden="true" /> {schedule.venue}</div>
              </motion.article>
            );
          })}
        </div>
        <p className="rivalry-data-note"><Sparkles size={12} aria-hidden="true" /> 현재 일정은 기획용 데이터입니다. 방문 전 각 학교 응원단의 공식 안내를 확인해주세요.</p>
      </div>
    </section>
  );
}

function SongCard({ song, index, active, onSelect }: {
  song: SongSummary;
  index: number;
  active: boolean;
  onSelect: (song: SongSummary) => void;
}) {
  return (
    <motion.article layout className={`rivalry-song-card ${active ? "is-active" : ""}`}>
      <button type="button" onClick={() => onSelect(song)} aria-pressed={active}>
        <div className="rivalry-song-card__top"><span>{String(index + 1).padStart(2, "0")}</span><i>{song.media ? "PLAY" : "PREVIEW"}</i></div>
        <div className="rivalry-song-card__pulse" aria-hidden="true">{[32, 64, 44, 78, 52, 88, 38, 69, 48, 76, 40, 58].map((height, bar) => <i key={bar} style={{ "--bar": `${height}%` } as CSSProperties} />)}</div>
        <div className="rivalry-song-card__body">
          <p>{song.tags.slice(0, 2).join(" · ")}</p>
          <h3>{song.title}</h3>
          <span>{song.description}</span>
        </div>
        <div className="rivalry-song-card__bottom">
          <span>{song.teamName}</span>
          <strong>{formatDuration(song.durationSeconds)} <Play size={11} fill="currentColor" aria-hidden="true" /></strong>
        </div>
      </button>
    </motion.article>
  );
}

function MustKnowSection({ content, activeSong, onSelect, onFocus }: {
  content: ResolvedSideContent;
  activeSong?: SongSummary;
  onSelect: (song: SongSummary) => void;
  onFocus: () => void;
}) {
  return (
    <section className="rivalry-must" id="must-know" aria-labelledby="must-title">
      <div className="rivalry-section-shell">
        <Reveal>
          <SectionHeading
            number="02"
            title={<><span>OT 전에</span><strong id="must-title">이것만.</strong></>}
            description={<>대표곡부터 빠르게 다시 들어보세요. 여섯 곡이면 응원석에 합류할 준비가 됩니다.</>}
          />
        </Reveal>
        <button className="rivalry-cram-button" type="button" onClick={onFocus}>
          <span><Play size={18} fill="currentColor" aria-hidden="true" /></span>
          <strong>15분 벼락치기 시작</strong>
          <small>6곡 이어보기</small>
          <ArrowRight size={19} aria-hidden="true" />
        </button>
        <motion.div layout className="rivalry-must__grid">
          {content.mustKnowSongs.map((song, index) => (
            <SongCard key={song.id} song={song} index={index} active={activeSong?.id === song.id} onSelect={onSelect} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function MemorySection({ content, activeSong, onSelect }: {
  content: ResolvedSideContent;
  activeSong?: SongSummary;
  onSelect: (song: SongSummary) => void;
}) {
  return (
    <section className="rivalry-memory" aria-labelledby="memory-title">
      <div className="rivalry-section-shell">
        <Reveal>
          <SectionHeading
            number="03"
            title={<><span>1학기, 어디까지</span><strong id="memory-title">기억나?</strong></>}
            description={<>대표곡은 이미 안다고요? 그때 분명 함께 불렀는데 제목이 잠깐 흐릿한 곡들입니다.</>}
          />
        </Reveal>
        <div className="rivalry-memory__rail" aria-label="1학기 응원가 목록">
          {content.memorySongs.map((song, index) => (
            <motion.button
              layout
              key={song.id}
              type="button"
              className={activeSong?.id === song.id ? "is-active" : ""}
              onClick={() => onSelect(song)}
              aria-pressed={activeSong?.id === song.id}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><small>{song.tags.join(" · ")}</small><strong>{song.title}</strong><p>{song.description}</p></div>
              <i>{song.media ? <Play size={14} fill="currentColor" aria-hidden="true" /> : <Music2 size={14} aria-hidden="true" />}</i>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}

function RivalryCamp({ campSide, songs, active, onSelect }: {
  campSide: Side;
  songs: SongSummary[];
  active: boolean;
  onSelect: (song: SongSummary) => void;
}) {
  return (
    <motion.div layout className={`rivalry-camp is-${campSide} ${active ? "is-active" : ""}`}>
      <div className="rivalry-camp__head">
        <span>{SIDE_META[campSide].symbol}</span>
        <div><small>{SIDE_META[campSide].englishName}</small><strong>{SIDE_META[campSide].name}</strong></div>
        <i>4 TRACKS</i>
      </div>
      <div className="rivalry-camp__tracks">
        {songs.map((song, index) => (
          <button key={song.id} type="button" onClick={() => onSelect(song)}>
            <span>{String(index + 1).padStart(2, "0")}</span><strong>{song.title}</strong><Play size={13} aria-hidden="true" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function RivalrySection({ side, contents, onSelect }: {
  side: Side;
  contents: Record<Side, ResolvedSideContent>;
  onSelect: (song: SongSummary) => void;
}) {
  const opponent = otherSide(side);
  return (
    <section className="rivalry-tracks" aria-labelledby="rivalry-tracks-title">
      <div className="rivalry-section-shell">
        <Reveal>
          <SectionHeading
            number="04"
            title={<><span>서로를</span><strong id="rivalry-tracks-title">노래하다.</strong></>}
            description={<>응원석에서는 상대 학교도 노래가 됩니다. 두 진영의 라이벌리 트랙은 정확히 네 곡씩.</>}
          />
        </Reveal>
        <motion.div layout className="rivalry-tracks__arena">
          <RivalryCamp campSide={side} songs={contents[side].rivalrySongs} active onSelect={onSelect} />
          <motion.div layout className="rivalry-tracks__versus" aria-hidden="true"><span>V</span><span>S</span><i /></motion.div>
          <RivalryCamp campSide={opponent} songs={contents[opponent].rivalrySongs} active={false} onSelect={onSelect} />
        </motion.div>
        <p className="rivalry-tracks__note">학교를 바꾸면 두 진영의 자리와 강조색도 함께 바뀝니다.</p>
      </div>
    </section>
  );
}

function BaseballSection({ content, onSelect }: { content: ResolvedSideContent; onSelect: (song: SongSummary) => void }) {
  return (
    <section className="rivalry-baseball" aria-labelledby="baseball-title">
      <div className="rivalry-section-shell">
        <Reveal>
          <SectionHeading
            number="05"
            inverse
            title={<><span>야구장에서도</span><strong id="baseball-title">들립니다.</strong></>}
            description={<>대학 응원석에서 들은 멜로디는 프로야구의 관중석에서도 새로운 이름으로 이어집니다.</>}
          />
        </Reveal>
        <div className="rivalry-baseball__features">
          {content.baseballSongs.map((song, index) => (
            <motion.button
              layout
              key={song.id}
              type="button"
              onClick={() => onSelect(song)}
              initial={{ opacity: 0, x: 18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><small>{song.teamName}</small><strong>{song.title}</strong><p>{song.tags.join(" · ")}</p></div>
              <i><Play size={14} fill="currentColor" aria-hidden="true" /></i>
            </motion.button>
          ))}
        </div>
        <div className="rivalry-baseball__teams" aria-label="KBO 10개 구단">
          <p><Trophy size={15} aria-hidden="true" /> KBO 10개 구단</p>
          <div>
            {KBO_TEAMS.map((team) => team.archiveHref ? (
              <a key={team.id} href={team.archiveHref} style={{ "--team-color": team.primaryColor } as CSSProperties}>
                <span>{team.abbreviation}</span><strong>{team.shortName}</strong><ArrowRight size={12} aria-hidden="true" />
              </a>
            ) : (
              <span key={team.id} className="is-pending" title="정본 데이터 추가 후 연결됩니다" style={{ "--team-color": team.primaryColor } as CSSProperties}>
                <span>{team.abbreviation}</span><strong>{team.shortName}</strong><small>준비 중</small>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TimelineSection({ side, now }: { side: Side; now: Date }) {
  const next = TIMELINE.find((item) => new Date(item.endDateTime).getTime() >= now.getTime());
  return (
    <section className="rivalry-timeline" id="timeline" aria-labelledby="timeline-title">
      <div className="rivalry-section-shell">
        <Reveal>
          <SectionHeading
            number="06"
            title={<><span>정기전</span><strong id="timeline-title">까지.</strong></>}
            description={<>응원 OT에서 합동응원전으로, 그리고 10월의 정기 {SIDE_META[side].rivalryName}으로.</>}
          />
        </Reveal>
        <div className="rivalry-timeline__list">
          {TIMELINE.map((item) => {
            const state = eventState(item, now, next?.id);
            const title = item.isFinal ? `2026 정기 ${SIDE_META[side].rivalryName}` : item.title;
            return (
              <article key={item.id} className={`rivalry-timeline-row is-${state} ${item.side === side ? "is-own-side" : ""} ${item.isFinal ? "is-final" : ""}`}>
                <div className="rivalry-timeline-row__date">{item.dateLabel}</div>
                <div className="rivalry-timeline-row__marker"><i /><span>{stateLabel(state)}</span></div>
                <div className="rivalry-timeline-row__body"><h3>{title}</h3><p>{item.detail}</p></div>
                {item.side && <span className={`rivalry-timeline-row__side is-${item.side}`}>{SIDE_META[item.side].symbol}</span>}
                {item.isFinal && <CalendarDays size={21} aria-hidden="true" />}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PlayerScreen({ song, autoplay = false }: { song: SongSummary; autoplay?: boolean }) {
  if (!song.media) {
    return (
      <div className="rivalry-player-pending">
        <div aria-hidden="true">{[40, 72, 52, 88, 60, 94, 45, 78, 58, 84, 38, 68].map((height, index) => <i key={index} style={{ "--bar": `${height}%` } as CSSProperties} />)}</div>
        <Music2 size={26} aria-hidden="true" />
        <strong>미리 듣기 준비 중</strong>
        <span>정본 미디어가 등록되면 같은 자리에 바로 연결됩니다.</span>
      </div>
    );
  }

  const params = new URLSearchParams({ autoplay: autoplay ? "1" : "0", playsinline: "1", rel: "0" });
  if (song.media.startSeconds) params.set("start", String(song.media.startSeconds));
  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${song.media.videoId}?${params.toString()}`}
      title={`${song.title} 미리 듣기`}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}

function FocusPlayer({ open, onOpenChange, songs, initialSong, mode }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songs: SongSummary[];
  initialSong?: SongSummary;
  mode: "detail" | "cram";
}) {
  const defaultIndex = initialSong ? Math.max(0, songs.findIndex((song) => song.id === initialSong.id)) : 0;
  const [index, setIndex] = useState(defaultIndex);
  const [playVersion, setPlayVersion] = useState(0);

  useEffect(() => {
    if (!open) return;
    setIndex(defaultIndex);
    setPlayVersion((version) => version + 1);
  }, [defaultIndex, open]);

  const song = songs[index] ?? songs[0];
  if (!song) return null;

  function select(nextIndex: number) {
    setIndex((nextIndex + songs.length) % songs.length);
    setPlayVersion((version) => version + 1);
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      className="rivalry-focus-dialog"
      labelledBy="rivalry-focus-title"
      describedBy="rivalry-focus-description"
    >
      <div className="rivalry-focus-dialog__head">
        <div>
          <small>{mode === "cram" ? `15분 벼락치기 · ${index + 1}/${songs.length}` : `${song.teamName} · 응원가 상세`}</small>
          <h2 id="rivalry-focus-title">{song.title}</h2>
          <span>{song.tags.join(" · ")}</span>
        </div>
        <button type="button" onClick={() => onOpenChange(false)} aria-label="응원가 상세 닫기"><X size={19} aria-hidden="true" /></button>
      </div>
      <div className="rivalry-focus-dialog__main">
        <div className="rivalry-focus-dialog__media">
          <div className="rivalry-focus-dialog__screen" key={`${song.id}-${playVersion}`}><PlayerScreen song={song} autoplay={playVersion > 0} /></div>
          {song.media && (
            <div className="rivalry-focus-dialog__media-meta">
              <div><strong>{song.media.title ?? `${song.title} 응원 영상`}</strong>{song.media.channelName && <span>{song.media.channelName}</span>}</div>
              <a href={song.media.sourceUrl} target="_blank" rel="noreferrer">YouTube <ExternalLink size={11} aria-hidden="true" /></a>
            </div>
          )}
          {mode === "cram" && songs.length > 1 && (
            <div className="rivalry-focus-dialog__controls">
              <button type="button" onClick={() => select(index - 1)} aria-label="이전 곡"><SkipBack size={18} fill="currentColor" aria-hidden="true" /></button>
              <span><Pause size={16} fill="currentColor" aria-hidden="true" /></span>
              <button type="button" onClick={() => select(index + 1)} aria-label="다음 곡"><SkipForward size={18} fill="currentColor" aria-hidden="true" /></button>
            </div>
          )}
        </div>
        <div className="rivalry-focus-dialog__details">
          <div className="rivalry-focus-dialog__facts" aria-label="곡 요약 정보">
            <div><small>소속</small><strong>{song.teamShortName}</strong></div>
            <div><small>도입·분류</small><strong>{song.yearLabel ?? "정보 준비 중"}</strong></div>
            <div><small>재생시간</small><strong>{formatDuration(song.durationSeconds)}</strong></div>
          </div>
          <section className="rivalry-focus-dialog__copy">
            <small>곡 소개</small>
            <p id="rivalry-focus-description">{song.description}</p>
          </section>
          {song.usageContext && (
            <section className="rivalry-focus-dialog__copy">
              <small>현장 포인트</small>
              <p>{song.usageContext}</p>
            </section>
          )}
          {song.chronologyNote && (
            <section className="rivalry-focus-dialog__copy">
              <small>기록</small>
              <p>{song.chronologyNote}</p>
            </section>
          )}
          {song.dataStatus === "mock" && (
            <p className="rivalry-focus-dialog__notice">현재 기획용 목 데이터입니다. 정본 응원가가 등록되면 상세 정보와 영상이 이 화면에 그대로 연결됩니다.</p>
          )}
          {song.archiveHref && <a className="rivalry-focus-dialog__archive" href={song.archiveHref}>메인 아카이브에서 전체 정보 보기 <ArrowRight size={13} aria-hidden="true" /></a>}
        </div>
      </div>
      {mode === "cram" && songs.length > 1 && (
        <div className="rivalry-focus-dialog__queue">
          {songs.map((item, itemIndex) => (
            <button key={item.id} className={itemIndex === index ? "is-active" : ""} type="button" onClick={() => select(itemIndex)}>
              <span>{String(itemIndex + 1).padStart(2, "0")}</span><strong>{item.title}</strong>
            </button>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

function EventFooter({ side }: { side: Side }) {
  return (
    <footer className="rivalry-footer">
      <div className="rivalry-footer__split" aria-hidden="true"><span>연</span><span>고</span></div>
      <div className="rivalry-footer__content">
        <p>응원은 여기서 끝나지 않습니다.</p>
        <h2>더 많은 응원가와<br />그 원곡을 둘러보세요.</h2>
        <a href={EVENT.archiveHref}>전체 응원가 탐색 <ArrowRight size={18} aria-hidden="true" /></a>
        <div className="rivalry-footer__meta">
          <span>본 페이지는 양교의 공식 행사 페이지가 아닌 비공식 응원가 아카이브입니다.</span>
          <span>일정·장소는 공식 채널에서 다시 확인해주세요.</span>
          <span>일부 응원가와 연결 관계는 구현 검증용 목 데이터이며 정본 승인 후 교체됩니다.</span>
          <small>LAST UPDATED · {EVENT.updatedAt} · VIEWING AS {SIDE_META[side].englishName}</small>
        </div>
      </div>
    </footer>
  );
}

export function KoreaYonseiGamesPage() {
  const [side, setSide] = useState<Side>(initialSide);
  const [activeSong, setActiveSong] = useState<SongSummary>();
  const [focusOpen, setFocusOpen] = useState(false);
  const [focusMode, setFocusMode] = useState<"detail" | "cram">("detail");
  const [heroVisible, setHeroVisible] = useState(true);
  const heroRef = useRef<HTMLElement>(null);
  const now = useNow();
  const contents = useMemo<Record<Side, ResolvedSideContent>>(() => ({
    yonsei: getSideContent("yonsei"),
    korea: getSideContent("korea"),
  }), []);
  const content = contents[side];
  const focusSongs = focusMode === "cram" ? content.mustKnowSongs : activeSong ? [activeSong] : [];

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting), { threshold: 0.12 });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("school", side);
    window.history.replaceState({}, "", url);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", SIDE_META[side].deep);
    setActiveSong(undefined);
    setFocusOpen(false);
  }, [side]);

  function selectSong(song: SongSummary) {
    setActiveSong(song);
    setFocusMode("detail");
    setFocusOpen(true);
  }

  function openFocus() {
    setActiveSong(content.mustKnowSongs[0]);
    setFocusMode("cram");
    setFocusOpen(true);
  }

  return (
    <div
      className="rivalry-page"
      data-side={side}
      style={{
        "--side": SIDE_META[side].primary,
        "--side-deep": SIDE_META[side].deep,
        "--opponent": SIDE_META[side].opponent,
      } as CSSProperties}
    >
      <EventHeader side={side} onSideChange={setSide} showSideSwitch={!heroVisible} />
      <main>
        <Hero side={side} onSideChange={setSide} heroRef={heroRef} now={now} />
        <ScheduleSection side={side} now={now} />
        <MustKnowSection content={content} activeSong={activeSong} onSelect={selectSong} onFocus={openFocus} />
        <MemorySection content={content} activeSong={activeSong} onSelect={selectSong} />
        <RivalrySection side={side} contents={contents} onSelect={selectSong} />
        <BaseballSection content={content} onSelect={selectSong} />
        <TimelineSection side={side} now={now} />
      </main>
      <EventFooter side={side} />
      <FocusPlayer open={focusOpen} onOpenChange={setFocusOpen} songs={focusSongs} initialSong={activeSong} mode={focusMode} />
      <div className="sr-only" aria-live="polite">{SIDE_META[side].name} 관점, 2026 정기 {SIDE_META[side].rivalryName}</div>
    </div>
  );
}
