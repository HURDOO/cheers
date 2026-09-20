import { catalogSongSource } from "../korea-yonsei-games-2026/catalogSongSource";
import { BASEBALL_CONNECTIONS } from "../korea-yonsei-games-2026-d/baseballConnections";

export interface VideoClip {
  id: string;
  label: string;
  title: string;
  videoId: string;
  startSeconds?: number;
  sourceUrl: string;
  credit: string;
  archiveSongId?: string;
}

// Fixed event-preview clips from the published catalog, D, and its existing research.
// This does not change canonical archive video selections or publication state.
function preview(clip: Omit<VideoClip, "sourceUrl">): VideoClip {
  const { videoId, startSeconds } = clip;
  return { ...clip, sourceUrl: `https://www.youtube.com/watch?v=${videoId}${startSeconds ? `&t=${startSeconds}s` : ""}` };
}

export function archiveHref(songId?: string) {
  return songId ? catalogSongSource.getSong(songId)?.archiveHref : undefined;
}

export const familiarPairs = [
  {
    id: "hanwha-yonsei", school: "yonsei", direction: "baseball-to-campus", relation: "같은 원곡",
    baseball: preview({ id: "hanwha-saranghanda-intro", label: "한화 이글스", title: "사랑한다 이글스", videoId: "hZ66kWereec", credit: "은최", archiveSongId: "hanwha-eagles-saranghanda-eagles" }),
    campus: preview({ id: "yonsei-haneul-intro", label: "연세대학교", title: "하늘 끝까지", videoId: "epthGnKmHCU", startSeconds: 429, credit: "디카츄 · 2022 합동응원", archiveSongId: "yonsei-university-haneul-kkeutkkaji" }),
  },
  {
    id: "korea-lg", school: "korea", direction: "campus-to-baseball", relation: "고려대 응원가 차용",
    campus: preview({ id: "korea-aria-intro", label: "고려대학교", title: "민족의 아리아", videoId: "NyGY9kQzO04", startSeconds: 177, credit: "Cheerss 치얼쓰 · 2023 입실렌티", archiveSongId: "korea-university-minjogui-aria" }),
    baseball: preview({ id: "lg-seoul-aria-intro", label: "LG 트윈스", title: "서울의 아리아", videoId: "Y-cBDnUl5k4", startSeconds: 1451, credit: "LGTWINSTV", archiveSongId: "lg-twins-seoul-ui-aria" }),
  },
] as const;

const EXTRA_MEDIA: Record<string, { baseball: VideoClip; campus: VideoClip }> = {
  "lg-twins-seungni-ui-norae": {
    baseball: preview({ id: "lg-seungni-extra", label: "LG 트윈스", title: "승리의 노래", videoId: "Y-cBDnUl5k4", startSeconds: 1287, credit: "LGTWINSTV", archiveSongId: "lg-twins-seungni-ui-norae" }),
    campus: preview({ id: "korea-forever-extra", label: "고려대학교", title: "Forever", videoId: "ue2aWHrw4d8", startSeconds: 5, credit: "디카츄 · 2024 합동응원 OT", archiveSongId: "korea-university-forever" }),
  },
  "kia-tigers-kiareul-eungwonhara": {
    baseball: preview({ id: "kia-kiareul-extra", label: "KIA 타이거즈", title: "기아를 응원하라", videoId: "ZEPS5Bm3iqc", startSeconds: 1339, credit: "기아타이거즈 KIA TIGERS", archiveSongId: "kia-tigers-kiareul-eungwonhara" }),
    campus: preview({ id: "korea-noraehara-extra", label: "고려대학교 · 고연가", title: "고대를 노래하라", videoId: "n4oLtwjhTfI", credit: "고려대학교 응원단", archiveSongId: "korea-university-godaereul-noraehara" }),
  },
  "ssg-landers-tuhon-ui-landers": {
    baseball: preview({ id: "ssg-tuhon-extra", label: "SSG 랜더스", title: "투혼의 랜더스", videoId: "zPGEpmBj4iw", startSeconds: 831, credit: "SSG랜더스", archiveSongId: "ssg-landers-tuhon-ui-landers" }),
    campus: preview({ id: "korea-saranghara-extra", label: "고려대학교 · 고연가", title: "고대를 사랑하라", videoId: "0hoS4tD3INs", credit: "고려대학교 응원단", archiveSongId: "korea-university-godaereul-saranghara" }),
  },
  "lotte-giants-sori-nop-yeo-oechyeoboja": {
    baseball: preview({ id: "lotte-sori-extra", label: "롯데 자이언츠", title: "소리 높여 외쳐보자", videoId: "AtyqKrWmvGE", startSeconds: 365, credit: "Giants TV · 2026 팀 응원가", archiveSongId: "lotte-giants-sori-nop-yeo-oechyeoboja" }),
    campus: preview({ id: "korea-yeongwonhara-extra", label: "고려대학교", title: "영원하라", videoId: "AnLm-gnWA9c", startSeconds: 263, credit: "디카츄 · 2024 입실렌티", archiveSongId: "korea-university-yeongwonhara" }),
  },
  "doosan-bears-haeya": {
    baseball: preview({ id: "doosan-haeya-extra", label: "두산 베어스", title: "해야", videoId: "Hr8ER2a_YbY", credit: "BEARS TV", archiveSongId: "doosan-bears-haeya" }),
    campus: preview({ id: "yonsei-haeya-extra", label: "연세대학교", title: "해야", videoId: "kaoZ_oPuTQo", credit: "아카라카TV", archiveSongId: "yonsei-university-haeya" }),
  },
  "kia-tigers-lineup-song": {
    baseball: preview({ id: "kia-lineup-extra", label: "KIA 타이거즈", title: "라인업송", videoId: "l7XROs9lYSo", startSeconds: 22, credit: "기아타이거즈 KIA TIGERS", archiveSongId: "kia-tigers-lineup-song" }),
    campus: preview({ id: "yonsei-seosi-extra", label: "연세대학교", title: "서시", videoId: "sHZY36KlQn8", credit: "연세대학교 응원단", archiveSongId: "yonsei-university-seosi" }),
  },
  "lotte-giants-badasae": {
    baseball: preview({ id: "lotte-badasae-extra", label: "롯데 자이언츠", title: "바다새", videoId: "AtyqKrWmvGE", startSeconds: 1916, credit: "Giants TV · 2026 팀 응원가", archiveSongId: "lotte-giants-badasae" }),
    campus: preview({ id: "yonsei-badasae-extra", label: "연세대학교", title: "바다새", videoId: "QtzesPt6W2M", credit: "아카라카TV", archiveSongId: "yonsei-university-badasae" }),
  },
  "ssg-landers-j-ege": {
    baseball: preview({ id: "ssg-j-ege-extra", label: "SSG 랜더스 · 2026 공식 응원가", title: "J에게", videoId: "zPGEpmBj4iw", startSeconds: 1432, credit: "SSG랜더스", archiveSongId: "ssg-landers-j-ege" }),
    campus: preview({ id: "yonsei-j-ege-extra", label: "연세대학교 · 2024 합동 응원 OT", title: "J에게", videoId: "YP5jUhsqjfM", startSeconds: 9, credit: "Cheerss 치얼쓰", archiveSongId: "yonsei-university-j-ege" }),
  },
};

// D's two-school curation yields eight supported cards after omitting its pending link.
export const extraConnections = (["korea", "yonsei"] as const).flatMap((school) =>
  BASEBALL_CONNECTIONS[school].filter((connection) => connection.kind !== "pending").flatMap((connection) => {
    const media = EXTRA_MEDIA[connection.clubId];
    return media ? [{ id: connection.clubId, school, relation: connection.kind === "adaptation" ? "대학 응원가 차용" : "같은 원곡", ...media }] : [];
  }),
);

export const campusPerformances = [
  preview({ id: "korea-forever-performance", label: "고려대학교 · 2026 입실렌티", title: "Forever", videoId: "C8jjjhSHK18", startSeconds: 154, credit: "2026 입실렌티 현장", archiveSongId: "korea-university-forever" }),
  preview({ id: "yonsei-seosi-performance", label: "연세대학교 · 2025 합동응원", title: "서시", videoId: "CNDcUtNrIkI", startSeconds: 986, credit: "디카츄의 사진창고", archiveSongId: "yonsei-university-seosi" }),
] as const;

export const rivalryPerformances = [
  { school: "yonsei", note: "연세대학교 → 고려대학교", line: "자 이제 우리가 너희들을 깐다~ 어디? 저기!", clip: preview({ id: "yonsei-woo", label: "연세대학교 → 고려대학교", title: "Woo", videoId: "Tbex2Oh9YqM", credit: "디카츄 · 2026 고대·연대 합동응원", archiveSongId: "yonsei-university-woo" }) },
  { school: "korea", note: "고려대학교 → 연세대학교", line: "이러다 새되겠네 연세, 우리는 잘나가는 고대!", clip: preview({ id: "korea-kkureora", label: "고려대학교 → 연세대학교", title: "꿇어라 연세", videoId: "qSIfnhQHDvE", startSeconds: 216, credit: "디카츄 · 2026 고대 신입생 응원 OT", archiveSongId: "korea-university-kkureora-yonsei" }) },
] as const;

export const rivalryReplies = [
  { school: "korea", note: "고려대학교 → 연세대학교", line: "연세치킨 한마리 튀겨주세요! 바삭바삭하게 튀겨주세요!", clip: preview({ id: "korea-yonsei-chicken", label: "고려대학교 → 연세대학교", title: "연세치킨", videoId: "eQF797kE5E8", credit: "KUTV", archiveSongId: "korea-university-yonsei-chicken" }) },
  { school: "yonsei", note: "연세대학교 → 고려대학교", line: "츄 고양이들 너무 귀여워! 야옹야옹 하는 것도 귀여워!", clip: preview({ id: "yonsei-goyangi-sound", label: "연세대학교 → 고려대학교", title: "고양이 SOUND", videoId: "fkELbEKZhhg", credit: "KODA", archiveSongId: "yonsei-university-goyangi-sound" }) },
] as const;
