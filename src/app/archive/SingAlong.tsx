import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Minus, Plus, X } from "lucide-react";
import type { CheerSong } from "../../data/types";
import { songStyle } from "./LyricCard";
import { toStanzas } from "./lib";

const SCALE_KEY = "cheers-sing-scale";
const SCALES = [0.8, 0.9, 1, 1.15, 1.3, 1.5];

function readScale() {
  try {
    const saved = Number(localStorage.getItem(SCALE_KEY));
    return SCALES.includes(saved) ? saved : 1;
  } catch {
    return 1;
  }
}

type WakeLockSentinelLike = { release: () => Promise<void>; addEventListener: (type: "release", listener: () => void) => void };
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> } };

/** 응원석에서 폰을 들고 볼 수 있게 가사를 화면 가득 띄우고, 보는 동안 화면이 꺼지지 않게 합니다. */
function useScreenWakeLock() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const wakeLock = (navigator as WakeLockNavigator).wakeLock;
    if (!wakeLock) return;
    let sentinel: WakeLockSentinelLike | null = null;
    let disposed = false;

    async function acquire() {
      try {
        sentinel = await wakeLock!.request("screen");
        if (disposed) {
          await sentinel.release();
          return;
        }
        setActive(true);
        sentinel.addEventListener("release", () => setActive(false));
      } catch {
        setActive(false);
      }
    }

    // 다른 앱을 갔다 오면 잠금이 풀리므로 다시 요청합니다.
    function handleVisibility() {
      if (document.visibilityState === "visible") void acquire();
    }

    void acquire();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      void sentinel?.release().catch(() => undefined);
    };
  }, []);

  return active;
}

export function SingAlong({ song, onClose }: { song: CheerSong; onClose: () => void }) {
  const [scale, setScale] = useState(readScale);
  const closeRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const awake = useScreenWakeLock();
  const stanzas = toStanzas(song.lyrics);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [onClose]);

  function changeScale(step: number) {
    const next = SCALES[Math.min(SCALES.length - 1, Math.max(0, SCALES.indexOf(scale) + step))];
    setScale(next);
    try {
      localStorage.setItem(SCALE_KEY, String(next));
    } catch {
      // 저장이 막힌 브라우저에서는 이번에만 적용합니다.
    }
  }

  return (
    <div className="sing" role="dialog" aria-modal="true" aria-label={`${song.title} 따라 부르기`} style={songStyle(song)}>
      <header className="sing__bar">
        <div className="sing__heading">
          <strong>{song.title}</strong>
          <span>{song.team}{awake ? " · 화면 켜짐 유지 중" : ""}</span>
        </div>
        <div className="sing__controls">
          <button type="button" onClick={() => changeScale(-1)} disabled={scale === SCALES[0]} aria-label="글자 작게">
            <Minus size={18} />
          </button>
          <button type="button" onClick={() => changeScale(1)} disabled={scale === SCALES[SCALES.length - 1]} aria-label="글자 크게">
            <Plus size={18} />
          </button>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="따라 부르기 닫기">
            <X size={20} />
          </button>
        </div>
      </header>

      <div ref={bodyRef} className="sing__body" style={{ "--sing-scale": scale } as CSSProperties}>
        {stanzas.map((stanza, index) => (
          <p key={index} className="sing__stanza">
            {stanza.map((line, lineIndex) => <span key={lineIndex}>{line}</span>)}
          </p>
        ))}
        <button type="button" className="sing__top" onClick={() => bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" })}>
          처음으로
        </button>
      </div>
    </div>
  );
}
