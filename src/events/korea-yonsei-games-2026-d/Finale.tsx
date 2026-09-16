import { ArrowUpRight, Instagram } from "lucide-react";
import type { Side } from "../korea-yonsei-games-2026/eventTypes";
import { SIDE_META } from "../korea-yonsei-games-2026/eventConfig";

// Official social accounts: linktr.ee/akaraka_yonsei and linktr.ee/ku_cheerleaders.
export const CHEER_INSTAGRAM: Record<Side, string> = {
  yonsei: "https://www.instagram.com/akaraka_yonsei/",
  korea: "https://www.instagram.com/ku_cheerleaders/",
};

export function Finale({ side }: { side: Side }) {
  return <footer className="rivalry-finale" data-side={side}>
    <div className="rivalry-finale__horizon" aria-hidden="true" />
    <div className="match-shell">
      <h2><span>2026년 {SIDE_META[side].rivalryName}도</span><em>필승, 전승, 압승!</em></h2>
      <div className="rivalry-finale__links">
        <a href={CHEER_INSTAGRAM[side]} target="_blank" rel="noreferrer"><Instagram size={20} aria-hidden="true" /><strong>{SIDE_META[side].shortName}대 응원단 인스타그램</strong><ArrowUpRight size={19} aria-hidden="true" /></a>
        <a href="/"><strong>전체 응원가 둘러보기</strong><ArrowUpRight size={19} aria-hidden="true" /></a>
      </div>
      <small>비공식 응원가 아카이브</small>
    </div>
  </footer>;
}
