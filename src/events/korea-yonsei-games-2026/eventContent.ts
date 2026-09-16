import { KBO_TEAM_IDS, SIDE_CURATION } from "./eventConfig";
import type { CheerSongSource, ResolvedSideContent, Side } from "./eventTypes";
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

// D is a design preview: keep its curated tracks visible while unpublished
// records are being prepared. Published records always take precedence.
const previewSongSource: CheerSongSource = {
  getSong: (id) => songSource.getSong(id) ?? mockSongSource.getSong(id),
  getTeam: (id) => songSource.getTeam(id) ?? mockSongSource.getTeam(id),
  getFamily: (id) => songSource.getFamily(id) ?? mockSongSource.getFamily(id),
};

export function getPreviewSideContent(side: Side): ResolvedSideContent {
  return getSideContent(side, previewSongSource);
}

// The public release may cover only some clubs. Keep previews and school guides
// available without requiring every KBO organization to be published first.
export const KBO_TEAMS = publishedItems(KBO_TEAM_IDS, (id) => songSource.getTeam(id));
