export type TeamType = "baseball" | "university";
export type RecordStatus = "draft" | "verified";

export interface SourceReference {
  label: string;
  url: string;
}

export interface AudioAsset {
  url: string;
  credit: string;
  licenseUrl?: string;
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
  year: number;
  genre: string;
  country: string;
  status: RecordStatus;
  sources: SourceReference[];
}

export interface CheerSongRecord {
  id: string;
  title: string;
  teamId: string;
  originalSongId: string;
  year: number;
  durationSeconds: number;
  lyrics: string[];
  description: string;
  status: RecordStatus;
  sources: SourceReference[];
  audio?: AudioAsset;
}

/** UI가 바로 사용할 수 있도록 팀 정보를 결합한 응원가 레코드입니다. */
export interface CheerSong extends CheerSongRecord {
  abbr: string;
  team: string;
  teamType: TeamType;
  teamColor: string;
  teamColorAlt: string;
  region: string;
  duration: number;
  lyricLine1: string;
  lyricLine2: string;
}

export interface CatalogFile<T> {
  schemaVersion: 1;
  items: T[];
}

