import { useState, useEffect, useRef } from "react";
import {
  Search, Play, Music2, Trophy, University, X, ExternalLink,
} from "lucide-react";
import { CHEER_SONGS, ORIGINAL_SONGS, getCheerSong, getOriginalSong } from "../data/catalog";
import type { CheerSong, OriginalSong } from "../data/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(s: number | null) {
  if (s === null) return "—";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function yearBadge(song: CheerSong) {
  if (song.yearStatus === "confirmed") return String(song.year);
  if (song.yearStatus === "earliest-documented") return `${song.timelineYear} 확인`;
  return `${song.timelineYear} (추정)`;
}

function originalYearLabel(original: OriginalSong) {
  return original.yearLabel ?? (original.year === null ? "연도 미상" : String(original.year));
}

function originalMetadata(original: OriginalSong) {
  return [originalYearLabel(original), original.genre, original.country].filter(Boolean).join(" · ");
}

const SOURCE_SCOPE_LABEL = {
  title: "표기",
  origin: "원곡",
  chronology: "연도",
  usage: "용례",
} as const;

function byOriginal(origId: string) {
  return CHEER_SONGS.filter((s) => s.originalSongId === origId).sort((a, b) => a.timelineYear - b.timelineYear);
}

function matchesSearch(song: CheerSong, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko");
  if (!normalizedQuery) return true;

  const original = getOriginalSong(song.originalSongId);
  return [song.title, ...song.aliases, ...song.symbolicLines, song.team, song.region, song.originNote, song.usageContext, original?.title, original?.artist]
    .filter(Boolean)
    .some((value) => value!.toLocaleLowerCase("ko").includes(normalizedQuery));
}

function byTeamGroups() {
  const teams: Record<string, CheerSong[]> = {};
  CHEER_SONGS.forEach((s) => { if (!teams[s.team]) teams[s.team] = []; teams[s.team].push(s); });
  return Object.entries(teams).sort((a, b) => a[0].localeCompare(b[0], "ko"));
}

function byDecade() {
  const decades: Record<number, CheerSong[]> = {};
  CHEER_SONGS.forEach((s) => {
    const d = Math.floor(s.timelineYear / 10) * 10;
    if (!decades[d]) decades[d] = [];
    decades[d].push(s);
  });
  return Object.entries(decades)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([d, songs]) => ({ decade: Number(d), songs: songs.sort((a, b) => a.timelineYear - b.timelineYear) }));
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((character) => character + character).join("")
    : normalized;

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function gradientPalette(primary: string, secondary: string) {
  const brightness = luminance(primary) * 0.65 + luminance(secondary) * 0.35;
  const bright = brightness > 145;
  const watermarkOpacity = bright ? 0.2 : brightness > 50 ? 0.24 : brightness > 32 ? 0.21 : 0.18;

  return {
    text: bright ? "rgba(18,17,15,0.88)" : "rgba(255,255,255,0.96)",
    subtle: bright ? "rgba(18,17,15,0.58)" : "rgba(255,255,255,0.66)",
    watermark: bright
      ? `rgba(18,17,15,${watermarkOpacity})`
      : `rgba(255,255,255,${watermarkOpacity})`,
  };
}

const ORIGINAL_ART_PALETTES = [
  { base: "#17233D", accent: "#E9B949", ink: "#F7F2E8" },
  { base: "#DCE6EA", accent: "#597B8B", ink: "#17242B" },
  { base: "#29204E", accent: "#E8505B", ink: "#FFF4D6" },
  { base: "#201F1D", accent: "#C41E3A", ink: "#F5F2ED" },
  { base: "#B44A32", accent: "#F1C27D", ink: "#FFF6E8" },
  { base: "#204B57", accent: "#E76F51", ink: "#F5E9D6" },
] as const;

// ── YouTube Player ────────────────────────────────────────────────────────────

function YouTubePlayer({ song }: { song: CheerSong }) {
  const media = song.youtubeMedia;
  const isPlayable = media && media.availability !== "unavailable";

  if (!isPlayable) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-border bg-secondary px-6 text-center">
        <div>
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-background text-muted-foreground">
            <Play size={14} className="ml-0.5" />
          </span>
          <p className="mt-3 text-[12px] font-semibold text-foreground">YouTube 영상 준비 중</p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">검증된 영상이 연결되면 카드 선택과 함께 재생됩니다.</p>
        </div>
      </div>
    );
  }

  const params = new URLSearchParams({
    autoplay: "1",
    playsinline: "1",
    rel: "0",
  });
  if (media.startSeconds) params.set("start", String(media.startSeconds));

  return (
    <section aria-label="YouTube 영상">
      <div className="aspect-video overflow-hidden rounded-xl bg-black shadow-[0_8px_24px_rgba(32,31,29,0.14)]">
        <iframe
          key={media.id}
          className="h-full w-full border-0"
          src={`https://www.youtube-nocookie.com/embed/${media.videoId}?${params.toString()}`}
          title={`${song.title} — ${media.title}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <div className="mt-2.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-foreground">{media.title}</p>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{media.channelName}</p>
        </div>
        <a
          href={media.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-primary hover:underline"
        >
          YouTube <ExternalLink size={9} />
        </a>
      </div>
    </section>
  );
}

// ── Cheer Card ────────────────────────────────────────────────────────────────

function CheerCard({ song, onClick, isActive = false }: { song: CheerSong; onClick: () => void; isActive?: boolean }) {
  const palette = gradientPalette(song.teamColor, song.teamColorAlt);
  const previewLine1 = song.symbolicLine1;
  const previewLine2 = song.symbolicLine2;
  const longestLyric = Math.max(previewLine1.length, previewLine2.length);
  const lyricTextSize = longestLyric > 12
    ? "text-[16px]"
    : longestLyric > 10
      ? "text-[18px]"
      : longestLyric > 8
        ? "text-[21px]"
        : "text-[27px]";

  return (
    <button
      onClick={onClick}
      aria-pressed={isActive}
      className={`group w-full overflow-hidden rounded-xl border bg-card text-left transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-transparent hover:shadow-[0_10px_24px_rgba(32,31,29,0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${isActive ? "border-foreground/25 shadow-[0_0_0_3px_rgba(32,31,29,0.10)]" : "border-border shadow-[0_2px_8px_rgba(32,31,29,0.05)]"}`}
    >
      <div
        className="relative flex h-36 flex-col justify-end overflow-hidden p-4"
        style={{ background: `linear-gradient(135deg, ${song.teamColor} 0%, ${song.teamColorAlt} 100%)` }}
      >
        <div className="pointer-events-none absolute inset-x-3 top-[49px] max-h-[64px] select-none overflow-hidden" aria-hidden="true">
          <p
            className={`${lyricTextSize} font-black leading-[0.96] tracking-[-0.065em] blur-[0.15px]`}
            style={{ color: palette.watermark, textShadow: "0 1px 10px rgba(0,0,0,0.06)" }}
          >
            <span className="block whitespace-nowrap">{previewLine1}</span>
            <span className="block whitespace-nowrap">{previewLine2}</span>
          </p>
        </div>

        <div className="absolute inset-x-3.5 top-3 flex items-start justify-between gap-3">
          <span
            className="inline-flex items-center gap-1 rounded-sm px-2 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.12em]"
            style={{ backgroundColor: "rgba(255,255,255,0.18)", color: palette.text }}
          >
            {song.teamType === "baseball" ? <Trophy size={8} /> : <University size={8} />}
            {song.teamType === "baseball" ? "야구" : "대학"}
          </span>
          <span
            className="rounded-full px-2 py-1 font-mono text-[10px] font-semibold tabular-nums"
            style={{ backgroundColor: "rgba(255,255,255,0.16)", color: palette.text }}
          >
            {yearBadge(song)}
          </span>
        </div>

        <div className="relative flex items-end justify-between gap-3">
          <span className="font-mono text-[10px] font-semibold tracking-[0.12em]" style={{ color: palette.subtle }}>{song.abbr}</span>
          <span className="h-px flex-1" style={{ backgroundColor: palette.subtle }} />
        </div>
      </div>

      <div className="px-4 py-3.5">
        <p className="text-[14px] font-bold leading-snug tracking-[-0.02em] text-foreground">{song.title}</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className="truncate text-[11px] text-muted-foreground">{song.team}</p>
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            style={{ backgroundColor: song.teamColor }}
            aria-hidden="true"
          >
            <Play size={9} className="ml-0.5 text-white" />
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Original source marker ───────────────────────────────────────────────────

function OriginalSourceMarker({ original, index }: { original: OriginalSong; index: number }) {
  const palette = ORIGINAL_ART_PALETTES[index % ORIGINAL_ART_PALETTES.length];
  const sourceLabel = original.kind === "commissioned" ? "자체 제작" : "원곡";

  return (
    <article aria-label={`${original.title} ${sourceLabel} 정보`} className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-4 lg:block">
      <div className="relative h-[122px] w-[174px] max-w-full" aria-hidden="true">
        <div
          className="absolute left-[68px] top-1/2 h-[104px] w-[104px] -translate-y-1/2 rounded-full border border-black/10 shadow-[0_4px_12px_rgba(32,31,29,0.12)]"
          style={{
            background: "repeating-radial-gradient(circle at center, #f8f8f5 0 2px, #d9d9d5 3px 5px, #f4f4f0 6px 9px)",
          }}
        >
          <span className="absolute inset-[39%] rounded-full border border-black/15 bg-white shadow-inner" />
          <span className="absolute inset-[47%] rounded-full bg-foreground/70" />
        </div>

        <div
          className="absolute inset-y-0 left-0 z-10 w-[122px] overflow-hidden rounded-[4px] shadow-[0_8px_20px_rgba(32,31,29,0.18)]"
          style={{ backgroundColor: palette.base, color: palette.ink }}
        >
          <span className="absolute -right-4 -top-4 h-20 w-20 rounded-full border-[16px] opacity-60" style={{ borderColor: palette.accent }} />
          <span className="absolute -bottom-8 -left-7 h-24 w-24 rotate-12 border-[18px] opacity-25" style={{ borderColor: palette.ink }} />
          <span className="absolute left-3 top-3 font-mono text-[7px] uppercase tracking-[0.17em] opacity-70">{original.kind === "commissioned" ? "Commissioned" : "Original source"}</span>
          <span className="absolute bottom-10 left-3 font-mono text-[8px] tabular-nums opacity-65">SRC {String(index + 1).padStart(2, "0")}</span>
          <span className="absolute inset-x-3 bottom-3 line-clamp-2 text-[10px] font-bold leading-[1.15] tracking-[-0.02em]">{original.title}</span>
        </div>
      </div>

      <div className="min-w-0 lg:mt-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex h-5 items-center gap-1 rounded-full bg-primary px-2 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-primary-foreground">
            <Music2 size={8} /> {sourceLabel}
          </span>
        </div>
        <h3 className="text-[18px] font-bold leading-tight tracking-[-0.025em] text-foreground">{original.title}</h3>
        <p className="mt-1 text-[12px] font-medium text-muted-foreground">{original.artist}</p>
        <p className="mt-2 font-mono text-[9px] leading-4 text-muted-foreground/75">{originalMetadata(original)}</p>
      </div>
    </article>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function DetailPanel({ song, onClose }: { song: CheerSong; onClose: () => void }) {
  const orig = getOriginalSong(song.originalSongId)!;
  const sourceCheer = song.sourceCheerSongId ? getCheerSong(song.sourceCheerSongId) : undefined;
  const secondaryOriginals = (song.secondaryOriginalSongIds ?? [])
    .map((id) => getOriginalSong(id))
    .filter((original): original is OriginalSong => Boolean(original));
  const siblings = byOriginal(song.originalSongId);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = `detail-${song.id}-title`;
  const descriptionId = `detail-${song.id}-description`;
  const palette = gradientPalette(song.teamColor, song.teamColorAlt);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <aside
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="flex min-h-[calc(100dvh-150px)] w-full min-w-0 flex-col overflow-hidden border-t border-border bg-card lg:sticky lg:top-[95px] lg:h-[calc(100dvh-95px)] lg:min-h-0 lg:border-l lg:border-t-0"
    >
      <div
        className="relative shrink-0 overflow-hidden px-5 pb-6 pt-12 sm:px-6"
        style={{ background: `linear-gradient(135deg, ${song.teamColor} 0%, ${song.teamColorAlt} 100%)` }}
      >
        <span
          className="pointer-events-none absolute -right-1 top-0 select-none text-[78px] font-black leading-none tracking-[-0.08em]"
          style={{ color: palette.watermark }}
          aria-hidden="true"
        >
          {song.abbr}
        </span>
        <button
          ref={closeButtonRef}
          onClick={onClose}
          aria-label="상세 패널 닫기"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          style={{ backgroundColor: "rgba(255,255,255,0.16)", color: palette.text }}
        >
          <X size={14} />
        </button>

        <div className="relative pr-12">
          <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.13em]" style={{ color: palette.subtle }}>
            {song.teamType === "baseball" ? <Trophy size={8} /> : <University size={8} />}
            {song.teamType === "baseball" ? "야구" : "대학"} · {song.region} · {yearBadge(song)} · {song.status === "verified" ? "검증됨" : "검증 전"}
          </span>
          <h2 id={titleId} className="mt-2 text-[22px] font-bold leading-tight tracking-[-0.025em]" style={{ color: palette.text }}>
            {song.title}
          </h2>
          <p className="mt-1 text-[13px]" style={{ color: palette.subtle }}>{song.team}</p>
        </div>

        {(song.lyricLine1 || song.lyricLine2) && (
          <div className="relative mt-4 border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.22)" }}>
            <p className="text-[12px] font-semibold leading-relaxed" style={{ color: palette.subtle }}>
              “{[song.lyricLine1, song.lyricLine2].filter(Boolean).join(" / ")}”
            </p>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
        <YouTubePlayer song={song} />

        <section aria-labelledby={`${song.id}-lyrics-title`}>
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <p id={`${song.id}-lyrics-title`} className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">가사 전체</p>
            <span className="font-mono text-[9px] tabular-nums text-muted-foreground/70">{song.lyrics.filter((line) => line.trim()).length}줄</span>
          </div>
          <div className="rounded-xl border border-border bg-background px-5 py-5 shadow-[0_2px_8px_rgba(32,31,29,0.03)]">
            {song.lyrics.some((line) => line.trim()) ? (
              <div className="text-[14px] font-medium leading-[1.9] tracking-[-0.01em] text-foreground">
                {song.lyrics.map((line, index) => line.trim() ? (
                  <p key={`${index}-${line}`}>{line}</p>
                ) : (
                  <div key={`space-${index}`} className="h-3" aria-hidden="true" />
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">검증된 가사를 준비하고 있습니다.</p>
            )}
          </div>
        </section>

        <div className="grid grid-cols-3 gap-2">
          {[["기준 연도", yearBadge(song)], ["길이", fmt(song.duration)], ["지역", song.region]].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-secondary px-2 py-3 text-center">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{k}</p>
              <p className="mt-1 text-[13px] font-semibold text-foreground">{v}</p>
            </div>
          ))}
        </div>

        <p id={descriptionId} className="text-[13px] leading-6 text-muted-foreground">
          {song.description}
        </p>

        {song.aliases.length > 0 && (
          <section aria-label="별칭">
            <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">별칭</p>
            <div className="flex flex-wrap gap-1.5">
              {song.aliases.map((alias) => (
                <span key={alias} className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                  {alias}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-border bg-secondary px-4 py-3.5" aria-label="도입 시점">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">도입 시점</p>
            <span className="rounded-full bg-background px-2.5 py-1 font-mono text-[9px] font-semibold text-foreground">{song.yearLabel}</span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{song.chronologyNote}</p>
        </section>

        <section aria-label="사용 맥락">
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">사용 맥락</p>
          <p className="text-[12px] leading-relaxed text-muted-foreground">{song.usageContext}</p>
        </section>

        {song.status === "draft" && (
          <div className="rounded-lg border border-border bg-secondary px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
            아직 검증되지 않은 테스트 데이터입니다. 공개 전 출처와 가사를 확인해 주세요.
          </div>
        )}

        {song.sources.length > 0 && (
          <div>
            <p className="text-[9px] font-mono tracking-widest uppercase text-muted-foreground mb-2">출처</p>
            <div className="space-y-1.5">
              {song.sources.map((source) => (
                <a key={`${source.scope ?? "source"}-${source.url}`} href={source.url} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-xs text-primary hover:underline">
                  {source.scope && (
                    <span className="mt-px shrink-0 rounded bg-secondary px-1.5 py-0.5 font-mono text-[8px] font-semibold text-muted-foreground no-underline">
                      {SOURCE_SCOPE_LABEL[source.scope]}
                    </span>
                  )}
                  <span>{source.label}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Original lineage */}
        <div>
          <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">원곡·계보</p>
          {sourceCheer && (
            <div className="mb-2 rounded-xl border border-border bg-background px-4 py-3">
              <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">직접 차용 응원가</p>
              <p className="mt-1 text-[12px] font-semibold text-foreground">{sourceCheer.title}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{sourceCheer.team} · {yearBadge(sourceCheer)}</p>
            </div>
          )}
          <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary p-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${song.teamColor}22`, color: song.teamColor }}
            >
              <Music2 size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
                {song.originType === "commissioned-original" ? "구단 의뢰 제작곡" : "기반 원곡"}
              </p>
              <p className="font-semibold text-foreground text-sm leading-tight">{orig.title}</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">{orig.artist}</p>
              <p className="text-[10px] font-mono text-muted-foreground/70 mt-1">{originalMetadata(orig)}</p>
              {orig.sources[0] && (
                <a href={orig.sources[0].url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[9px] font-medium text-primary hover:underline">
                  원곡 출처 <ExternalLink size={8} />
                </a>
              )}
            </div>
          </div>

          {secondaryOriginals.map((secondary) => (
            <div key={secondary.id} className="mt-2 rounded-lg border border-dashed border-border px-4 py-3">
              <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">보조 모티브</p>
              <p className="mt-1 text-[11px] font-semibold text-foreground">{secondary.title} · {secondary.artist}</p>
            </div>
          ))}

          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{song.originNote}</p>
        </div>

        {/* Siblings */}
        {siblings.length > 1 && <div>
          <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">같은 원곡 응원가 ({siblings.length})</p>
          <div className="relative pl-5 space-y-1.5">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
            {siblings.map((s) => {
              const isCurrent = s.id === song.id;
              return (
                <div key={s.id} className="relative flex items-start gap-3">
                  <div
                    className="absolute -left-5 top-2.5 w-2.5 h-2.5 rounded-full border-2 flex-shrink-0"
                    style={{ borderColor: s.teamColor, backgroundColor: isCurrent ? s.teamColor : "transparent" }}
                  />
                  <div className={`flex-1 rounded-lg border px-3 py-2 transition-colors ${isCurrent ? "border-border bg-secondary" : "border-transparent hover:bg-secondary"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs leading-snug ${isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{s.title}</p>
                      <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">{yearBadge(s)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{s.team}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>}
      </div>
    </aside>
  );
}

// ── View: 원곡별 ───────────────────────────────────────────────────────────────

function ByOriginView({ query, typeFilter, selectedId, onSelect }: { query: string; typeFilter: "all" | "baseball" | "university"; selectedId?: string; onSelect: (s: CheerSong) => void }) {
  const groups = ORIGINAL_SONGS.map((orig) => ({
    orig,
    songs: byOriginal(orig.id).filter((s) => {
      const mt = typeFilter === "all" || s.teamType === typeFilter;
      return mt && matchesSearch(s, query);
    }),
  })).filter((g) => g.songs.length > 0).map((group, sourceIndex) => ({ ...group, sourceIndex }));

  if (!groups.length) return <Empty />;

  return (
    <div className="divide-y divide-border">
      {groups.map(({ orig, songs, sourceIndex }) => {
        return (
          <section key={orig.id} className="grid gap-7 py-10 first:pt-0 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-6">
            <OriginalSourceMarker original={orig} index={sourceIndex} />

            <div className="min-w-0 lg:border-l lg:border-border lg:pl-6">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-foreground">파생 응원가</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[8px] text-muted-foreground">{songs.length}</span>
                </div>
                <span className="font-mono text-[8px] tracking-[0.08em] text-muted-foreground">오래된 순 → 최신</span>
              </div>

              <div className="timeline-scroll min-w-0 overflow-x-auto pb-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" tabIndex={0} aria-label={`${orig.title} 파생 응원가 타임라인`}>
                <div className="flex min-w-max items-start">
                  {songs.map((song, songIndex) => (
                    <div key={song.id} className="w-[220px] shrink-0 pr-3 sm:w-[235px] lg:w-[245px]">
                      <div className="relative mb-2.5 flex h-7 items-center">
                        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
                        <span
                          className="relative z-10 h-2.5 w-2.5 rounded-full border-2 border-white"
                          style={{ backgroundColor: song.teamColor, boxShadow: "0 0 0 1px rgba(32,31,29,0.14)" }}
                        />
                        <span className="relative z-10 ml-2 rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums text-foreground shadow-[0_1px_2px_rgba(32,31,29,0.04)]">{yearBadge(song)}</span>
                        <span className="relative z-10 ml-auto bg-background pl-2 font-mono text-[8px] text-muted-foreground">{String(songIndex + 1).padStart(2, "0")}</span>
                      </div>
                      <CheerCard song={song} isActive={selectedId === song.id} onClick={() => onSelect(song)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ── View: 구단별 ───────────────────────────────────────────────────────────────

function ByTeamView({ query, typeFilter, selectedId, onSelect }: { query: string; typeFilter: "all" | "baseball" | "university"; selectedId?: string; onSelect: (s: CheerSong) => void }) {
  const teams = byTeamGroups()
    .map(([team, songs]) => {
      const filtered = songs.filter((s) => {
        const mt = typeFilter === "all" || s.teamType === typeFilter;
        return mt && matchesSearch(s, query);
      });
      return { team, songs: filtered, meta: songs[0] };
    })
    .filter((g) => g.songs.length > 0);

  if (!teams.length) return <Empty />;

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {teams.map(({ team, songs, meta }) => {
        const palette = gradientPalette(meta.teamColor, meta.teamColorAlt);
        return (
          <article key={team} className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_2px_8px_rgba(32,31,29,0.04)]">
            <div className="relative overflow-hidden px-4 py-4" style={{ background: `linear-gradient(135deg, ${meta.teamColor} 0%, ${meta.teamColorAlt} 100%)` }}>
              <span className="pointer-events-none absolute right-2 top-0 select-none text-[56px] font-black leading-none tracking-[-0.07em]" style={{ color: palette.watermark }} aria-hidden="true">
                {meta.abbr}
              </span>
              <div className="relative">
                <div className="mb-1 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: palette.subtle }}>
                  {meta.teamType === "baseball" ? <Trophy size={10} /> : <University size={10} />}
                  <span>{meta.teamType === "baseball" ? "야구" : "대학"} · {meta.region}</span>
                </div>
                <h3 className="text-[17px] font-bold leading-tight tracking-[-0.02em]" style={{ color: palette.text }}>{team}</h3>
                <p className="mt-1 font-mono text-[9px]" style={{ color: palette.subtle }}>{songs.length}곡</p>
              </div>
            </div>
            <div className="divide-y divide-border">
              {songs.map((s) => {
                const orig = getOriginalSong(s.originalSongId)!;
                return (
                  <button
                    key={s.id}
                    onClick={() => onSelect(s)}
                    aria-pressed={selectedId === s.id}
                    className={`group w-full px-4 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${selectedId === s.id ? "bg-secondary" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold leading-snug text-foreground">{s.title}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <Music2 size={9} className="shrink-0 text-muted-foreground/50" />
                          <p className="truncate text-[10px] text-muted-foreground">{orig.title} — {orig.artist}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
                        <span className="font-mono text-[10px] text-muted-foreground">{yearBadge(s)}</span>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" style={{ backgroundColor: meta.teamColor }} aria-hidden="true">
                          <Play size={8} className="ml-px text-white" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}

// ── View: 연도별 ───────────────────────────────────────────────────────────────

function ByYearView({ query, typeFilter, selectedId, onSelect }: { query: string; typeFilter: "all" | "baseball" | "university"; selectedId?: string; onSelect: (s: CheerSong) => void }) {
  const decades = byDecade().map((d) => ({
    ...d,
    songs: d.songs.filter((s) => {
      const mt = typeFilter === "all" || s.teamType === typeFilter;
      return mt && matchesSearch(s, query);
    }),
  })).filter((d) => d.songs.length > 0);

  if (!decades.length) return <Empty />;

  const byYearMap = (songs: CheerSong[]) => {
    const m: Record<number, CheerSong[]> = {};
    songs.forEach((s) => { if (!m[s.timelineYear]) m[s.timelineYear] = []; m[s.timelineYear].push(s); });
    return Object.entries(m).sort((a, b) => Number(a[0]) - Number(b[0]));
  };

  return (
    <div className="space-y-12">
      {decades.map(({ decade, songs }) => (
        <section key={decade}>
          <div className="mb-6 flex items-center gap-4">
            <h3 className="text-[30px] font-black leading-none tracking-[-0.035em] text-foreground sm:text-[34px]">{decade}년대</h3>
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono text-[10px] text-muted-foreground">{songs.length}곡</span>
          </div>
          <div className="space-y-6">
            {byYearMap(songs).map(([year, ys]) => (
              <div key={year} className="grid gap-3 sm:grid-cols-[40px_1fr] sm:gap-5">
                <div className="border-b border-border pb-2 sm:border-0 sm:pb-0 sm:pt-4">
                  <span className="font-mono text-[11px] text-muted-foreground">{year}</span>
                </div>
                <div className={`grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 ${selectedId ? "lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" : "lg:grid-cols-4 xl:grid-cols-5"}`}>
                  {ys.map((s) => <CheerCard key={s.id} song={s} isActive={selectedId === s.id} onClick={() => onSelect(s)} />)}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function Empty() {
  const catalogIsEmpty = CHEER_SONGS.length === 0;

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted-foreground">
      <Music2 size={36} className="opacity-20" />
      <p className="text-sm font-semibold text-foreground">
        {catalogIsEmpty ? "검증된 응원가를 준비하고 있습니다" : "검색 결과가 없습니다"}
      </p>
      {catalogIsEmpty && (
        <p className="max-w-sm text-[11px] leading-relaxed">
          자료조사와 검토가 끝난 데이터부터 순서대로 공개됩니다.
        </p>
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

type ViewMode = "origin" | "team" | "year";
type TypeFilter = "all" | "baseball" | "university";

export default function App() {
  const [view, setView] = useState<ViewMode>("origin");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CheerSong | null>(null);

  const total = CHEER_SONGS.filter((s) => {
    const mt = typeFilter === "all" || s.teamType === typeFilter;
    return mt && matchesSearch(s, query);
  }).length;

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip bg-background font-sans text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 py-3 sm:h-14 sm:flex-nowrap sm:gap-x-5 sm:py-0">
            <div className="order-1 flex min-w-0 items-center gap-2.5 sm:shrink-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Music2 size={14} />
              </div>
              <span className="truncate text-[14px] font-bold tracking-[-0.025em]">응원가 아카이브</span>
            </div>

            <div className="relative order-3 w-full min-w-0 sm:order-2 sm:max-w-sm sm:flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="응원가 검색"
                placeholder="곡명, 팀명, 원곡 검색…"
                className="h-9 w-full rounded-lg border border-border bg-secondary pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 sm:h-8"
              />
            </div>

            <div className="order-4 grid w-full grid-cols-3 gap-1 sm:order-3 sm:ml-auto sm:flex sm:w-auto sm:shrink-0">
              {([["all", "전체"], ["baseball", "야구"], ["university", "대학"]] as [TypeFilter, string][]).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setTypeFilter(v)}
                  className={`flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-[11px] transition-colors ${typeFilter === v ? "bg-foreground font-medium text-background" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  {v === "baseball" && <Trophy size={10} />}
                  {v === "university" && <University size={10} />}
                  {l}
                </button>
              ))}
            </div>

            <span className="order-2 ml-auto shrink-0 font-mono text-[10px] text-muted-foreground sm:order-4 sm:ml-0">{total}곡</span>
          </div>

          <nav aria-label="보기 방식" className="-mb-px grid grid-cols-3 sm:flex">
            {([["origin", "원곡별"], ["team", "구단별"], ["year", "연도별"]] as [ViewMode, string][]).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`border-b-2 px-4 py-2.5 text-[11px] font-medium transition-colors sm:min-w-[76px] ${view === v ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {l}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div
        className={`grid w-full items-start transition-[grid-template-columns] duration-300 ease-out ${selected ? "lg:grid-cols-[minmax(0,1fr)_420px]" : "lg:grid-cols-[minmax(0,1fr)_0px]"}`}
      >
        <div className={`min-w-0 ${selected ? "hidden lg:block" : "block"}`}>
          <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
            {view === "origin" && <ByOriginView query={query} typeFilter={typeFilter} selectedId={selected?.id} onSelect={setSelected} />}
            {view === "team"   && <ByTeamView   query={query} typeFilter={typeFilter} selectedId={selected?.id} onSelect={setSelected} />}
            {view === "year"   && <ByYearView   query={query} typeFilter={typeFilter} selectedId={selected?.id} onSelect={setSelected} />}
          </main>

          <footer className="mt-4 border-t border-border px-4 py-5 sm:px-6">
            <div className="mx-auto flex max-w-[1280px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-[10px] text-muted-foreground">응원가 아카이브 — 대한민국 응원가 데이터베이스</p>
              <p className="font-mono text-[10px] text-muted-foreground">
                야구 {CHEER_SONGS.filter((s) => s.teamType === "baseball").length}곡 · 대학 {CHEER_SONGS.filter((s) => s.teamType === "university").length}곡 · 원곡 {ORIGINAL_SONGS.length}개
              </p>
            </div>
          </footer>
        </div>

        {selected && <DetailPanel song={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}
