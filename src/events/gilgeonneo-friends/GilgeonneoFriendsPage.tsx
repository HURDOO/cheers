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
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  ExternalLink,
  Flame,
  MapPin,
  Music2,
  Play,
  Share2,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import {
  EVENT,
  EVENT_PHASES,
  MOCK_CHEERS,
  ORIGINAL_CARDS,
  SCHOOLS,
  SPORTS,
  type EventCheerMock,
  type SchoolId,
} from "./mockData";

function eventDateBadge() {
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
  const elementRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
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
      ref={elementRef}
      className={`gf-reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ "--gf-reveal-delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}

function EventHeader() {
  const [shared, setShared] = useState(false);

  async function handleShare() {
    const shareData = {
      title: `${EVENT.title} — 응원가 아카이브`,
      text: EVENT.tagline,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShared(true);
        window.setTimeout(() => setShared(false), 1800);
      }
    } catch {
      // The native share sheet can be dismissed without changing the page.
    }
  }

  return (
    <header className="gf-header">
      <a className="gf-header__brand" href="/" aria-label="응원가 아카이브로 돌아가기">
        <ArrowLeft aria-hidden="true" size={15} />
        <span>응원가 아카이브</span>
      </a>
      <div className="gf-header__actions">
        <span className="gf-header__dday">{eventDateBadge()}</span>
        <button className="gf-icon-button" type="button" onClick={handleShare} aria-label="페이지 공유하기">
          {shared ? <Check aria-hidden="true" size={15} /> : <Share2 aria-hidden="true" size={15} />}
          <span>{shared ? "복사됨" : "공유"}</span>
        </button>
      </div>
    </header>
  );
}

function RoadMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "gf-road-mark gf-road-mark--compact" : "gf-road-mark"} aria-hidden="true">
      {Array.from({ length: compact ? 5 : 9 }, (_, index) => <span key={index} />)}
    </div>
  );
}

function EventHero() {
  return (
    <section className="gf-hero" aria-labelledby="event-title">
      <div className="gf-hero__campus gf-hero__campus--konkuk" aria-hidden="true">
        <span className="gf-hero__campus-mark">KU</span>
        <span className="gf-hero__campus-name">KONKUK</span>
      </div>
      <div className="gf-hero__campus gf-hero__campus--sejong" aria-hidden="true">
        <span className="gf-hero__campus-mark">SJ</span>
        <span className="gf-hero__campus-name">SEJONG</span>
      </div>
      <div className="gf-hero__road"><RoadMark /></div>

      <div className="gf-hero__content">
        <p className="gf-kicker"><Sparkles size={13} aria-hidden="true" /> 2026 FIRST MATCH</p>
        <h1 id="event-title">
          <span>우린,</span>
          <strong>길건너 친구들</strong>
        </h1>
        <p className="gf-hero__date">{EVENT.dateRange}</p>
        <p className="gf-hero__tagline">{EVENT.tagline}</p>
        <div className="gf-hero__actions">
          <button type="button" className="gf-button gf-button--light" onClick={() => scrollToSection("cheers") }>
            1분 만에 응원 배우기 <ArrowDown size={15} aria-hidden="true" />
          </button>
          <button type="button" className="gf-button gf-button--ghost" onClick={() => scrollToSection("schedule") }>
            행사 일정 보기
          </button>
        </div>
      </div>

      <div className="gf-hero__versus" aria-hidden="true">
        <span>KONKUK</span><b>VS</b><span>SEJONG</span>
      </div>
    </section>
  );
}

function EventQuickRail() {
  return (
    <section className="gf-quick-rail" aria-label="행사 핵심 정보">
      <div className="gf-quick-rail__item">
        <span>01</span><strong>첫 개최</strong><p>2026년 신설 대학 대항전</p>
      </div>
      <div className="gf-quick-rail__item">
        <span>02</span><strong>4개 종목</strong><p>축구 · 농구 · 배드민턴 · e스포츠</p>
      </div>
      <div className="gf-quick-rail__item">
        <span>03</span><strong>거리전야제</strong><p>9월 18일 화양동 일대</p>
      </div>
      <button className="gf-quick-rail__jump" type="button" onClick={() => scrollToSection("story") }>
        왜 특별한가 <ArrowRight size={14} aria-hidden="true" />
      </button>
    </section>
  );
}

function SongPoster({ song }: { song: EventCheerMock }) {
  return (
    <div className={`gf-song-poster gf-song-poster--${song.school}`}>
      <div className="gf-song-poster__topline">
        <span>{song.eyebrow}</span>
        <span>{song.status === "mock" ? "DEVELOPMENT MOCK" : "CONTENT PREVIEW"}</span>
      </div>
      <div className="gf-song-poster__pulse" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <i key={index} style={{ height: `${22 + ((index * 19) % 58)}%` }} />
        ))}
      </div>
      <div className="gf-song-poster__title">
        <p>{SCHOOLS[song.school].englishName}</p>
        <strong>{song.title}</strong>
      </div>
      <div className="gf-song-poster__media">
        <span className="gf-play-placeholder"><Play size={18} fill="currentColor" aria-hidden="true" /></span>
        <span>{song.videoLabel}</span>
      </div>
    </div>
  );
}

function CheerStage() {
  const [school, setSchool] = useState<SchoolId>("konkuk");
  const [activeId, setActiveId] = useState(MOCK_CHEERS[0].id);
  const schoolSongs = useMemo(() => MOCK_CHEERS.filter((song) => song.school === school), [school]);
  const activeSong = MOCK_CHEERS.find((song) => song.id === activeId) ?? schoolSongs[0];

  function chooseSchool(nextSchool: SchoolId) {
    setSchool(nextSchool);
    const firstSong = MOCK_CHEERS.find((song) => song.school === nextSchool);
    if (firstSong) setActiveId(firstSong.id);
  }

  return (
    <section className="gf-section gf-cheers" id="cheers" aria-labelledby="cheers-title">
      <Reveal className="gf-section-heading">
        <div>
          <p className="gf-section-number">01 · CHEERS FIRST</p>
          <h2 id="cheers-title">현장 가기 전,<br />이 곡부터.</h2>
        </div>
        <p>행사 정보보다 먼저, 실제 현장에서 꺼내 볼 수 있는 응원가 컨닝페이퍼를 만듭니다.</p>
      </Reveal>

      <div className="gf-school-switch" role="group" aria-label="학교 선택">
        {(Object.keys(SCHOOLS) as SchoolId[]).map((schoolId) => (
          <button
            key={schoolId}
            type="button"
            aria-pressed={school === schoolId}
            className={`gf-school-switch__button gf-school-switch__button--${schoolId}`}
            onClick={() => chooseSchool(schoolId)}
          >
            <span>{SCHOOLS[schoolId].mark}</span>
            <strong>{SCHOOLS[schoolId].shortName}대 응원</strong>
            <small>{MOCK_CHEERS.filter((song) => song.school === schoolId).length}개 미리보기</small>
          </button>
        ))}
      </div>

      <div className="gf-cheer-stage">
        <Reveal className="gf-cheer-stage__player">
          <SongPoster song={activeSong} />
          <div className="gf-song-copy">
            <div className="gf-song-copy__heading">
              <div>
                <span className={`gf-category gf-category--${activeSong.school}`}>{activeSong.category}</span>
                {activeSong.status === "mock" && <span className="gf-category gf-category--mock">MOCK</span>}
                <h3>{activeSong.title}</h3>
              </div>
              <span className="gf-song-copy__school">{SCHOOLS[activeSong.school].name}</span>
            </div>
            <p className="gf-song-copy__description">{activeSong.description}</p>
            <div className="gf-lyric-preview" aria-label="대표 가사 미리보기">
              <span>LYRIC / CALL</span>
              <strong>{activeSong.lyricPreview[0]}</strong>
              <strong>{activeSong.lyricPreview[1]}</strong>
            </div>
            <div className="gf-use-moment">
              <Clock3 size={15} aria-hidden="true" />
              <p><span>언제 부르나</span>{activeSong.useMoment}</p>
            </div>
          </div>
        </Reveal>

        <Reveal className="gf-song-queue" delay={0.08}>
          <div className="gf-song-queue__header">
            <span>PLAY QUEUE</span>
            <span>{String(schoolSongs.length).padStart(2, "0")} TRACKS</span>
          </div>
          {schoolSongs.map((song, index) => (
            <button
              key={song.id}
              type="button"
              aria-pressed={activeSong.id === song.id}
              className={`gf-song-row ${activeSong.id === song.id ? "is-active" : ""}`}
              onClick={() => setActiveId(song.id)}
            >
              <span className="gf-song-row__index">{String(index + 1).padStart(2, "0")}</span>
              <span className="gf-song-row__copy">
                <strong>{song.title}</strong>
                <small>{song.category}{song.status === "mock" ? " · 개발용 mock" : ""}</small>
              </span>
              <span className="gf-song-row__arrow"><ChevronRight size={16} aria-hidden="true" /></span>
            </button>
          ))}
          <div className="gf-song-queue__note">
            <CircleAlert size={14} aria-hidden="true" />
            <p>곡명 외 가사·영상·사용 상황은 실제 자료가 연결되기 전까지 mock으로 표시됩니다.</p>
          </div>
        </Reveal>
      </div>

      <div className="gf-mobile-dock" aria-label="모바일 현장 모드 미리보기">
        <button type="button" onClick={() => chooseSchool("konkuk")} aria-pressed={school === "konkuk"}>건국</button>
        <span><Music2 size={13} aria-hidden="true" /> {activeSong.title}</span>
        <button type="button" onClick={() => chooseSchool("sejong")} aria-pressed={school === "sejong"}>세종</button>
      </div>
    </section>
  );
}

function SquadStory() {
  return (
    <section className="gf-story" id="story" aria-labelledby="story-title">
      <div className="gf-story__road" aria-hidden="true"><RoadMark compact /></div>
      <Reveal className="gf-story__heading">
        <p className="gf-section-number">02 · TWO CHEER CULTURES</p>
        <h2 id="story-title"><span>1974</span><b>VS</b><span>2025</span></h2>
        <p>50년의 응원단과 이제 막 시작된 응원단이 길 하나를 사이에 두고 만난다.</p>
      </Reveal>

      <div className="gf-squad-grid">
        <Reveal className="gf-squad-card gf-squad-card--konkuk">
          <span className="gf-squad-card__year">1974 —</span>
          <p className="gf-squad-card__school">KONKUK UNIVERSITY</p>
          <h3>OX-K</h3>
          <p>학교 행사와 축제에서 오랫동안 건국대의 응원문화를 담당해 온 응원단.</p>
          <div className="gf-chip-row"><span>50년 이상</span><span>학교 대표 응원단</span><span>확립된 문화</span></div>
        </Reveal>
        <div className="gf-squad-grid__versus" aria-hidden="true"><Swords size={23} /><span>ACROSS<br />THE ROAD</span></div>
        <Reveal className="gf-squad-card gf-squad-card--sejong" delay={0.08}>
          <span className="gf-squad-card__year">2025 —</span>
          <p className="gf-squad-card__school">SEJONG UNIVERSITY</p>
          <h3>IGNIS</h3>
          <p>학교 축제를 시작으로 활동 범위를 넓히며 세종대의 응원문화를 새로 만들어가는 응원단.</p>
          <div className="gf-chip-row"><span>창단 2년차</span><span>신생 응원단</span><span>만들어지는 문화</span></div>
        </Reveal>
      </div>

      <div className="gf-story__notice">
        <CircleAlert size={15} aria-hidden="true" />
        <p><strong>양교 응원단 소개</strong>입니다. 두 응원단의 이번 행사 출연이 확정됐다는 의미는 아닙니다.</p>
      </div>
    </section>
  );
}

function SejongCulture() {
  return (
    <section className="gf-section gf-sejong-culture" aria-labelledby="sejong-culture-title">
      <Reveal className="gf-sejong-culture__intro">
        <p className="gf-section-number">03 · A CULTURE IN THE MAKING</p>
        <h2 id="sejong-culture-title">세종의 응원문화는<br /><em>지금 만들어지고 있다.</em></h2>
        <p>응원가 수를 억지로 맞추는 대신, 서로 다른 층위에서 자라난 세종대의 응원문화를 보여줍니다.</p>
      </Reveal>

      <div className="gf-culture-track">
        <Reveal className="gf-culture-card gf-culture-card--kings">
          <div className="gf-culture-card__icon"><Trophy size={20} aria-hidden="true" /></div>
          <span>BASEBALL CULTURE</span>
          <h3>세종킹스</h3>
          <p>선수와 매니저가 함께하는 중앙 야구동아리. 경기에서는 매니저들이 본격적인 야구 응원을 준비한다.</p>
          <div className="gf-callout"><b>세종!</b><ArrowRight size={16} /><b>킹스!</b></div>
          <div className="gf-chip-row"><span>야구 중앙동아리</span><span>매니저 응원</span><span>공식 응원단 아님</span></div>
        </Reveal>
        <span className="gf-culture-track__arrow" aria-hidden="true"><ArrowRight /></span>
        <Reveal className="gf-culture-card gf-culture-card--ignis" delay={0.06}>
          <div className="gf-culture-card__icon"><Flame size={20} aria-hidden="true" /></div>
          <span>NEW CHEER SQUAD</span>
          <h3>IGNIS</h3>
          <p>2025년 창단 이후 축제와 외부 공연으로 활동 범위를 넓히는 학교 단위 응원단.</p>
          <div className="gf-callout"><b>2025</b><ArrowRight size={16} /><b>NOW</b></div>
          <div className="gf-chip-row"><span>학교 응원단</span><span>활동 확대 중</span><span>실사용 곡 확인 중</span></div>
        </Reveal>
        <span className="gf-culture-track__arrow" aria-hidden="true"><ArrowRight /></span>
        <Reveal className="gf-culture-card gf-culture-card--event" delay={0.12}>
          <div className="gf-culture-card__icon"><Users size={20} aria-hidden="true" /></div>
          <span>FIRST COLLEGE MATCH</span>
          <h3>2026</h3>
          <p>응원단과 학교 노래 문화가 자리를 잡아가는 시기에 시작된 건국대와의 첫 독립 대항전.</p>
          <div className="gf-callout"><b>건국</b><Swords size={16} /><b>세종</b></div>
          <div className="gf-chip-row"><span>첫 개최</span><span>4개 종목</span><span>거리 교류</span></div>
        </Reveal>
      </div>
    </section>
  );
}

function EventSchedule() {
  return (
    <section className="gf-section gf-schedule" id="schedule" aria-labelledby="schedule-title">
      <Reveal className="gf-section-heading gf-section-heading--schedule">
        <div>
          <p className="gf-section-number">04 · THE EVENT</p>
          <h2 id="schedule-title">길을 건너면,<br />경기가 시작된다.</h2>
        </div>
        <p>스포츠 예선에서 화양동 거리전야제를 거쳐 결선으로 이어지는 첫해 행사입니다.</p>
      </Reveal>

      <div className="gf-sports" aria-label="경기 종목">
        {SPORTS.map((sport, index) => (
          <Reveal key={sport} className="gf-sport" delay={index * 0.035}>
            <span>{String(index + 1).padStart(2, "0")}</span><strong>{sport}</strong>
          </Reveal>
        ))}
      </div>

      <div className="gf-phase-list">
        {EVENT_PHASES.map((phase, index) => (
          <Reveal className="gf-phase" key={phase.label} delay={index * 0.06}>
            <span className="gf-phase__index">{phase.index}</span>
            <div className="gf-phase__date"><CalendarDays size={16} aria-hidden="true" /><strong>{phase.date}</strong></div>
            <div className="gf-phase__copy"><h3>{phase.label}</h3><p>{phase.description}</p></div>
            {index < EVENT_PHASES.length - 1 && <span className="gf-phase__line" aria-hidden="true" />}
          </Reveal>
        ))}
      </div>

      <div className="gf-event-note">
        <MapPin size={17} aria-hidden="true" />
        <p><strong>장소</strong> 건국대학교 운동장 · 지프로 PC방 · 건대입구 및 화양동 일대</p>
        <span>마지막 반영 {EVENT.updatedAt}</span>
      </div>
    </section>
  );
}

function OriginalSources() {
  return (
    <section className="gf-sources" aria-labelledby="sources-title">
      <Reveal className="gf-sources__heading">
        <div>
          <p className="gf-section-number">05 · ORIGINALS & CONNECTIONS</p>
          <h2 id="sources-title">노래 뒤에 있는<br />작은 연결들.</h2>
        </div>
        <p>응원가가 중심이고, 원곡과 같은 원곡 응원가는 작은 카드로 뒤를 받칩니다.</p>
      </Reveal>
      <div className="gf-source-grid">
        {ORIGINAL_CARDS.map((source, index) => (
          <Reveal key={source.index} className={`gf-source-card gf-source-card--${source.tone}`} delay={index * 0.06}>
            <div className="gf-source-card__art" aria-hidden="true">
              <span>{source.index}</span><i /><b>{source.title.slice(0, 1)}</b>
            </div>
            <div>
              <span>{source.relation}</span>
              <h3>{source.title}</h3>
              <p>{source.artist}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <p className="gf-sources__pending">같은 원곡 응원가와 실제 아카이브 링크는 운영 데이터 연결 단계에서 추가됩니다.</p>
    </section>
  );
}

function EventFooter() {
  return (
    <footer className="gf-footer">
      <div className="gf-footer__title">
        <span>2026 SPECIAL ARCHIVE</span>
        <strong>우린, 길건너 친구들</strong>
      </div>
      <div className="gf-footer__notice">
        <CircleAlert size={15} aria-hidden="true" />
        <p>{EVENT.notice}</p>
      </div>
      <a href="/">응원가 아카이브 돌아가기 <ExternalLink size={13} aria-hidden="true" /></a>
    </footer>
  );
}

export function GilgeonneoFriendsPage() {
  return (
    <div className="gf-page">
      <EventHeader />
      <main>
        <EventHero />
        <EventQuickRail />
        <CheerStage />
        <SquadStory />
        <SejongCulture />
        <EventSchedule />
        <OriginalSources />
      </main>
      <EventFooter />
    </div>
  );
}
