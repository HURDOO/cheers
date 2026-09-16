import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowLeft,
  CalendarDays,
  Check,
  CircleAlert,
  ExternalLink,
  MapPin,
  Share2,
} from "lucide-react";
import {
  EVENT,
  PROGRAMS,
  SCHOOL_ORDER,
  SCHOOLS,
  SONGS,
  TIMELINE,
  type EventSong,
  type SchoolId,
} from "../yongin-university-games/mockData";

function ddayLabel() {
  const difference = new Date(EVENT.startDate).getTime() - Date.now();
  const days = Math.ceil(difference / 86_400_000);
  if (days > 0) return `D-${days}`;
  if (days === 0) return "D-DAY";
  return `D+${Math.abs(days)}`;
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setVisible(true);
      observer.disconnect();
    }, { threshold: 0.12 });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`yg-reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ "--yg-delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}

function StatusLabel({ song }: { song: EventSong }) {
  return <span className={`yg-status yg-status--${song.status}`}>{song.statusLabel}</span>;
}

function EventHeader() {
  const [shared, setShared] = useState(false);

  async function sharePage() {
    const payload = { title: `${EVENT.title} — 응원가 아카이브`, text: EVENT.tagline, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(payload);
      else {
        await navigator.clipboard.writeText(window.location.href);
        setShared(true);
        window.setTimeout(() => setShared(false), 1800);
      }
    } catch {
      // Closing a native share sheet should not change the page.
    }
  }

  return (
    <header className="yg-header">
      <a href="/" className="yg-header__brand"><ArrowLeft size={15} /> 응원가 아카이브</a>
      <span className="yg-header__event">용인청정대학체전 · 2026</span>
      <div className="yg-header__actions">
        <span className="yg-dday">{ddayLabel()}</span>
        <button type="button" className="yg-share" onClick={sharePage}>
          {shared ? <Check size={14} /> : <Share2 size={14} />}
          <span>{shared ? "복사됨" : "공유"}</span>
        </button>
      </div>
    </header>
  );
}

function FiveFlags() {
  return (
    <div className="yg-flags" aria-label="참가 대학 5곳">
      <span className="yg-flags__number" aria-hidden="true">05</span>
      <div className="yg-flags__field" aria-hidden="true"><i /><i /></div>
      <div className="yg-flags__list">
        {SCHOOL_ORDER.map((id, index) => {
          const school = SCHOOLS[id];
          return (
            <div
              key={id}
              className="yg-flag"
              style={{ "--flag": school.accent, "--flag-delay": `${0.12 + index * 0.08}s` } as CSSProperties}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{school.shortName}</strong>
              <small>{school.campus}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="yg-hero" aria-labelledby="yg-title">
      <div className="yg-hero__copy">
        <p className="yg-kicker">제1회 · YONGIN UNIVERSITY GAMES</p>
        <h1 id="yg-title">
          <span>다섯 학교,</span>
          <strong>한 운동장.</strong>
        </h1>
        <p className="yg-hero__tagline">처음 만나는 다섯 개의 함성.</p>
        <p className="yg-hero__description">용인의 다섯 대학이 스포츠와 응원으로 처음 한자리에 모입니다. 우리 학교의 노래를 미리 확인하고 현장의 첫 기록에 합류하세요.</p>
        <div className="yg-hero__facts">
          <div><CalendarDays size={15} /><span>2026. 09. 04 FRI</span></div>
          <div><MapPin size={15} /><span>용인아르피아 축구장</span></div>
        </div>
        <button type="button" className="yg-primary-action" onClick={() => scrollToSection("cheer-guide")}>
          학교별 응원가 보기 <ArrowDown size={15} />
        </button>
      </div>
      <FiveFlags />
    </section>
  );
}

function SchoolTabs({ activeSchool, onSelect }: { activeSchool: SchoolId; onSelect: (id: SchoolId) => void }) {
  return (
    <div className="yg-school-tabs" role="tablist" aria-label="응원할 학교 선택">
      {SCHOOL_ORDER.map((id, index) => {
        const school = SCHOOLS[id];
        return (
          <button
            key={id}
            id={`school-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={activeSchool === id}
            aria-controls="school-cheer-panel"
            className={`yg-school-tab ${activeSchool === id ? "is-active" : ""}`}
            style={{ "--school": school.accent } as CSSProperties}
            onClick={() => onSelect(id)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{school.shortName}</strong>
            <small>{school.campus}</small>
          </button>
        );
      })}
    </div>
  );
}

function SongCard({ song, index }: { song: EventSong; index: number }) {
  return (
    <article className={`yg-song-card ${song.placeholder ? "yg-song-card--placeholder" : ""}`}>
      <div className="yg-song-card__index">{String(index + 1).padStart(2, "0")}</div>
      <div className="yg-song-card__main">
        <span className="yg-song-card__eyebrow">{song.eyebrow}</span>
        <h3>{song.title}</h3>
        <p>{song.description}</p>
        <div className="yg-song-card__meta">
          <StatusLabel song={song} />
          {song.year && <span>{song.year}</span>}
          {song.original && <span>원곡 · {song.original}</span>}
        </div>
      </div>
      <p className="yg-song-card__note"><CircleAlert size={13} /> {song.context}</p>
    </article>
  );
}

function CheerGuide() {
  const [activeSchool, setActiveSchool] = useState<SchoolId>("kyunghee");
  const school = SCHOOLS[activeSchool];
  const songs = useMemo(() => SONGS.filter((song) => song.school === activeSchool), [activeSchool]);

  return (
    <section className="yg-guide" id="cheer-guide" aria-labelledby="guide-title">
      <Reveal className="yg-section-intro">
        <p>01 · 응원 가이드</p>
        <div>
          <h2 id="guide-title">우리 학교를 고르면,<br />필요한 노래만 보입니다.</h2>
          <span>학교 선택과 응원곡 확인을 한 화면에서 끝냅니다.</span>
        </div>
      </Reveal>

      <SchoolTabs activeSchool={activeSchool} onSelect={setActiveSchool} />

      <div
        id="school-cheer-panel"
        role="tabpanel"
        aria-labelledby={`school-tab-${activeSchool}`}
        className="yg-school-panel"
        key={activeSchool}
        style={{ "--school": school.accent, "--school-soft": school.accentSoft, "--school-ink": school.ink } as CSSProperties}
      >
        <div className="yg-school-panel__identity">
          <span className="yg-school-panel__code">{school.code}</span>
          <h3>{school.name}</h3>
          <p>{school.campus}</p>
          <div className="yg-school-panel__squad">
            <span>응원 조직</span>
            <strong>{school.squad}</strong>
            <small>{school.squadNote}</small>
          </div>
          <div className="yg-school-panel__mark" aria-hidden="true">{school.shortName.slice(0, 1)}</div>
        </div>
        <div className="yg-song-list">
          <div className="yg-song-list__heading">
            <span>먼저 알아둘 응원</span>
            <span>{String(songs.length).padStart(2, "0")} ITEMS</span>
          </div>
          {songs.map((song, index) => <SongCard key={song.id} song={song} index={index} />)}
        </div>
      </div>
      <p className="yg-guide__footnote">실제 영상·가사 링크는 검수된 아카이브 데이터가 연결된 곡에만 제공할 예정입니다.</p>
    </section>
  );
}

function ProgramSection() {
  return (
    <section className="yg-program" aria-labelledby="program-title">
      <Reveal className="yg-section-intro yg-section-intro--program">
        <p>02 · 대회 프로그램</p>
        <div>
          <h2 id="program-title">승부와 응원이<br />같은 일정에 놓입니다.</h2>
          <span>확인된 프로그램만 먼저 표시합니다.</span>
        </div>
      </Reveal>
      <div className="yg-program-list">
        {PROGRAMS.map((program, index) => (
          <Reveal key={program.index} className="yg-program-row" delay={index * 0.05}>
            <span>{program.index}</span>
            <strong>{program.name}</strong>
            <small>{program.label}</small>
            <p>{program.note}</p>
            <i>{program.state === "pending" ? "공개 대기" : "확인"}</i>
          </Reveal>
        ))}
      </div>
      <Reveal className="yg-program-notice">
        <CalendarDays size={16} />
        <p><strong>대진표와 세부 시간은 아직 공개 전입니다.</strong> 공식 일정이 확인되면 이 영역에 경기 순서와 응원전 시간을 추가합니다.</p>
      </Reveal>
    </section>
  );
}

function SchoolComparison() {
  return (
    <section className="yg-comparison" aria-labelledby="comparison-title">
      <Reveal className="yg-comparison__heading">
        <p>03 · 다섯 학교의 응원</p>
        <h2 id="comparison-title">같은 방식으로<br />응원하지 않습니다.</h2>
        <span>응원단, 치어리딩 동아리, 캠퍼스 응원문화가 서로 다르기 때문에 확인된 범위도 다르게 표시합니다.</span>
      </Reveal>
      <div className="yg-comparison__table">
        <div className="yg-comparison__labels" aria-hidden="true">
          <span>학교</span><span>응원 조직</span><span>먼저 볼 항목</span><span>확인 상태</span>
        </div>
        {SCHOOL_ORDER.map((id, index) => {
          const school = SCHOOLS[id];
          const firstSong = SONGS.find((song) => song.school === id)!;
          return (
            <Reveal key={id} className="yg-comparison-row" delay={index * 0.04}>
              <div className="yg-comparison-row__school"><i style={{ background: school.accent }} /><strong>{school.name}</strong><small>{school.campus}</small></div>
              <div><span>응원 조직</span><strong>{school.squad}</strong></div>
              <div><span>먼저 볼 항목</span><strong>{firstSong.title}</strong></div>
              <StatusLabel song={firstSong} />
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function EventStory() {
  return (
    <section className="yg-story" aria-labelledby="story-title">
      <Reveal className="yg-section-intro">
        <p>04 · 시작의 기록</p>
        <div>
          <h2 id="story-title">청년의 제안이<br />첫 번째 체전이 되기까지.</h2>
          <span>경기 결과뿐 아니라 행사가 시작된 이유도 함께 남깁니다.</span>
        </div>
      </Reveal>
      <div className="yg-story-grid">
        <div className="yg-timeline">
          {TIMELINE.map((item, index) => (
            <Reveal key={item.year} className="yg-timeline__item" delay={index * 0.06}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item.year}</strong>
              <div><h3>{item.title}</h3><p>{item.copy}</p></div>
            </Reveal>
          ))}
        </div>
        <Reveal className="yg-event-card">
          <span>EVENT INFORMATION</span>
          <h3>{EVENT.title}</h3>
          <dl>
            <div><dt>일시</dt><dd>2026년 9월 4일 금요일</dd></div>
            <div><dt>장소</dt><dd>용인아르피아 축구장</dd></div>
            <div><dt>참가</dt><dd>용인 소재 5개 대학</dd></div>
            <div><dt>정보</dt><dd>마지막 확인 {EVENT.updatedAt}</dd></div>
          </dl>
          <p><CircleAlert size={14} /> 관람·교통·우천 안내는 공식 공지 확인 후 추가됩니다.</p>
        </Reveal>
      </div>
    </section>
  );
}

function EventFooter() {
  return (
    <footer className="yg-footer">
      <div>
        <span>2026 · FIRST ARCHIVE</span>
        <strong>다섯 학교,<br />한 운동장.</strong>
      </div>
      <p>행사 전에는 응원 가이드로,<br />행사 후에는 첫 체전의 기록으로 남습니다.</p>
      <a href="/">응원가 아카이브로 돌아가기 <ExternalLink size={13} /></a>
    </footer>
  );
}

export function YonginUniversityGamesLegacyPage() {
  return (
    <div className="yg-page">
      <EventHeader />
      <main>
        <Hero />
        <CheerGuide />
        <ProgramSection />
        <SchoolComparison />
        <EventStory />
      </main>
      <EventFooter />
    </div>
  );
}
