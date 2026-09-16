import {
  useEffect,
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
  CircleAlert,
  ExternalLink,
  Instagram,
  MapPin,
  Music2,
  Play,
  Share2,
  Sparkles,
  Waves,
  Youtube,
} from "lucide-react";
import {
  EVENT,
  NEW_CHEER,
  PAST_OT_TRACKS,
  QUICK_TRACKS,
  TIMELINE,
  TRACKS,
  formatDuration,
  type EventTrack,
  type PastOtTrack,
  type TrackMedia,
} from "./eventData";

interface PlayerTrack {
  id: string;
  title: string;
  description: string;
  evidenceLabel: string;
  media?: TrackMedia;
}

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

function asPlayerTrack(track: EventTrack): PlayerTrack {
  return track;
}

function pastAsPlayerTrack(track: PastOtTrack): PlayerTrack {
  return {
    id: `past-${track.id}`,
    title: track.title,
    description: "지난 상반기 응원 OT에서 함께 즐겼던 곡입니다.",
    evidenceLabel: track.note,
    media: track.media,
  };
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.12 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`skku-reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ "--skku-reveal-delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}

function WaveBars({ compact = false }: { compact?: boolean }) {
  const heights = compact
    ? [20, 46, 70, 36, 84, 58, 30, 76, 48, 24, 64, 38]
    : [18, 34, 58, 84, 44, 72, 96, 52, 36, 78, 62, 26, 48, 88, 66, 32, 74, 42, 92, 56, 28, 68, 46, 82];

  return (
    <span className={`skku-wave-bars ${compact ? "is-compact" : ""}`} aria-hidden="true">
      {heights.map((height, index) => (
        <i key={`${height}-${index}`} style={{ "--bar-height": `${height}%`, "--bar-delay": `${index * -0.08}s` } as CSSProperties} />
      ))}
    </span>
  );
}

function EventHeader() {
  const [shared, setShared] = useState(false);

  async function sharePage() {
    const payload = { title: `${EVENT.title} — 응원가 예습`, text: EVENT.tagline, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(payload);
      else {
        await navigator.clipboard.writeText(window.location.href);
        setShared(true);
        window.setTimeout(() => setShared(false), 1800);
      }
    } catch {
      // Closing the native share sheet should not change the page.
    }
  }

  return (
    <header className="skku-header">
      <a href="/" className="skku-header__brand">
        <ArrowLeft size={15} aria-hidden="true" />
        <span>응원가 아카이브</span>
      </a>
      <nav className="skku-header__nav" aria-label="페이지 바로가기">
        <button type="button" onClick={() => scrollToSection("quick-prep")}>예습</button>
        <button type="button" onClick={() => scrollToSection("new-cheer")}>신곡</button>
        <button type="button" onClick={() => scrollToSection("all-cheers")}>전체곡</button>
        <button type="button" onClick={() => scrollToSection("about-ot")}>응원 OT</button>
      </nav>
      <div className="skku-header__actions">
        <span>{ddayLabel()}</span>
        <button type="button" onClick={sharePage} aria-label="페이지 공유하기">
          {shared ? <Check size={14} aria-hidden="true" /> : <Share2 size={14} aria-hidden="true" />}
          <i>{shared ? "복사됨" : "공유"}</i>
        </button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="skku-hero" aria-labelledby="skku-event-title">
      <div className="skku-hero__aurora" aria-hidden="true" />
      <div className="skku-hero__grain" aria-hidden="true" />
      <div className="skku-hero__wave" aria-hidden="true">
        <WaveBars />
        <span>WAVE</span>
      </div>
      <div className="skku-hero__content">
        <p className="skku-eyebrow"><Sparkles size={13} aria-hidden="true" /> {EVENT.eyebrow}</p>
        <h1 id="skku-event-title">
          <span>9월 4일,</span>
          <strong>아는 만큼</strong>
          <strong>더 크게 뛴다.</strong>
        </h1>
        <p className="skku-hero__lead">성균관대 응원 OT 가기 전, 핵심 응원곡부터 빠르게 들어보세요.</p>
        <div className="skku-hero__meta" aria-label="행사 정보">
          <span><CalendarDays size={14} aria-hidden="true" /> {EVENT.date}</span>
          <span><MapPin size={14} aria-hidden="true" /> {EVENT.campus} · {EVENT.venue}</span>
        </div>
        <div className="skku-hero__actions">
          <button className="skku-button skku-button--primary" type="button" onClick={() => scrollToSection("quick-prep")}>
            10분 예습 시작 <ArrowDown size={15} aria-hidden="true" />
          </button>
          <button className="skku-button skku-button--ghost" type="button" onClick={() => scrollToSection("all-cheers")}>
            전체 응원곡 보기
          </button>
        </div>
        <div className="skku-hero__facts">
          <span>{EVENT.scale}</span>
          <span>{EVENT.expandedSongCount}</span>
          <span>NEW 신곡 예고</span>
        </div>
        <p className="skku-hero__disclaimer">비공식 응원곡 가이드 · 행사 세부 정보는 공식 채널을 확인해주세요.</p>
      </div>
      <div className="skku-hero__scroll" aria-hidden="true"><i /><span>SCROLL TO PLAY</span></div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
}) {
  return (
    <header className="skku-section-heading">
      <p className="skku-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {description && <p className="skku-section-heading__description">{description}</p>}
    </header>
  );
}

function PlayerPanel({ track, playVersion }: { track: PlayerTrack; playVersion: number }) {
  const media = track.media;
  const embedParams = new URLSearchParams({
    autoplay: playVersion > 0 ? "1" : "0",
    playsinline: "1",
    rel: "0",
  });

  if (media) {
    embedParams.set("start", String(media.startSeconds));
    if (media.endSeconds) embedParams.set("end", String(media.endSeconds));
  }

  return (
    <div className="skku-player" id="quick-player">
      <div className="skku-player__screen">
        {media ? (
          <iframe
            key={`${track.id}-${playVersion}`}
            src={`https://www.youtube-nocookie.com/embed/${media.videoId}?${embedParams.toString()}`}
            title={`${track.title} 공식 영상 미리 듣기`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="skku-player__pending">
            <Music2 size={28} aria-hidden="true" />
            <strong>공식 미디어 연결 준비 중</strong>
            <span>정식 데이터가 승인되면 이 자리에 바로 연결됩니다.</span>
          </div>
        )}
      </div>
      <div className="skku-player__info">
        <div>
          <span>NOW SELECTED</span>
          <h3>{track.title}</h3>
          <p>{track.description}</p>
        </div>
        {media && (
          <a href={`${media.sourceUrl}&t=${media.startSeconds}s`} target="_blank" rel="noreferrer">
            YouTube <ExternalLink size={12} aria-hidden="true" />
          </a>
        )}
      </div>
      <p className="skku-player__source"><Check size={12} aria-hidden="true" /> {track.evidenceLabel}</p>
    </div>
  );
}

function TrackRow({
  track,
  index,
  active,
  onPlay,
}: {
  track: EventTrack;
  index: number;
  active: boolean;
  onPlay: (track: EventTrack) => void;
}) {
  return (
    <article className={`skku-track ${active ? "is-active" : ""} ${!track.media ? "is-pending" : ""}`}>
      <button
        className="skku-track__play"
        type="button"
        onClick={() => onPlay(track)}
        disabled={!track.media}
        aria-label={track.media ? `${track.title} 재생` : `${track.title} 미디어 준비 중`}
      >
        {active ? <WaveBars compact /> : <span>{String(index + 1).padStart(2, "0")}</span>}
      </button>
      <div className="skku-track__title">
        <div><h3>{track.title}</h3>{track.yearLabel && <span>{track.yearLabel}</span>}</div>
        <p>{track.tags.join(" · ")}</p>
      </div>
      <p className="skku-track__description">{track.description}</p>
      <div className="skku-track__meta">
        <span>{track.evidenceLabel}</span>
        <strong>{formatDuration(track.media)}</strong>
      </div>
      <button
        className="skku-track__action"
        type="button"
        onClick={() => onPlay(track)}
        disabled={!track.media}
        aria-label={track.media ? `${track.title} 재생하기` : `${track.title} 미디어 준비 중`}
      >
        {track.media ? <Play size={15} fill="currentColor" aria-hidden="true" /> : <span>—</span>}
      </button>
    </article>
  );
}

function QuickPrep({
  activeTrack,
  playVersion,
  onPlay,
}: {
  activeTrack: PlayerTrack;
  playVersion: number;
  onPlay: (track: EventTrack) => void;
}) {
  return (
    <section className="skku-quick" id="quick-prep" aria-labelledby="quick-title">
      <Reveal>
        <SectionHeading
          eyebrow="01 · QUICK PREP"
          title={<><span>OT 가기 전,</span><strong id="quick-title">이것만 듣자.</strong></>}
          description="이번 OT의 공식 세트리스트가 아닌, 최근 공식 공연과 상반기 OT 기록을 바탕으로 고른 7곡입니다."
        />
      </Reveal>
      <div className="skku-quick__layout">
        <div className="skku-track-list">
          <div className="skku-track-list__head"><span>7 TRACKS · START HERE</span><span>PLAYLIST</span></div>
          {QUICK_TRACKS.map((track, index) => (
            <TrackRow key={track.id} track={track} index={index} active={activeTrack.id === track.id} onPlay={onPlay} />
          ))}
        </div>
        <PlayerPanel track={activeTrack} playVersion={playVersion} />
      </div>
    </section>
  );
}

function NewCheer({ onPlay }: { onPlay: (track: EventTrack) => void }) {
  return (
    <section className="skku-new" id="new-cheer" aria-labelledby="new-title">
      <div className="skku-new__glow" aria-hidden="true" />
      <Reveal>
        <SectionHeading eyebrow="02 · 2026 NEW CHEER" title={<><span>새로운 성균의 함성이</span><strong id="new-title">시작된다.</strong></>} />
      </Reveal>
      <div className="skku-new__grid">
        <Reveal className="skku-feature-card">
          <div className="skku-feature-card__visual" aria-hidden="true">
            <span>燦爛</span>
            <WaveBars />
          </div>
          <div className="skku-feature-card__content">
            <p>NEW · 2026</p>
            <h3>{NEW_CHEER.title}</h3>
            <span>성균인의 청춘을 노래하는 2026 응원가.</span>
            <button type="button" onClick={() => onPlay(NEW_CHEER)}>
              <Play size={15} fill="currentColor" aria-hidden="true" /> 응원곡 듣기
            </button>
          </div>
        </Reveal>
        <Reveal className="skku-teaser-card" delay={0.08}>
          <div className="skku-teaser-card__media">
            <iframe
              src="https://www.instagram.com/reel/DcqBsuePrPk/embed/"
              title="킹고응원단 2026 ESKARA 응원 OT 신곡 티저"
              loading="lazy"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <div className="skku-teaser-card__body">
            <p>OFFICIAL INSTAGRAM REEL</p>
            <h3>2026 ESKARA 응원 OT 신곡</h3>
            <span>새로운 응원가는 공식 공개가 확인되는 대로 이 페이지의 재생 목록에 추가합니다.</span>
            <a href={EVENT.teaserUrl} target="_blank" rel="noreferrer">Instagram에서 보기 <ExternalLink size={13} aria-hidden="true" /></a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function AllCheers({ activeTrack, onPlay }: { activeTrack: PlayerTrack; onPlay: (track: EventTrack) => void }) {
  return (
    <section className="skku-all" id="all-cheers" aria-labelledby="all-title">
      <Reveal>
        <SectionHeading
          eyebrow="03 · SKKU CHEERS"
          title={<><span>성균의 응원곡,</span><strong id="all-title">더 들어보기.</strong></>}
          description="대화에서 조사한 곡을 먼저 담았습니다. 미디어와 정식 카탈로그 연결은 검수 후 순차적으로 확장됩니다."
        />
      </Reveal>
      <div className="skku-all__grid">
        {TRACKS.map((track, index) => (
          <Reveal key={track.id} delay={(index % 4) * 0.035}>
            <article className={`skku-library-row ${activeTrack.id === track.id ? "is-active" : ""}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <button className="skku-library-row__title" type="button" onClick={() => onPlay(track)} disabled={!track.media}>
                <strong>{track.title}</strong>
                <small>{track.yearLabel ?? track.evidenceLabel}</small>
              </button>
              <div className="skku-library-row__tags">{track.tags.slice(0, 2).map((tag) => <i key={tag}>{tag}</i>)}</div>
              <button className="skku-library-row__play" type="button" onClick={() => onPlay(track)} disabled={!track.media} aria-label={`${track.title} ${track.media ? "재생" : "미디어 준비 중"}`}>
                {track.media ? <Play size={13} fill="currentColor" aria-hidden="true" /> : <span>준비 중</span>}
              </button>
            </article>
          </Reveal>
        ))}
      </div>
      <p className="skku-all__notice"><CircleAlert size={14} aria-hidden="true" /> 이 목록은 이벤트용 mock data이며, 2026 응원 OT 공식 21곡 목록을 뜻하지 않습니다.</p>
    </section>
  );
}

function AboutOt() {
  return (
    <section className="skku-about" id="about-ot" aria-labelledby="about-title">
      <div className="skku-about__copy">
        <Reveal>
          <SectionHeading eyebrow="04 · ABOUT" title={<strong id="about-title">응원 OT?</strong>} />
          <p className="skku-about__lead">공연을 보는 것보다, 직접 응원가를 배우고 함께 뛰는 행사에 가깝습니다.</p>
          <p className="skku-about__body">응원곡과 동작을 익힌 뒤 모두가 함께 응원을 즐기는 성균관대의 응원 행사입니다. 처음 가도, 혼자 가도 현장에서 하나의 목소리에 합류할 수 있어요.</p>
        </Reveal>
      </div>
      <div className="skku-timeline">
        {TIMELINE.map((item, index) => (
          <Reveal key={item.year} className="skku-timeline__row" delay={index * 0.07}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item.year}</strong>
            <p>{item.title}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function LastOt({ onPlay }: { onPlay: (track: PlayerTrack) => void }) {
  return (
    <section className="skku-last" aria-labelledby="last-title">
      <Reveal>
        <SectionHeading
          eyebrow="05 · LAST OT"
          title={<><span>응원가 말고,</span><strong id="last-title">이런 노래도 함께했다.</strong></>}
          description="지난 상반기 응원 OT에서 함께 즐겼던 곡입니다. 이번 행사의 공식 세트리스트는 아닙니다."
        />
      </Reveal>
      <div className="skku-last__rail">
        {PAST_OT_TRACKS.map((track, index) => (
          <Reveal key={track.id} delay={index * 0.05}>
            <article className="skku-last-card">
              <span>2026 SPRING OT</span>
              <strong>{track.title}</strong>
              <p>{track.note}</p>
              <button type="button" onClick={() => onPlay(pastAsPlayerTrack(track))} disabled={!track.media}>
                {track.media ? <><Play size={13} fill="currentColor" aria-hidden="true" /> 듣기</> : "기록만 보기"}
              </button>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function EskaraClimax() {
  return (
    <section className="skku-eskara" aria-labelledby="eskara-title">
      <div className="skku-eskara__rings" aria-hidden="true"><i /><i /><i /></div>
      <div className="skku-eskara__wave" aria-hidden="true"><WaveBars /></div>
      <Reveal>
        <p className="skku-eyebrow">06 · NEXT</p>
        <h2 id="eskara-title"><span>오늘 배운 함성이</span><strong>초록의 파도가 된다.</strong></h2>
        <div className="skku-eskara__meta">
          <span>2026 ESKARA : 초록의 파도</span>
          <strong>10.01 — 10.02</strong>
          <span>성균관대학교 자연과학캠퍼스</span>
        </div>
        <button type="button" onClick={() => scrollToSection("all-cheers")}>ESKARA 응원곡 미리 듣기 <ArrowRight size={15} aria-hidden="true" /></button>
      </Reveal>
    </section>
  );
}

function OfficialChannels() {
  return (
    <section className="skku-official" aria-labelledby="official-title">
      <Reveal className="skku-official__card">
        <div className="skku-official__icon"><Instagram size={25} aria-hidden="true" /></div>
        <div>
          <p>OFFICIAL INFO</p>
          <h2 id="official-title">행사 세부 정보는 킹고응원단 공식 채널에서.</h2>
          <span>입장 시간, 티켓, 단과대별 안내 등 행사 운영 관련 정보는 공식 공지를 확인해주세요.</span>
        </div>
        <div className="skku-official__actions">
          <a href={EVENT.instagramUrl} target="_blank" rel="noreferrer">Instagram <ExternalLink size={14} aria-hidden="true" /></a>
          <a href={EVENT.linktreeUrl} target="_blank" rel="noreferrer">티켓·공식 링크 <ExternalLink size={14} aria-hidden="true" /></a>
        </div>
      </Reveal>
    </section>
  );
}

function PlayerDock({ track }: { track: PlayerTrack }) {
  return (
    <aside className="skku-dock" aria-label="선택한 응원곡">
      <button type="button" onClick={() => scrollToSection("quick-player")}>
        <span className="skku-dock__icon"><Waves size={16} aria-hidden="true" /></span>
        <span><small>NOW SELECTED</small><strong>{track.title}</strong></span>
        <ArrowRight size={14} aria-hidden="true" />
      </button>
      {track.media && <a href={`${track.media.sourceUrl}&t=${track.media.startSeconds}s`} target="_blank" rel="noreferrer" aria-label={`${track.title} YouTube에서 열기`}><Youtube size={17} aria-hidden="true" /></a>}
    </aside>
  );
}

function EventFooter() {
  return (
    <footer className="skku-footer">
      <a href="/">응원가 아카이브 <ArrowRight size={13} aria-hidden="true" /></a>
      <p>본 페이지는 성균관대학교 또는 킹고응원단의 공식 행사 페이지가 아닌, 응원곡 정보를 제공하는 비공식 가이드입니다.</p>
      <div><span>LAST CHECKED · {EVENT.updatedAt}</span><a href={EVENT.officialUpdateUrl} target="_blank" rel="noreferrer">공식 정보 출처 <ExternalLink size={11} aria-hidden="true" /></a></div>
    </footer>
  );
}

export function SkkuCheerOtPage() {
  const [activeTrack, setActiveTrack] = useState<PlayerTrack>(asPlayerTrack(QUICK_TRACKS[0]));
  const [playVersion, setPlayVersion] = useState(0);
  const [hasPlayed, setHasPlayed] = useState(false);

  function playTrack(track: EventTrack | PlayerTrack) {
    if (!track.media) return;
    setActiveTrack(track);
    setPlayVersion((value) => value + 1);
    setHasPlayed(true);

    if (window.matchMedia("(max-width: 760px)").matches) {
      window.setTimeout(() => scrollToSection("quick-player"), 50);
    }
  }

  return (
    <div className="skku-page">
      <EventHeader />
      <main>
        <Hero />
        <QuickPrep activeTrack={activeTrack} playVersion={playVersion} onPlay={playTrack} />
        <NewCheer onPlay={playTrack} />
        <AllCheers activeTrack={activeTrack} onPlay={playTrack} />
        <AboutOt />
        <LastOt onPlay={playTrack} />
        <EskaraClimax />
        <OfficialChannels />
      </main>
      <EventFooter />
      {hasPlayed && <PlayerDock track={activeTrack} />}
    </div>
  );
}
