export type Side = "yonsei" | "korea";

export type RelationKind =
  | "same_original"
  | "direct_adaptation"
  | "inspired_by"
  | "cheer_to_cheer_adaptation";

export type SongDataStatus = "mock" | "verified" | "historic";

export interface SongMedia {
  kind: "youtube";
  videoId: string;
  sourceUrl: string;
  startSeconds?: number;
  embeddable?: boolean;
  title?: string;
  channelName?: string;
}

export interface SongSummary {
  id: string;
  title: string;
  teamId: string;
  teamName: string;
  teamShortName: string;
  description: string;
  tags: string[];
  aliases?: string[];
  yearLabel?: string;
  usageContext?: string;
  chronologyNote?: string;
  lyrics?: string[];
  durationSeconds?: number;
  media?: SongMedia;
  archiveHref?: string;
  dataStatus: SongDataStatus;
}

export interface TeamSummary {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  archiveHref?: string;
}

export interface OriginalSongSummary {
  id: string;
  title: string;
  artist: string;
  yearLabel?: string;
}

export interface LineageMember {
  song: SongSummary;
  relationKind: RelationKind;
}

export interface LineageFamily {
  id: string;
  original: OriginalSongSummary;
  members: LineageMember[];
  note: string;
  archiveHref?: string;
}

export interface CheerSongSource {
  getSong(id: string): SongSummary | undefined;
  getTeam(id: string): TeamSummary | undefined;
  getFamily(id: string): LineageFamily | undefined;
}

export interface ScheduleItem {
  id: string;
  side: Side;
  dateTime: string;
  endDateTime: string;
  dateLabel: string;
  timeLabel: string;
  campus: string;
  venue: string;
  officialUrl?: string;
}

export interface TimelineItem {
  id: string;
  dateTime: string;
  endDateTime: string;
  dateLabel: string;
  timeLabel?: string;
  title: string;
  detail: string;
  side?: Side;
  isFinal?: boolean;
}

export interface SideCuration {
  mustKnowSongIds: string[];
  memorySongIds: string[];
  lineageFamilyIds: string[];
  rivalrySongIds: string[];
  baseballSongIds: string[];
}

export interface ResolvedSideContent {
  mustKnowSongs: SongSummary[];
  memorySongs: SongSummary[];
  lineageFamilies: LineageFamily[];
  rivalrySongs: SongSummary[];
  baseballSongs: SongSummary[];
}
