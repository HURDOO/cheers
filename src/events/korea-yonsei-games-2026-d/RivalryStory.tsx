import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Play, X } from "lucide-react";
import { SIDE_META } from "../korea-yonsei-games-2026/eventConfig";
import type { ResolvedSideContent, Side, SongSummary } from "../korea-yonsei-games-2026/eventTypes";
import { ListeningPlayer } from "./SongSections";
import { SharedYouTubeFrame, useDPlayback } from "./playback";

// Performance examples for this design preview, from the existing event research.
// These do not change the archive's editorial records or selected video slots.
const EXAMPLES = {
  yonsei: {
    songId: "yonsei-university-woo",
    opponent: "korea",
    emblem: "/events/korea-yonsei-games-2026-alt/yonsei-emblem.png",
    description: "신나는 리듬에 실어 고대를 놀리는, 장난스러운 도발.",
    videoId: "Tbex2Oh9YqM",
    startSeconds: 0,
    credit: "디카츄 · 2026 고대·연대 합동응원",
  },
  korea: {
    songId: "korea-university-kkureora-yonsei",
    opponent: "yonsei",
    emblem: "/events/korea-yonsei-games-2026-alt/korea-global-symbol.png",
    description: "제목부터 연세를 겨냥하는, 짧고 강한 선전포고.",
    videoId: "qSIfnhQHDvE",
    // The uploader's chapter marks 꿇어라 연세 at 03:36, after 쎄쎄쎄.
    startSeconds: 216,
    credit: "디카츄 · 2026 고대 신입생 응원 OT",
  },
} as const;

// User-provided excerpts belong to this event preview, not the approved catalog.
export const RIVALRY_LINES: Record<string, string> = {
  "yonsei-university-woo": "자 이제 우리가 너희들을 깐다~ 어디? 저기!",
  "korea-university-kkureora-yonsei": "이러다 새되겠네 연세, 우리는 잘나가는 고대!",
  "korea-university-singgeulbeonggeul": "집에가지마~ 안암으로와~ 신촌은 골로골로 골로간다~",
  "korea-university-yonsei-chicken": "연세치킨 한마리 튀겨주세요! 바삭바삭하게 튀겨주세요!",
  "yonsei-university-goyangi-sound": "츄 고양이들 너무 귀여워! 야옹야옹 하는 것도 귀여워!",
  "yonsei-university-go-balp-kkum": "저기 고대 겁도 없구나~ 고대가 꿈틀거리네, 꽉 밟아라!",
  "yonsei-university-ko-dae": "고대에게 챱, 챱챱챱! 마지막 필살기 한방에 넉다운 K.O.",
  "korea-university-urineun-korea": "Hey 거기 연세! 우리는 여기 위로, 너희는 저기 뒤로, 이게 바로 노는거야!",
};

const SYMBOL_SONGS: Record<Side, string> = {
  yonsei: "yonsei-university-goyangi-sound",
  korea: "korea-university-yonsei-chicken",
};

// Existing preview performances plus official single-song videos from the event
// research. This does not select or publish canonical archive video slots.
const MORE_PERFORMANCES: Record<string, { videoId: string; channelName: string }> = {
  "yonsei-university-goyangi-sound": { videoId: "fkELbEKZhhg", channelName: "KODA" },
  "korea-university-yonsei-chicken": { videoId: "eQF797kE5E8", channelName: "KUTV" },
  "yonsei-university-go-balp-kkum": { videoId: "OUcWoN6-gUo", channelName: "아카라카TV" },
  "yonsei-university-ko-dae": { videoId: "2t-fnYPbplc", channelName: "아카라카TV" },
  "korea-university-singgeulbeonggeul": { videoId: "54LdboZa0QU", channelName: "고려대학교 응원단" },
  "korea-university-urineun-korea": { videoId: "A05Mp1fJbvw", channelName: "고려대학교 응원단" },
};

function videoUrl(videoId: string, startSeconds = 0) {
  return `https://www.youtube.com/watch?v=${videoId}${startSeconds ? `&t=${startSeconds}s` : ""}`;
}

export function getRivalryPlaybackSong(song: SongSummary): SongSummary {
  const performance = MORE_PERFORMANCES[song.id];
  return {
    ...song,
    lyrics: RIVALRY_LINES[song.id] ? [RIVALRY_LINES[song.id]] : song.lyrics,
    media: song.media ?? (performance && { kind: "youtube", ...performance, sourceUrl: videoUrl(performance.videoId) }),
  };
}

export function RivalryStory({ side, contents }: {
  side: Side;
  contents: Record<Side, ResolvedSideContent>;
}) {
  const { activeKey, activate, close } = useDPlayback();
  const [moreSong, setMoreSong] = useState<SongSummary | null>(null);
  const player = useRef<HTMLIFrameElement>(null);
  const playButtons = useRef<Partial<Record<Side, HTMLButtonElement | null>>>({});
  const morePanels = useRef<Record<string, HTMLLIElement | null>>({});
  const moreButtons = useRef<Record<string, HTMLButtonElement | null>>({});
  const order: Side[] = [side, side === "yonsei" ? "korea" : "yonsei"];
  const moreSongs = order.map((camp) => ({
    camp,
    songs: contents[camp].rivalrySongs
      .filter((song) => song.id !== EXAMPLES[camp].songId)
      .sort((a, b) => Number(b.id === SYMBOL_SONGS[camp]) - Number(a.id === SYMBOL_SONGS[camp]))
      .map(getRivalryPlaybackSong),
  }));
  const moreQueue = moreSongs.flatMap(({ songs }) => songs);

  useEffect(() => {
    if (activeKey?.startsWith("rivalry-featured:")) player.current?.focus({ preventScroll: true });
  }, [activeKey]);

  function closeVideo(camp: Side) {
    close();
    requestAnimationFrame(() => playButtons.current[camp]?.focus());
  }

  function selectMore(song: SongSummary) {
    const key = `rivalry-more:${song.id}`;
    if (activeKey === key) {
      closeMore();
      return;
    }
    setMoreSong(song);
    activate(key);
    requestAnimationFrame(() => {
      morePanels.current[song.id]?.focus({ preventScroll: true });
      morePanels.current[song.id]?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
    });
  }

  function closeMore() {
    const id = moreSong?.id;
    setMoreSong(null);
    close();
    requestAnimationFrame(() => { if (id) moreButtons.current[id]?.focus(); });
  }

  return (
    <section className="rivalry-story" id="match-rivalry" aria-labelledby="match-rivalry-title">
      <div className="rivalry-story__shell">
        <header className="rivalry-story__heading">
          <div>
            <p className="rivalry-story__eyebrow">라이벌리</p>
            <h2 id="match-rivalry-title">독수리는 치킨,<br /><em>호랑이는 고양이.</em></h2>
          </div>
        </header>

        <div className="rivalry-story__matchup">
          {order.map((camp) => {
            const example = EXAMPLES[camp];
            const song = contents[camp].rivalrySongs.find((item) => item.id === example.songId);
            if (!song) return null;
            const playbackKey = `rivalry-featured:${camp}:${song.id}`;
            const isPlaying = activeKey === playbackKey;
            const playerId = `rivalry-story-video-${camp}`;

            return (
              <article className={`rivalry-story__camp is-${camp}`} key={camp} aria-labelledby={`rivalry-story-title-${camp}`}>
                <div className="rivalry-story__camp-heading">
                  <div className="rivalry-story__direction">
                    <img src={example.emblem} alt="" width="30" height="30" />
                    <strong>{SIDE_META[camp].shortName}</strong>
                    <ArrowRight size={15} aria-hidden="true" />
                    <span>{SIDE_META[example.opponent].shortName}에게</span>
                  </div>
                </div>

                <h3 id={`rivalry-story-title-${camp}`}>{song.title}</h3>
                <p className="rivalry-story__explanation">{example.description}</p>
                <blockquote className="rivalry-story__lyric">{RIVALRY_LINES[song.id]}</blockquote>

                <div className="rivalry-story__screen" id={playerId}>
                  {isPlaying ? (
                    <SharedYouTubeFrame
                      iframeRef={player}
                      videoId={example.videoId}
                      startSeconds={example.startSeconds}
                      title={`${SIDE_META[camp].name} ${song.title} 현장 영상`}
                    />
                  ) : (
                    <button
                      ref={(element) => { playButtons.current[camp] = element; }}
                      type="button"
                      className="rivalry-story__play"
                      aria-label={`${song.title} 현장 영상 재생`}
                      onClick={() => { setMoreSong(null); activate(playbackKey); }}
                    >
                      <img
                        src={`https://i.ytimg.com/vi/${example.videoId}/hqdefault.jpg`}
                        alt=""
                        loading="lazy"
                        width="480"
                        height="360"
                        onError={(event) => { event.currentTarget.hidden = true; }}
                      />
                      <span className="rivalry-story__play-label"><span><Play size={21} fill="currentColor" aria-hidden="true" /></span></span>
                    </button>
                  )}
                </div>

                <footer className="rivalry-story__credit">
                  <a href={videoUrl(example.videoId, example.startSeconds)} target="_blank" rel="noreferrer" aria-label={`${example.credit}, ${song.title} YouTube에서 보기`}>
                    {example.credit}<ArrowUpRight size={13} aria-hidden="true" />
                  </a>
                  {isPlaying && <button type="button" onClick={() => closeVideo(camp)} aria-label={`${song.title} 영상 닫기`}><X size={14} aria-hidden="true" /> 닫기</button>}
                </footer>
              </article>
            );
          })}
        </div>

        <section className="rivalry-story__more" aria-labelledby="rivalry-story-more-title">
          <header className="rivalry-story__more-heading"><h3 id="rivalry-story-more-title">다른 라이벌리 응원가</h3></header>
          <div className="rivalry-story__other-songs">
            {moreSongs.map(({ camp, songs }) => (
              <div className={`rivalry-story__repertoire is-${camp}`} key={camp}>
                <h4>{SIDE_META[camp].name}</h4>
                <ul>
                  {songs.map((song) => {
                    const playbackKey = `rivalry-more:${song.id}`;
                    const isPlaying = activeKey === playbackKey && moreSong?.id === song.id;
                    return <Fragment key={song.id}>
                      <li className={isPlaying ? "is-selected" : ""}>
                        <div><strong>{song.title}</strong><p>{RIVALRY_LINES[song.id]}</p></div>
                        <button ref={(element) => { moreButtons.current[song.id] = element; }} type="button" aria-label={`${song.title} 영상 재생`} aria-expanded={isPlaying} aria-controls={`rivalry-player-${song.id}`} onClick={() => selectMore(song)}>
                          <Play size={15} aria-hidden="true" />재생
                        </button>
                      </li>
                      {isPlaying && <li className="rivalry-story__more-player" id={`rivalry-player-${song.id}`} ref={(element) => { morePanels.current[song.id] = element; }} tabIndex={-1} data-school={song.teamId === "korea-university" ? "korea" : "yonsei"} data-playback-key={playbackKey} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); closeMore(); } }}>
                        <ListeningPlayer song={song} queue={moreQueue} playing onPlay={() => activate(playbackKey)} onSelect={selectMore} onClose={closeMore} closeLabel="라이벌리 플레이어 닫기" />
                      </li>}
                    </Fragment>;
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
