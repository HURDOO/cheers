import { useEffect, useLayoutEffect, useRef } from "react";
import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { SIDE_META } from "../korea-yonsei-games-2026/eventConfig";
import type { Side } from "../korea-yonsei-games-2026/eventTypes";

type AnchorRect = { left: number; top: number; width: number; height: number };

// The one live control travels between two inert layout anchors. Keeping its DOM
// node mounted preserves keyboard focus and prevents competing school selectors.
export function getSwitchPlacement(home: AnchorRect, dock: AnchorRect, scrollY: number) {
  const distance = Math.max(1, home.top + scrollY - dock.top);
  const progress = Math.max(0, Math.min(1, scrollY / distance));
  const eased = progress * progress * (3 - 2 * progress);
  const mix = (a: number, b: number) => a + (b - a) * eased;
  return {
    left: mix(home.left, dock.left),
    top: Math.max(dock.top, home.top),
    width: mix(home.width, dock.width),
    height: mix(home.height, dock.height),
    progress: eased,
  };
}

const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const LOGOS = { korea: "korea-global-symbol.png", yonsei: "yonsei-emblem.png" } as const;

export function RivalrySwitch({ side, onChange }: { side: Side; onChange: (side: Side) => void }) {
  const control = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useClientLayoutEffect(() => {
    const home = document.getElementById("rivalry-school-home");
    const dock = document.getElementById("rivalry-school-dock");
    const node = control.current;
    if (!home || !dock || !node) return;
    let frame = 0;

    function update() {
      frame = 0;
      if (!home || !dock || !node) return;
      const placement = getSwitchPlacement(home.getBoundingClientRect(), dock.getBoundingClientRect(), window.scrollY);
      for (const prop of ["left", "top", "width", "height"] as const) node.style[prop] = `${placement[prop]}px`;
      node.style.setProperty("--docking", String(placement.progress));
      node.style.visibility = "visible";
      node.dataset.docked = String(placement.progress === 1);
    }

    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    update();
    const resize = new ResizeObserver(schedule);
    resize.observe(home);
    resize.observe(dock);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div className="rivalry-switch" ref={control} data-side={side} data-docked="false" role="group" aria-label="학교 관점 선택" aria-describedby="rivalry-switch-help" style={{ visibility: "hidden" }}>
      <motion.span className="rivalry-switch__selection" aria-hidden="true" initial={false} animate={{ x: side === "yonsei" ? "0%" : "100%" }} transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }} />
      {(["yonsei", "korea"] as Side[]).map((camp) => (
        <button key={camp} className={`is-${camp}`} type="button" aria-label={`${SIDE_META[camp].shortName} 관점`} aria-pressed={side === camp} onClick={() => onChange(camp)}>
          <img src={`/events/korea-yonsei-games-2026-alt/${LOGOS[camp]}`} alt="" width="36" height="36" />
          <strong>{SIDE_META[camp].shortName}<span>대학교</span></strong>
          <Check className="rivalry-switch__check" size={13} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
