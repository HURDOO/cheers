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
} from "./mockData";

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
      className={`race-reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ "--reveal-delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </div>
  );
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
      // Closing the native share sheet should leave the page unchanged.
    }
  }

  return (
    <header className="race-header">
      <a href="/" className="race-header__back"><ArrowLeft size={15} /> 응원가 아카이브</a>
      <span className="race-header__title">YONGIN UNIVERSITY GAMES</span>
      <div className="race-header__actions">
        <span>{ddayLabel()}</span>
        <button type="button" onClick={sharePage} aria-label="페이지 공유하기">
          {shared ? <Check size={14} /> : <Share2 size={14} />}
          <i>{shared ? "복사됨" : "공유"}</i>
        </button>
      </div>
    </header>
  );
}

function TrackHero() {
  return (
    <section className="race-hero" aria-labelledby="race-title">
      <div className="race-hero__noise" aria-hidden="true" />
      <div className="race-hero__date" aria-hidden="true"><span>09</span><i />04</div>
      <div className="race-hero__lanes" aria-hidden="true">
        {SCHOOL_ORDER.map((id, index) => (
          <i
            key={id}
            style={{ "--lane": SCHOOLS[id].accent, "--lane-index": index, "--lane-delay": `${0.2 + index * 0.08}s` } as CSSProperties}
          />
        ))}
      </div>

      <div className="race-hero__content">
        <p className="race-label">2026 · 제1회 용인청정대학체전</p>
        <h1 id="race-title"><span>다섯 개의</span><strong>트랙이 만난다.</strong></h1>
        <p className="race-hero__lead">스포츠와 응원, 서로 다른 다섯 대학의 문화가<br />용인의 한 경기장으로 합류합니다.</p>
        <div className="race-hero__meta">
          <span><CalendarDays size={14} /> 2026. 09. 04 FRI</span>
          <span><MapPin size={14} /> 용인아르피아 축구장</span>
        </div>
        <button type="button" onClick={() => scrollToSection("cheer-board")}>
          우리 학교 응원 준비 <ArrowDown size={15} />
        </button>
      </div>

      <div className="race-hero__schools" aria-label="참가 대학">
        {SCHOOL_ORDER.map((id, index) => {
          const school = SCHOOLS[id];
          return (
            <div key={id} style={{ "--school": school.accent } as CSSProperties}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{school.shortName}</strong>
              <small>{school.campus}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SongLine({ song, index }: { song: EventSong; index: number }) {
  return (
    <article className={`race-song ${song.placeholder ? "is-pending" : ""}`}>
      <span className="race-song__number">{String(index + 1).padStart(2, "0")}</span>
      <div className="race-song__title">
        <small>{song.eyebrow}</small>
        <h3>{song.title}</h3>
      </div>
      <p>{song.description}</p>
      <div className="race-song__facts">
        <strong>{song.statusLabel}</strong>
        {song.year && <span>{song.year}</span>}
        {song.original && <span>원곡 · {song.original}</span>}
      </div>
      <small className="race-song__note"><CircleAlert size={12} /> {song.context}</small>
    </article>
  );
}

function CheerBoard() {
  const [activeSchool, setActiveSchool] = useState<SchoolId>("kyunghee");
  const school = SCHOOLS[activeSchool];
  const songs = useMemo(() => SONGS.filter((song) => song.school === activeSchool), [activeSchool]);
  const index = SCHOOL_ORDER.indexOf(activeSchool);

  return (
    <section className="race-board" id="cheer-board" aria-labelledby="cheer-board-title">
      <div className="race-board__top">
        <span className="race-label">01 · PICK YOUR TRACK</span>
        <h2 id="cheer-board-title">학교를 고르면<br />응원이 시작됩니다.</h2>
        <p>선택은 한 번, 필요한 정보는 한 화면.</p>
      </div>

      <div className="race-board__workspace">
        <nav className="race-team-nav" aria-label="응원할 학교 선택">
          {SCHOOL_ORDER.map((id, navIndex) => {
            const item = SCHOOLS[id];
            return (
              <button
                key={id}
                type="button"
                aria-pressed={activeSchool === id}
                className={activeSchool === id ? "is-active" : ""}
                style={{ "--school": item.accent } as CSSProperties}
                onClick={() => setActiveSchool(id)}
              >
                <span>{String(navIndex + 1).padStart(2, "0")}</span>
                <strong>{item.shortName}</strong>
                <small>{item.campus}</small>
              </button>
            );
          })}
        </nav>

        <div className="race-team" key={activeSchool} style={{ "--school": school.accent, "--school-soft": school.accentSoft } as CSSProperties}>
          <header className="race-team__header">
            <span className="race-team__number">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <small>{school.code}</small>
              <h3>{school.name}</h3>
              <p>{school.campus}</p>
            </div>
            <div className="race-team__squad"><span>응원 조직</span><strong>{school.squad}</strong><small>{school.squadNote}</small></div>
          </header>
          <div className="race-song-list">
            <div className="race-song-list__head"><span>CHEER NOTES</span><span>{String(songs.length).padStart(2, "0")} ITEMS</span></div>
            {songs.map((song, songIndex) => <SongLine key={song.id} song={song} index={songIndex} />)}
          </div>
          <p className="race-team__footnote">영상과 가사는 검수된 아카이브 자료가 연결된 경우에만 제공합니다.</p>
        </div>
      </div>
    </section>
  );
}

function ProgramBoard() {
  return (
    <section className="race-program" aria-labelledby="program-title">
      <div className="race-program__word" aria-hidden="true">PLAY</div>
      <Reveal className="race-program__intro">
        <span className="race-label">02 · WHAT WE PLAY</span>
        <h2 id="program-title">경기도 응원도<br />함께 플레이.</h2>
        <p>첫 체전에서 공식 확인된 네 가지 프로그램입니다.</p>
      </Reveal>
      <div className="race-program__list">
        {PROGRAMS.map((program, index) => (
          <Reveal key={program.index} className="race-program-row" delay={index * 0.055}>
            <span>{program.index}</span>
            <div><small>{program.label}</small><strong>{program.name}</strong></div>
            <p>{program.note}</p>
            <i>{program.state === "pending" ? "DETAILS PENDING" : "CONFIRMED"}</i>
          </Reveal>
        ))}
      </div>
      <div className="race-program__notice"><strong>대진표·세부 시간 공개 전</strong><span>공식 일정 확인 후 경기 순서와 응원전 시간을 이 자리에 바로 반영합니다.</span></div>
    </section>
  );
}

function FiveSides() {
  return (
    <section className="race-sides" aria-labelledby="sides-title">
      <Reveal className="race-sides__heading">
        <span className="race-label">03 · FIVE DIFFERENT SIDES</span>
        <h2 id="sides-title">다섯 학교는<br />서로 다르게 응원합니다.</h2>
      </Reveal>
      <div className="race-sides__grid">
        {SCHOOL_ORDER.map((id, index) => {
          const school = SCHOOLS[id];
          const firstSong = SONGS.find((song) => song.school === id)!;
          return (
            <Reveal key={id} className="race-side" delay={index * 0.05}>
              <i style={{ background: school.accent }} />
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{school.shortName}</h3>
              <small>{school.name}<br />{school.campus}</small>
              <dl>
                <div><dt>응원 조직</dt><dd>{school.squad}</dd></div>
                <div><dt>먼저 볼 항목</dt><dd>{firstSong.title}</dd></div>
                <div><dt>상태</dt><dd>{firstSong.statusLabel}</dd></div>
              </dl>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function EventRecord() {
  return (
    <section className="race-record" aria-labelledby="record-title">
      <div className="race-record__timeline">
        <span className="race-label">04 · HOW IT STARTED</span>
        <h2 id="record-title">청년의 제안에서<br />첫 번째 기록까지.</h2>
        <div>
          {TIMELINE.map((item, index) => (
            <Reveal key={item.year} className="race-record-row" delay={index * 0.06}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item.year}</strong>
              <div><h3>{item.title}</h3><p>{item.copy}</p></div>
            </Reveal>
          ))}
        </div>
      </div>
      <Reveal className="race-record__poster">
        <span>FRIDAY</span>
        <strong>SEP<br />04</strong>
        <p>YONGIN<br />ARPIA</p>
        <dl>
          <div><dt>행사</dt><dd>{EVENT.title}</dd></div>
          <div><dt>참가</dt><dd>용인 소재 5개 대학</dd></div>
          <div><dt>정보</dt><dd>마지막 확인 {EVENT.updatedAt}</dd></div>
        </dl>
      </Reveal>
    </section>
  );
}

function EventFooter() {
  return (
    <footer className="race-footer">
      <div><span>YONGIN · 2026</span><strong>다섯 개의 트랙이 만난다.</strong></div>
      <p>행사 전에는 응원 준비로,<br />행사 후에는 첫 체전의 기록으로.</p>
      <a href="/">응원가 아카이브로 돌아가기 <ExternalLink size={13} /></a>
    </footer>
  );
}

export function YonginUniversityGamesPage() {
  return (
    <div className="race-page">
      <EventHeader />
      <main>
        <TrackHero />
        <CheerBoard />
        <ProgramBoard />
        <FiveSides />
        <EventRecord />
      </main>
      <EventFooter />
    </div>
  );
}
