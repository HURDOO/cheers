export type TeamType = "baseball" | "university";
export type RecordStatus = "draft" | "verified";

export interface SourceReference {
  label: string;
  url: string;
  scope?: "title" | "origin" | "chronology" | "usage";
}

export type YouTubeMediaRole =
  | "official-audio"
  | "official-performance"
  | "stadium-recording"
  | "reference";

export type YouTubeChannelType =
  | "rights-holder"
  | "team-official"
  | "school-official"
  | "fan";

export type YouTubeMediaAvailability = "unchecked" | "playable" | "unavailable";

export interface YouTubeMedia {
  id: string;
  cheerSongId: string;
  videoId: string;
  title: string;
  channelName: string;
  channelType: YouTubeChannelType;
  role: YouTubeMediaRole;
  sourceUrl: string;
  preferred: boolean;
  availability: YouTubeMediaAvailability;
  startSeconds?: number;
  durationSeconds?: number;
  checkedAt?: string;
  /** 차기 스키마에서 사용자가 정한 1~5 표시 순서입니다. */
  rank?: number;
  /** 화면에 그대로 표시할 선택적 출처·크레딧 문구입니다. */
  attributionText?: string;
}

export interface QuickFact {
  label: string;
  value: string;
}

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  type: TeamType;
  region: string;
  colors: {
    primary: string;
    secondary: string;
  };
}

export interface OriginalSong {
  id: string;
  title: string;
  artist: string;
  kind?: "source" | "commissioned";
  year: number | null;
  yearLabel?: string;
  genre?: string | null;
  country?: string | null;
  status: RecordStatus;
  sources?: SourceReference[];
}

export type CheerSongYearStatus =
  | "confirmed"
  | "earliest-documented"
  | "reported";

export type CheerSongOriginType =
  | "adaptation"
  | "arrangement"
  | "combined-adaptation"
  | "commissioned-original";

export interface CheerSongRecord {
  id: string;
  title: string;
  aliases: string[];
  /** 카드에 표시할 승인된 두 줄짜리 상징문구입니다. */
  symbolicLines: string[];
  teamId: string;
  originalSongId: string;
  secondaryOriginalSongIds?: string[];
  sourceCheerSongId?: string;
  originType: CheerSongOriginType;
  originNote: string;
  /** 확정 도입 연도. 정확한 연도가 불명확하면 null입니다. */
  year: number | null;
  /** 연도별 보기에서 사용할 확인·추정 기준 연도입니다. */
  timelineYear: number;
  yearStatus: CheerSongYearStatus;
  yearLabel: string;
  chronologyNote: string;
  durationSeconds?: number;
  /** 전체 가사를 줄 단위로 저장합니다. */
  lyrics: string[];
  description: string;
  /** 차기 스키마의 소개·사용 맥락·TMI 통합 본문입니다. */
  descriptionText?: string;
  usageContext: string;
  quickFacts?: QuickFact[];
  status: RecordStatus;
  sources?: SourceReference[];
}

/** UI가 바로 사용할 수 있도록 팀 정보를 결합한 응원가 레코드입니다. */
export interface CheerSong extends CheerSongRecord {
  abbr: string;
  team: string;
  teamType: TeamType;
  teamColor: string;
  teamColorAlt: string;
  region: string;
  duration: number | null;
  lyricLine1: string;
  lyricLine2: string;
  symbolicLine1: string;
  symbolicLine2: string;
  youtubeMedia?: YouTubeMedia;
  youtubeMediaList: YouTubeMedia[];
}

export interface CatalogFile<T> {
  schemaVersion: 1;
  items: T[];
}
