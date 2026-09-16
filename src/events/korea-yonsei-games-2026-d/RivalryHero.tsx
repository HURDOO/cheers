import { useEffect, useRef, type CSSProperties, type PointerEvent } from "react";
import { ArrowDown, Play } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { SIDE_META } from "../korea-yonsei-games-2026/eventConfig";
import type { Side } from "../korea-yonsei-games-2026/eventTypes";

const LOGOS = {
  korea: "korea-global-symbol.png",
  yonsei: "yonsei-emblem.png",
} as const;

export function getTitlePose(camp: Side, side: Side) {
  const active = camp === side;
  // '연' has more visual mass than '고': compensate optically, not just by em size.
  return {
    y: active ? "0em" : (camp === "yonsei" ? "-0.13em" : "-0.0375em"),
    scale: active ? (camp === "korea" ? 1.08 : 1) : (camp === "yonsei" ? .74 : .82),
    opacity: active ? 1 : .68,
  };
}

export function RivalryHero({ side }: { side: Side }) {
  const opponent = side === "korea" ? "yonsei" : "korea";
  const stage = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const spring = reducedMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 185, damping: 24 };

  useEffect(() => {
    document.title = `2026 정기 ${SIDE_META[side].rivalryName} — 응원가 아카이브`;
  }, [side]);

  function move(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    stage.current?.style.setProperty("--tilt-x", `${-y * 8}deg`);
    stage.current?.style.setProperty("--tilt-y", `${x * 12}deg`);
  }

  function reset() {
    stage.current?.style.setProperty("--tilt-x", "0deg");
    stage.current?.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <section className="rivalry-hero" aria-labelledby="rivalry-hero-title" onPointerMove={move} onPointerLeave={reset}>
      <div className="rivalry-hero__lights" aria-hidden="true"><i /><i /></div>
      <div className="rivalry-hero__shell">
        <div className="rivalry-hero__choose">
          <p id="rivalry-switch-help" className="match-sr-only">응원할 학교를 선택하세요.</p>
          <div id="rivalry-school-home" className="rivalry-school-home" aria-hidden="true" />
        </div>
        <div className="rivalry-hero__composition">
          <header className="rivalry-hero__heading">
            <p className="rivalry-hero__eyebrow"><span>2026 정기전</span><time dateTime="2026-10-02">10월 2~3일</time></p>
            <h1 id="rivalry-hero-title" aria-label={`2026 정기 ${SIDE_META[side].rivalryName}`}>
              {([side, opponent] as Side[]).map((camp) => (
                <motion.span key={camp} layout={reducedMotion ? false : "position"} initial={false} transition={spring} className={`is-${camp}`} data-school={camp} aria-hidden="true">
                  <motion.span className="rivalry-hero__glyph" initial={false} animate={getTitlePose(camp, side)} transition={spring}>{SIDE_META[camp].symbol}</motion.span>
                </motion.span>
              ))}<strong aria-hidden="true">전</strong>
            </h1>
            <p className="rivalry-hero__statement">필승, 전승, 압승을 위해!</p>
            <div className="rivalry-hero__actions">
              <a className="rivalry-hero__primary" href="#match-songs"><span><Play size={17} fill="currentColor" aria-hidden="true" /></span><strong>응원가 미리 듣기</strong><ArrowDown size={17} aria-hidden="true" /></a>
            </div>
          </header>
          <div className="rivalry-hero__stage" ref={stage} style={{ "--tilt-x": "0deg", "--tilt-y": "0deg" } as CSSProperties} role="group" aria-label="연세와 고려, 두 응원석의 맞대결">
            <div className="rivalry-hero__backlight" aria-hidden="true" />
            {(["yonsei", "korea"] as Side[]).map((camp) => {
              const active = side === camp;
              return (
                <motion.div className={`rivalry-hero__camp is-${camp}`} key={camp} data-active={active} initial={false} animate={{ x: active ? (camp === "yonsei" ? 6 : -6) : 0, y: active ? -16 : 16, scale: active ? 1.04 : .85 }} transition={spring}>
                  <div className="rivalry-hero__crest" data-school={camp}>
                    <img src={`/events/korea-yonsei-games-2026-alt/${LOGOS[camp]}`} alt="" width="180" height="180" />
                  </div>
                  <p>{SIDE_META[camp].name}</p>
                </motion.div>
              );
            })}
            <span className="rivalry-hero__versus" aria-hidden="true">VS</span>
          </div>
        </div>
        <div className="rivalry-hero__closing"><a href="#match-schedule">일정 보기<ArrowDown size={14} aria-hidden="true" /></a></div>
      </div>
    </section>
  );
}
