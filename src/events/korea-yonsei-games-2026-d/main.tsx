import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import "../../styles/index.css";
import { KoreaYonseiGamesCPage } from "../korea-yonsei-games-2026-c/KoreaYonseiGamesCPage";
import { RivalryStory } from "./RivalryStory";
import { BaseballStory } from "./BaseballStory";
import { RivalryHero } from "./RivalryHero";
import { RivalrySwitch } from "./RivalrySwitch";
import { SongSections } from "./SongSections";
import { Finale } from "./Finale";
import "../korea-yonsei-games-2026-c/styles.css";
import "./hero.css";
import "./rivalry.css";
import "./baseball.css";
import "./styles.css";
import "./switch.css";
import "./listening.css";
import "./finale.css";
import "./schedule.css";
import "./baseball-layout.css";
import "./light-band.css";

function ListenDeepLink() {
  useEffect(() => {
    if (window.location.hash !== "#match-songs") return;
    requestAnimationFrame(() => document.getElementById("match-songs")?.scrollIntoView({ block: "start" }));
  }, []);
  return null;
}

createRoot(document.getElementById("root")!).render(
  <MotionConfig reducedMotion="user">
    <ListenDeepLink />
    <KoreaYonseiGamesCPage
      concept="D"
      renderSchoolPicker={({ side, onChange }) => <RivalrySwitch side={side} onChange={onChange} />}
      renderHero={({ side }) => <RivalryHero side={side} />}
      renderSongs={({ side, content }) => <SongSections key={`songs-${side}`} side={side} content={content} />}
      renderFooter={({ side }) => <Finale side={side} />}
      renderRivalry={({ side, contents }) => <RivalryStory key={`rivalry-${side}`} side={side} contents={contents} />}
      renderBaseball={({ side, contents }) => <BaseballStory key={`baseball-${side}`} side={side} contents={contents} />}
    />
  </MotionConfig>,
);
