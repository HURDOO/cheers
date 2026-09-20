import { getCheerSong } from "../../data/catalog";
import { KBO_TEAM_IDS, SIDE_CURATION } from "./eventConfig";
import type { CheerSongSource, ResolvedSideContent, Side, SongSummary } from "./eventTypes";
import { mockSongSource } from "./mockSongSource";
import { songSource } from "./songSource";

function publishedItems<T>(ids: readonly string[], resolve: (id: string) => T | undefined): T[] {
  return ids.map(resolve).filter((item): item is T => Boolean(item));
}

export function getSideContent(side: Side, source: CheerSongSource = songSource): ResolvedSideContent {
  const curation = SIDE_CURATION[side];
  return {
    mustKnowSongs: publishedItems(curation.mustKnowSongIds, (id) => source.getSong(id)),
    memorySongs: publishedItems(curation.memorySongIds, (id) => source.getSong(id)),
    lineageFamilies: publishedItems(curation.lineageFamilyIds, (id) => source.getFamily(id)),
    rivalrySongs: publishedItems(curation.rivalrySongIds, (id) => source.getSong(id)),
    baseballSongs: publishedItems(curation.baseballSongIds, (id) => source.getSong(id)),
  };
}

// The event guide keeps its curated tracks visible while unpublished records
// are being prepared. Published catalog records always take precedence.
function withEventCorrections(song: SongSummary | undefined) {
  if (!song || song.id !== "korea-university-seungni-ui-hamseong") return song;
  // The uploader's chapter marks 승리의 함성 at 18:00. The former preferred
  // video was 영원히; keep the event correct until the user republishes revision 5.
  const fieldVideo = getCheerSong(song.id)?.youtubeMediaList.find((media) => media.videoId === "f32A-jjTbjE");
  return fieldVideo ? {
    ...song,
    media: {
      kind: "youtube" as const,
      videoId: fieldVideo.videoId,
      sourceUrl: "https://www.youtube.com/watch?v=f32A-jjTbjE&t=1080s",
      startSeconds: 1080,
      title: fieldVideo.title,
      channelName: fieldVideo.channelName,
    },
  } : song;
}

const previewSongSource: CheerSongSource = {
  getSong: (id) => withEventCorrections(songSource.getSong(id) ?? mockSongSource.getSong(id)),
  getTeam: (id) => songSource.getTeam(id) ?? mockSongSource.getTeam(id),
  getFamily: (id) => songSource.getFamily(id) ?? mockSongSource.getFamily(id),
};

export function getPreviewSideContent(side: Side): ResolvedSideContent {
  return getSideContent(side, previewSongSource);
}

// The public release may cover only some clubs. Keep previews and school guides
// available without requiring every KBO organization to be published first.
export const KBO_TEAMS = publishedItems(KBO_TEAM_IDS, (id) => songSource.getTeam(id));
