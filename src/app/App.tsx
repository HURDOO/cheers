import { useState, useEffect, useRef } from "react";
import {
  Search, Play, Pause, Music2, Trophy, University,
  ChevronDown, ChevronUp, X, Volume2, SkipBack, SkipForward,
} from "lucide-react";
import { CHEER_SONGS, ORIGINAL_SONGS, getOriginalSong } from "../data/catalog";
import type { CheerSong } from "../data/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function byOriginal(origId: string) {
  return CHEER_SONGS.filter((s) => s.originalSongId === origId).sort((a, b) => a.year - b.year);
}

function matchesSearch(song: CheerSong, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko");
  if (!normalizedQuery) return true;

  const original = getOriginalSong(song.originalSongId);
  return [song.title, song.team, song.region, original?.title, original?.artist]
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
    const d = Math.floor(s.year / 10) * 10;
    if (!decades[d]) decades[d] = [];
    decades[d].push(s);
  });
  return Object.entries(decades)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([d, songs]) => ({ decade: Number(d), songs: songs.sort((a, b) => a.year - b.year) }));
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// ── Audio Player ──────────────────────────────────────────────────────────────

function AudioPlayer({ song }: { song: CheerSong }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(song.duration);
  const hasAudio = Boolean(song.audio?.url);
  const duration = mediaDuration || song.duration;
  const progress = duration > 0 ? (elapsed / duration) * 100 : 0;

  useEffect(() => {
    setIsPlaying(false);
    setElapsed(0);
    setMediaDuration(song.duration);
  }, [song.id, song.duration]);

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      void audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }

  function seekTo(percent: number) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = (Math.max(0, Math.min(100, percent)) / 100) * duration;
  }

  function skip(seconds: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
  }

  return (
    <div className="bg-secondary rounded-xl p-4 space-y-3">
      {hasAudio && (
        <audio
          ref={audioRef}
          src={song.audio!.url}
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onTimeUpdate={(event) => setElapsed(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => {
            const nextDuration = event.currentTarget.duration;
            if (Number.isFinite(nextDuration)) setMediaDuration(nextDuration);
          }}
        />
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={togglePlayback}
            disabled={!hasAudio}
            aria-label={hasAudio ? (isPlaying ? "일시 정지" : "재생") : "오디오 미등록"}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-transform enabled:hover:scale-105 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: song.teamColor }}
          >
            {isPlaying ? <Pause size={14} className="text-white" /> : <Play size={14} className="text-white ml-0.5" />}
          </button>
          <div className="flex gap-1">
            <button disabled={!hasAudio} onClick={() => skip(-10)} aria-label="10초 뒤로" className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground enabled:hover:text-foreground disabled:opacity-30 transition-colors"><SkipBack size={12} /></button>
            <button disabled={!hasAudio} onClick={() => skip(10)} aria-label="10초 앞으로" className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground enabled:hover:text-foreground disabled:opacity-30 transition-colors"><SkipForward size={12} /></button>
          </div>
        </div>
        {hasAudio ? (
          <label className="flex items-center gap-1.5 text-muted-foreground" aria-label="볼륨">
            <Volume2 size={12} />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              defaultValue="0.75"
              className="w-14 accent-foreground"
              onChange={(event) => {
                if (audioRef.current) audioRef.current.volume = Number(event.currentTarget.value);
              }}
            />
          </label>
        ) : (
          <span className="text-[10px] font-mono text-muted-foreground">오디오 미등록</span>
        )}
      </div>
      <div
        className={`h-1 rounded-full bg-muted overflow-hidden ${hasAudio ? "cursor-pointer" : "cursor-not-allowed"}`}
        onClick={(event) => {
          if (!hasAudio) return;
          const rect = event.currentTarget.getBoundingClientRect();
          seekTo(((event.clientX - rect.left) / rect.width) * 100);
        }}
      >
        <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: song.teamColor }} />
      </div>
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground"><span>{fmt(Math.round(elapsed))}</span><span>{fmt(Math.round(duration))}</span></div>
    </div>
  );
}

// ── Cheer Card (poster style) ─────────────────────────────────────────────────

function CheerCard({ song, onClick }: { song: CheerSong; onClick: () => void }) {
  const bright = luminance(song.teamColor) > 140;
  const textOnColor = bright ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.95)";
  const subOnColor = bright ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.55)";

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-xl overflow-hidden border border-border bg-card transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:border-transparent"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
    >
      {/* Color header */}
      <div
        className="relative h-28 overflow-hidden flex flex-col justify-end p-3.5"
        style={{ background: `linear-gradient(135deg, ${song.teamColor} 0%, ${song.teamColorAlt} 100%)` }}
      >
        {/* Large abbr watermark */}
        <span
          className="absolute right-2 top-1 text-[52px] font-black leading-none select-none pointer-events-none tracking-tighter"
          style={{ color: "rgba(255,255,255,0.12)", fontFamily: "'Noto Sans KR', sans-serif" }}
        >
          {song.abbr}
        </span>

        {/* Type badge */}
        <div className="absolute top-3 left-3.5">
          <span
            className="inline-flex items-center gap-1 text-[9px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded-sm"
            style={{ backgroundColor: "rgba(255,255,255,0.18)", color: textOnColor }}
          >
            {song.teamType === "baseball" ? <Trophy size={8} /> : <University size={8} />}
            {song.teamType === "baseball" ? "야구" : "대학"}
          </span>
        </div>

        {/* Year */}
        <div className="absolute top-3 right-3.5">
          <span className="text-[10px] font-mono" style={{ color: subOnColor }}>{song.year}</span>
        </div>

        {/* Lyrics */}
        <div>
          <p className="text-[11px] italic leading-snug" style={{ color: subOnColor, fontFamily: "'Noto Serif KR', serif" }}>
            {song.lyricLine1}
          </p>
          <p className="text-[13px] font-semibold italic leading-snug mt-0.5" style={{ color: textOnColor, fontFamily: "'Noto Serif KR', serif" }}>
            {song.lyricLine2}
          </p>
        </div>
      </div>

      {/* Info footer */}
      <div className="px-3.5 py-3">
        <p className="text-[13px] font-semibold text-foreground leading-snug" style={{ fontFamily: "'Noto Serif KR', serif" }}>
          {song.title}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[11px] text-muted-foreground truncate">{song.team}</p>
          <div
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: song.teamColor }}
          >
            <Play size={9} className="text-white ml-0.5" />
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function DetailDrawer({ song, onClose }: { song: CheerSong; onClose: () => void }) {
  const orig = getOriginalSong(song.originalSongId)!;
  const siblings = byOriginal(song.originalSongId);

  const bright = luminance(song.teamColor) > 140;
  const textOnColor = bright ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.95)";
  const subOnColor = bright ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.6)";

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[400px] bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden">
      {/* Hero header */}
      <div
        className="relative px-6 pt-12 pb-6 flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${song.teamColor} 0%, ${song.teamColorAlt} 100%)` }}
      >
        <span
          className="absolute right-4 top-2 text-[80px] font-black leading-none select-none pointer-events-none tracking-tighter"
          style={{ color: "rgba(255,255,255,0.1)", fontFamily: "'Noto Sans KR', sans-serif" }}
        >
          {song.abbr}
        </span>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: "rgba(255,255,255,0.15)", color: textOnColor }}
        >
          <X size={13} />
        </button>
        <div className="mb-1">
          <span className="text-[9px] font-mono tracking-widest uppercase inline-flex items-center gap-1" style={{ color: subOnColor }}>
            {song.teamType === "baseball" ? <Trophy size={8} /> : <University size={8} />}
            {song.teamType === "baseball" ? "야구" : "대학"} · {song.region} · {song.year} · {song.status === "verified" ? "검증됨" : "검증 전"}
          </span>
        </div>
        <h2 className="text-xl font-bold leading-tight mb-1" style={{ color: textOnColor, fontFamily: "'Noto Serif KR', serif" }}>
          {song.title}
        </h2>
        <p className="text-sm" style={{ color: subOnColor }}>{song.team}</p>
        <div className="mt-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.2)" }}>
          <p className="text-xs italic leading-relaxed" style={{ color: subOnColor, fontFamily: "'Noto Serif KR', serif" }}>
            "{song.lyricLine1} / {song.lyricLine2}"
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Player */}
        <AudioPlayer song={song} />

        {/* Meta */}
        <div className="grid grid-cols-3 gap-2">
          {[["발표", String(song.year)], ["길이", fmt(song.duration)], ["지역", song.region]].map(([k, v]) => (
            <div key={k} className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-[9px] font-mono tracking-widest uppercase text-muted-foreground">{k}</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{v}</p>
            </div>
          ))}
        </div>

        {/* Description */}
        <p className="text-[13px] text-muted-foreground leading-relaxed" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
          {song.description}
        </p>

        {song.status === "draft" && (
          <div className="rounded-lg border border-border bg-secondary px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
            Figma 시안에서 옮긴 검증 전 예시 데이터입니다. 공개 전 출처를 확인해 주세요.
          </div>
        )}

        {song.sources.length > 0 && (
          <div>
            <p className="text-[9px] font-mono tracking-widest uppercase text-muted-foreground mb-2">출처</p>
            <div className="space-y-1.5">
              {song.sources.map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="block text-xs text-primary hover:underline">
                  {source.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Original song */}
        <div>
          <p className="text-[9px] font-mono tracking-widest uppercase text-muted-foreground mb-2">원곡</p>
          <div className="rounded-xl border border-border p-4 bg-secondary flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: song.teamColor + "22" }}
            >
              <Music2 size={16} style={{ color: song.teamColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm leading-tight" style={{ fontFamily: "'Noto Serif KR', serif" }}>{orig.title}</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">{orig.artist}</p>
              <p className="text-[10px] font-mono text-muted-foreground/70 mt-1">{orig.year} · {orig.genre} · {orig.country}</p>
            </div>
          </div>
        </div>

        {/* Siblings */}
        <div>
          <p className="text-[9px] font-mono tracking-widest uppercase text-muted-foreground mb-3">같은 원곡 응원가 ({siblings.length})</p>
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
                  <div className={`flex-1 rounded-lg px-3 py-2 border transition-colors ${isCurrent ? "border-border bg-secondary" : "border-transparent hover:bg-secondary"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs leading-snug ${isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{s.title}</p>
                      <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">{s.year}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{s.team}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── View: 원곡별 ───────────────────────────────────────────────────────────────

function ByOriginView({ query, typeFilter, onSelect }: { query: string; typeFilter: "all" | "baseball" | "university"; onSelect: (s: CheerSong) => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(ORIGINAL_SONGS.map((o) => o.id)));
  const groups = ORIGINAL_SONGS.map((orig) => ({
    orig,
    songs: byOriginal(orig.id).filter((s) => {
      const mt = typeFilter === "all" || s.teamType === typeFilter;
      return mt && matchesSearch(s, query);
    }),
  })).filter((g) => g.songs.length > 0);

  if (!groups.length) return <Empty />;

  return (
    <div className="divide-y divide-border space-y-0">
      {groups.map(({ orig, songs }, idx) => {
        const isOpen = expanded.has(orig.id);
        return (
          <div key={orig.id} className="py-7 first:pt-0">
            <button
              className="w-full text-left flex items-start justify-between gap-4 group"
              onClick={() => { const n = new Set(expanded); isOpen ? n.delete(orig.id) : n.add(orig.id); setExpanded(n); }}
            >
              <div className="flex items-baseline gap-4 flex-1 min-w-0">
                <span className="text-xs font-mono text-muted-foreground/40 flex-shrink-0 w-6 text-right tabular-nums">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <div className="flex items-baseline flex-wrap gap-x-3 gap-y-0.5">
                    <h3 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Noto Serif KR', serif" }}>{orig.title}</h3>
                    <span className="text-base text-muted-foreground">{orig.artist}</span>
                    <span className="text-[11px] font-mono text-muted-foreground/50">{orig.year} · {orig.country} · {orig.genre}</span>
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5">파생 응원가 {songs.length}곡</p>
                </div>
              </div>
              <div className="flex-shrink-0 mt-2 text-muted-foreground group-hover:text-foreground transition-colors">
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>
            {isOpen && (
              <div className="mt-5 ml-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {songs.map((s) => <CheerCard key={s.id} song={s} onClick={() => onSelect(s)} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── View: 구단별 ───────────────────────────────────────────────────────────────

function ByTeamView({ query, typeFilter, onSelect }: { query: string; typeFilter: "all" | "baseball" | "university"; onSelect: (s: CheerSong) => void }) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {teams.map(({ team, songs, meta }) => {
        const bright = luminance(meta.teamColor) > 140;
        const textOnColor = bright ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.95)";
        const subOnColor = bright ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.6)";
        return (
          <div key={team} className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Team header */}
            <div className="relative px-4 py-4 overflow-hidden" style={{ background: `linear-gradient(135deg, ${meta.teamColor} 0%, ${meta.teamColorAlt} 100%)` }}>
              <span
                className="absolute right-2 top-0 text-[56px] font-black leading-none select-none pointer-events-none tracking-tighter"
                style={{ color: "rgba(255,255,255,0.1)", fontFamily: "'Noto Sans KR', sans-serif" }}
              >
                {meta.abbr}
              </span>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="inline-flex items-center gap-1 text-[9px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: "rgba(255,255,255,0.18)", color: textOnColor }}>
                  {meta.teamType === "baseball" ? <Trophy size={8} /> : <University size={8} />}
                  {meta.teamType === "baseball" ? "야구" : "대학"}
                </span>
                <span className="text-[10px] font-mono" style={{ color: subOnColor }}>{meta.region}</span>
              </div>
              <p className="text-base font-bold leading-tight" style={{ color: textOnColor, fontFamily: "'Noto Serif KR', serif" }}>{team}</p>
              <p className="text-[10px] font-mono mt-0.5" style={{ color: subOnColor }}>{songs.length}곡</p>
            </div>
            {/* Song rows */}
            <div className="divide-y divide-border">
              {songs.map((s) => {
                const orig = getOriginalSong(s.originalSongId)!;
                return (
                  <button key={s.id} onClick={() => onSelect(s)} className="w-full text-left px-4 py-3 hover:bg-secondary transition-colors group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground leading-snug" style={{ fontFamily: "'Noto Serif KR', serif" }}>{s.title}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Music2 size={9} className="text-muted-foreground/40 flex-shrink-0" />
                          <p className="text-[10px] text-muted-foreground truncate">{orig.title} — {orig.artist}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-1 pt-0.5">
                        <span className="text-[10px] font-mono text-muted-foreground">{s.year}</span>
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ backgroundColor: meta.teamColor }}
                        >
                          <Play size={8} className="text-white ml-px" />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── View: 연도별 ───────────────────────────────────────────────────────────────

function ByYearView({ query, typeFilter, onSelect }: { query: string; typeFilter: "all" | "baseball" | "university"; onSelect: (s: CheerSong) => void }) {
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
    songs.forEach((s) => { if (!m[s.year]) m[s.year] = []; m[s.year].push(s); });
    return Object.entries(m).sort((a, b) => Number(a[0]) - Number(b[0]));
  };

  return (
    <div className="space-y-12">
      {decades.map(({ decade, songs }) => (
        <div key={decade}>
          <div className="flex items-center gap-4 mb-6">
            <h3 className="text-3xl font-black text-foreground" style={{ fontFamily: "'Noto Serif KR', serif" }}>{decade}년대</h3>
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] font-mono text-muted-foreground">{songs.length}곡</span>
          </div>
          <div className="space-y-5">
            {byYearMap(songs).map(([year, ys]) => (
              <div key={year} className="flex gap-5">
                <div className="w-10 flex-shrink-0 pt-3.5">
                  <span className="text-[11px] font-mono text-muted-foreground">{year}</span>
                </div>
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {ys.map((s) => <CheerCard key={s.id} song={s} onClick={() => onSelect(s)} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function Empty() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
      <Music2 size={36} className="opacity-20" />
      <p className="text-sm">검색 결과가 없습니다</p>
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
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b border-border"
        style={{ backgroundColor: "rgba(245,242,237,0.92)", backdropFilter: "blur(12px)" }}
      >
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="h-14 flex items-center gap-5">
            {/* Logo */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: "#C41E3A" }}>
                <Music2 size={14} className="text-white" />
              </div>
              <span className="text-sm font-bold tracking-tight" style={{ fontFamily: "'Noto Serif KR', serif" }}>응원가 아카이브</span>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-sm relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="곡명, 팀명, 원곡 검색…"
                className="w-full h-8 rounded-lg pl-8 pr-3 text-xs bg-secondary border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
              />
            </div>

            {/* Type filter */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {([["all", "전체"], ["baseball", "야구"], ["university", "대학"]] as [TypeFilter, string][]).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setTypeFilter(v)}
                  className={`px-3 h-7 text-xs rounded-md transition-all flex items-center gap-1.5 ${typeFilter === v ? "bg-foreground text-background font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {v === "baseball" && <Trophy size={10} />}
                  {v === "university" && <University size={10} />}
                  {l}
                </button>
              ))}
            </div>

            <span className="flex-shrink-0 text-[11px] font-mono text-muted-foreground">{total}곡</span>
          </div>

          {/* View tabs */}
          <div className="flex items-center gap-0 -mb-px">
            {([["origin", "원곡별"], ["team", "구단별"], ["year", "연도별"]] as [ViewMode, string][]).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${view === v ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[1280px] mx-auto px-6 py-8">
        {view === "origin" && <ByOriginView query={query} typeFilter={typeFilter} onSelect={setSelected} />}
        {view === "team"   && <ByTeamView   query={query} typeFilter={typeFilter} onSelect={setSelected} />}
        {view === "year"   && <ByYearView   query={query} typeFilter={typeFilter} onSelect={setSelected} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-5 px-6 mt-4">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between">
          <p className="text-[11px] font-mono text-muted-foreground">응원가 아카이브 — 대한민국 응원가 데이터베이스</p>
          <p className="text-[11px] font-mono text-muted-foreground">
            야구 {CHEER_SONGS.filter((s) => s.teamType === "baseball").length}곡 · 대학 {CHEER_SONGS.filter((s) => s.teamType === "university").length}곡 · 원곡 {ORIGINAL_SONGS.length}개
          </p>
        </div>
      </footer>

      {/* Drawer */}
      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-foreground/10 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <DetailDrawer song={selected} onClose={() => setSelected(null)} />
        </>
      )}
    </div>
  );
}
