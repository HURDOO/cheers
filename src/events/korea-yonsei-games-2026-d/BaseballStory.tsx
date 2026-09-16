import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, Play, X } from "lucide-react";
import { getOriginalSong } from "../../data/catalog";
import { catalogSongSource } from "../korea-yonsei-games-2026/catalogSongSource";
import { KBO_TEAMS } from "../korea-yonsei-games-2026/eventContent";
import type { ResolvedSideContent, Side, SongMedia, SongSummary } from "../korea-yonsei-games-2026/eventTypes";
import { BASEBALL_CONNECTIONS, BASEBALL_PREVIEW_SONGS } from "./baseballConnections";
import { ListeningPlayer } from "./SongSections";
import { SharedYouTubeFrame, useDPlayback } from "./playback";

interface LineageStep {
  songId: string;
  venue: "campus" | "baseball";
  displayTitle?: string;
  caption: string;
  startSeconds?: number;
  endSeconds?: number;
}

interface LineageRoute {
  id: string;
  originalId: string;
  title: string;
  steps: LineageStep[];
}

// D's editorial routes: both Korean baseball arias come from the campus aria;
// Yonsei's two routes travel in opposite directions. Keep the catalog untouched.
const ROUTES: Record<Side, LineageRoute[]> = {
  korea: [{
    id: "korea-kiwoom-lg", originalId: "andrea-bocelli-melodramma", title: "고려에서 키움과 LG로",
    steps: [
      { songId: "korea-university-minjogui-aria", venue: "campus", caption: "KUTV · 16개 단과대학이 함께 부르는 민족의 아리아" },
      { songId: "kiwoom-heroes-seungni-ui-hamseong", venue: "baseball", displayTitle: "승리를 위한 함성", caption: "키움히어로즈 · 승리를 위한 함성 구간", startSeconds: 832, endSeconds: 859 },
      { songId: "lg-twins-seoul-ui-aria", venue: "baseball", caption: "LGTWINSTV · 서울의 아리아 구간", endSeconds: 1572 },
    ],
  }],
  yonsei: [{
    id: "hanwha-yonsei", originalId: "han-sung-min-saranghamyeon-halssurok", title: "한화에서 연세로",
    steps: [
      { songId: "hanwha-eagles-saranghanda-eagles", venue: "baseball", caption: "은최 · 사랑한다 이글스" },
      { songId: "yonsei-university-haneul-kkeutkkaji", venue: "campus", caption: "하늘끝까지 · 학교 버전" },
    ],
  }, {
    id: "yonsei-lg", originalId: "carlos-gardel-por-una-cabeza", title: "연세에서 LG로",
    steps: [
      { songId: "yonsei-university-yonseiyeo-saranghanda", venue: "campus", caption: "아카라카TV · 연세여 사랑한다" },
      { songId: "lg-twins-saranghanda-lg", venue: "baseball", caption: "LGTWINSTV · 사랑한다 LG 구간", endSeconds: 1054 },
    ],
  }],
};

const RELATION_LABELS = { adaptation: "대학 응원가 차용", shared: "같은 원곡", pending: "관계 확인 중" };

function watchUrl(media: SongMedia) {
  const url = new URL(media.sourceUrl);
  if (media.startSeconds) url.searchParams.set("t", `${media.startSeconds}s`);
  return url.toString();
}

function songLink(song: SongSummary) {
  return song.media ? watchUrl(song.media)
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.teamName} 응원가 ${song.title}`)}`;
}

function BaseballVideo({ song, step, isPlaying, onPlay, onClose, lineage }: {
  song: SongSummary;
  step: LineageStep;
  lineage?: { song: SongSummary; direction: "from" | "to"; title: string };
  isPlaying: boolean;
  onPlay: () => void;
  onClose: () => void;
}) {
  const player = useRef<HTMLIFrameElement>(null);
  const playButton = useRef<HTMLButtonElement>(null);
  const media = song.media && { ...song.media, startSeconds: step.startSeconds ?? song.media.startSeconds };
  const sourceUrl = media ? watchUrl(media) : songLink(song);
  const title = step.displayTitle ?? song.title;
  useEffect(() => {
    if (isPlaying) player.current?.focus({ preventScroll: true });
  }, [isPlaying]);

  return (
      <article className="baseball-story__version" data-song-id={song.id} aria-labelledby={`baseball-version-${song.id}`}>
        <header><p>{song.teamName}</p><h3 id={`baseball-version-${song.id}`}><span>{title}</span>{lineage && <a className="baseball-story__title-link" href={songLink(lineage.song)} target="_blank" rel="noreferrer"
          data-lineage-from={lineage.direction === "from" ? lineage.song.id : song.id}
          data-lineage-to={lineage.direction === "to" ? lineage.song.id : song.id}
          aria-label={`${lineage.title} ${lineage.song.teamId.includes("university") ? "학교 버전 듣기" : "야구장 버전 듣기"}`}
        >(<span aria-hidden="true">{lineage.direction === "to" ? "→" : "←"}</span> {lineage.title})</a>}</h3></header>
        <div className="baseball-story__screen">
          {media ? isPlaying ? (
            <SharedYouTubeFrame
              iframeRef={player}
              videoId={media.videoId}
              startSeconds={media.startSeconds}
              endSeconds={step.endSeconds}
              title={`${song.teamName} ${title} 영상`}
            />
          ) : (
            <button ref={playButton} className="baseball-story__play" type="button" onClick={onPlay} aria-label={`${title} 야구장 버전 재생`}>
              <img src={`https://i.ytimg.com/vi/${media.videoId}/hqdefault.jpg`} alt="" width="480" height="360" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />
              <span><i><Play size={20} fill="currentColor" aria-hidden="true" /></i></span>
            </button>
          ) : (
            <a className="baseball-story__unavailable" href={sourceUrl} target="_blank" rel="noreferrer">{title} 영상 찾기<ArrowUpRight size={18} aria-hidden="true" /></a>
          )}
        </div>
        <footer>
          <a href={sourceUrl} target="_blank" rel="noreferrer" aria-label={`${title} YouTube에서 보기`}>{step.caption}<ArrowUpRight size={13} aria-hidden="true" /></a>
          {isPlaying && <button type="button" aria-label={`${title} 영상 닫기`} onClick={() => {
            onClose();
            requestAnimationFrame(() => playButton.current?.focus({ preventScroll: true }));
          }}><X size={14} aria-hidden="true" />닫기</button>}
        </footer>
      </article>
  );
}

export function BaseballStory({ side, contents }: { side: Side; contents: Record<Side, ResolvedSideContent> }) {
  const { activeKey, activate, close } = useDPlayback();
  const [moreSong, setMoreSong] = useState<SongSummary | null>(null);
  const morePanels = useRef<Record<string, HTMLLIElement | null>>({});
  const moreButtons = useRef<Record<string, HTMLButtonElement | null>>({});
  const content = contents[side];
  const campusSongs = [...content.mustKnowSongs, ...content.memorySongs];
  const songs = [...campusSongs, ...content.baseballSongs, ...content.lineageFamilies.flatMap((family) => family.members.map((member) => member.song))];
  const connectionSongs = BASEBALL_CONNECTIONS[side].flatMap((connection) => {
    const campus = campusSongs.find((song) => song.id === connection.campusId) ?? BASEBALL_PREVIEW_SONGS[connection.campusId];
    const club = content.baseballSongs.find((song) => song.id === connection.clubId)
      ?? catalogSongSource.getSong(connection.clubId) ?? BASEBALL_PREVIEW_SONGS[connection.clubId];
    return campus && club ? [{ connection, campus, club, allClubs: connection.campusId === "yonsei-university-apartment" }] : [];
  });
  const moreQueue = connectionSongs.map(({ club }) => club);

  function selectMore(song: SongSummary) {
    const key = `baseball-more:${song.id}`;
    if (activeKey === key) {
      closeMore();
      return;
    }
    setMoreSong(song);
    activate(key);
    requestAnimationFrame(() => morePanels.current[song.id]?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "nearest",
    }));
  }

  function closeMore() {
    const id = moreSong?.id;
    setMoreSong(null);
    close();
    requestAnimationFrame(() => { if (id) moreButtons.current[id]?.focus({ preventScroll: true }); });
  }

  return (
    <section className="baseball-story" id="match-baseball" aria-labelledby="match-baseball-title" data-camp={side}>
      <div className="baseball-story__shell">
        <header className="baseball-story__heading">
          <p className="baseball-story__eyebrow">야구장에서 만난 응원가</p>
          <h2 id="match-baseball-title">{side === "korea"
            ? <>키움과 LG가 부르는,<br /><em>민족의 아리아.</em></>
            : <>한화에서 연세로,<br /><em>연세에서 LG로.</em></>}</h2>
        </header>

        <div className={`baseball-story__routes${side === "yonsei" ? " is-paired" : ""}`}>
          {ROUTES[side].map((route) => {
            const original = getOriginalSong(route.originalId);
            return (
              <div className="baseball-route" key={route.id}>
                <div className="baseball-route__videos">
                  {route.steps.filter((step) => step.venue === "baseball").map((step) => {
                    const song = songs.find((item) => item.id === step.songId);
                    const index = route.steps.indexOf(step);
                    const linkedStep = side === "korea" ? route.steps[0] : index === 0 ? route.steps[index + 1] : route.steps[index - 1];
                    const linkedSong = songs.find((item) => item.id === linkedStep?.songId);
                    const playbackKey = `baseball-featured:${route.id}:${song?.id ?? step.songId}`;
                    return song ? <BaseballVideo key={song.id} song={song} step={step} isPlaying={activeKey === playbackKey} onPlay={() => { setMoreSong(null); activate(playbackKey); }} onClose={close}
                      lineage={linkedSong ? { song: linkedSong, direction: index === 0 ? "to" : "from", title: linkedStep.displayTitle ?? linkedSong.title } : undefined} /> : null;
                  })}
                </div>
                {original && <p className="baseball-route__source"><a href={`/?view=origin&q=${encodeURIComponent(original.title)}`} aria-label={`${original.title} 원곡 계보 자세히 알아보기`}>자세히 알아보기<ArrowUpRight size={16} aria-hidden="true" /></a></p>}
              </div>
            );
          })}
        </div>

        <section className="baseball-story__more" aria-labelledby="baseball-story-more-title">
          <h3 id="baseball-story-more-title">야구장에서 더 듣기</h3>
          <ul className="baseball-story__rail">
            {connectionSongs.map(({ connection, campus, club, allClubs }) => {
              const playbackKey = `baseball-more:${club.id}`;
              const isPlaying = activeKey === playbackKey && moreSong?.id === club.id;
              return <Fragment key={club.id}>
                <li className={isPlaying ? "is-selected" : ""} data-relation={connection.kind} data-campus-song={campus.id} data-club-song={club.id}>
                  <button ref={(element) => { moreButtons.current[club.id] = element; }} type="button" aria-label={allClubs ? "전 구단 아파트 응원 펼쳐 듣기" : `${club.teamName} ${club.title} 펼쳐 듣기`} aria-expanded={isPlaying} aria-controls={`baseball-player-${club.id}`} onClick={() => selectMore(club)}>
                    <small>{allClubs ? "전 구단" : club.teamName}</small><strong>{club.title}</strong>
                    <span className="baseball-story__rail-origin">{campus.teamShortName} · {connection.campusTitle ?? campus.title}</span>
                    <span className={`baseball-story__rail-relation is-${connection.kind}`}>{RELATION_LABELS[connection.kind]}</span>
                    <i><Play size={17} fill={isPlaying ? "currentColor" : "none"} aria-hidden="true" /></i>
                  </button>
                </li>
                {isPlaying && <li className="baseball-story__rail-player" id={`baseball-player-${club.id}`} ref={(element) => { morePanels.current[club.id] = element; }} data-playback-key={playbackKey}>
                  <ListeningPlayer song={club} queue={moreQueue} playing onPlay={() => activate(playbackKey)} onSelect={selectMore} onClose={closeMore} closeLabel="야구 응원가 플레이어 닫기" />
                </li>}
              </Fragment>;
            })}
          </ul>
          <a className="baseball-story__reference" href="/?view=team&type=baseball">야구 응원가 더 알아보기<ArrowUpRight size={16} aria-hidden="true" /></a>
        </section>
        <nav className="baseball-story__clubs" aria-label="구단별 응원가 아카이브">
          <h3>구단별 응원가 더 알아보기</h3>
          <ul>{KBO_TEAMS.map((team) => <li key={team.id} style={{ "--club": team.primaryColor } as CSSProperties}>
            {team.archiveHref ? <a href={team.archiveHref}>{team.shortName}<ArrowUpRight size={12} aria-hidden="true" /></a> : <span aria-label={`${team.name} 아카이브 준비 중`}>{team.shortName}</span>}
          </li>)}</ul>
        </nav>
      </div>
    </section>
  );
}
