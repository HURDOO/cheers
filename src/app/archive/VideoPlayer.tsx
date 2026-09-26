import { useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import type { CheerSong } from "../../data/types";

/** 곡이 바뀌면 상태가 초기화되도록 부모에서 key={song.id}로 렌더합니다. */
export function VideoPlayer({ song }: { song: CheerSong }) {
  const mediaList = song.youtubeMediaList.filter((item) => item.availability !== "unavailable").slice(0, 5);
  const [activeId, setActiveId] = useState(mediaList[0]?.id ?? "");
  const [playing, setPlaying] = useState(false);
  const media = mediaList.find(({ id }) => id === activeId) ?? mediaList[0];

  if (!media) {
    return (
      <div className="video video--empty">
        <p>영상 준비 중</p>
        <span>현장 영상이 확인되면 이곳에서 바로 볼 수 있습니다.</span>
      </div>
    );
  }

  const params = new URLSearchParams({ autoplay: "1", playsinline: "1", rel: "0" });
  if (media.startSeconds) params.set("start", String(media.startSeconds));

  return (
    <section className="video" aria-label="영상">
      <div className="video__frame">
        {playing ? (
          <iframe
            key={media.id}
            src={`https://www.youtube-nocookie.com/embed/${media.videoId}?${params.toString()}`}
            title={`${song.title} — ${media.title}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button type="button" className="video__poster" onClick={() => setPlaying(true)} aria-label={`${media.title} 재생`}>
            <img src={`https://i.ytimg.com/vi/${media.videoId}/hqdefault.jpg`} alt="" loading="lazy" />
            <span className="video__play"><Play size={22} fill="currentColor" /></span>
          </button>
        )}
      </div>
      <div className="video__meta">
        <div>
          <p>{media.title}</p>
          <span>{media.channelName}</span>
        </div>
        <a href={media.sourceUrl} target="_blank" rel="noreferrer">
          YouTube <ExternalLink size={12} />
        </a>
      </div>
      {mediaList.length > 1 && (
        <div className="video__list" aria-label="다른 영상">
          {mediaList.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === media.id}
              onClick={() => { setActiveId(item.id); setPlaying(true); }}
            >
              <span>{index + 1}</span>
              {item.title}
            </button>
          ))}
        </div>
      )}
      {media.attributionText && <p className="video__credit">{media.attributionText}</p>}
    </section>
  );
}
