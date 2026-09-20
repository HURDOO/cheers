import type { Side, SongSummary } from "../korea-yonsei-games-2026/eventTypes";

interface BaseballConnection {
  campusId: string;
  campusTitle?: string;
  clubId: string;
  kind: "adaptation" | "shared" | "pending";
}

// D-only curation. Research and the distinction between the two 고연가 songs:
// research/batches/2026-09-05-korea-yonsei-games-2026/2026-09-07-d-baseball-followup.md
export const BASEBALL_CONNECTIONS: Record<Side, BaseballConnection[]> = {
  korea: [
    { campusId: "korea-university-forever", clubId: "lg-twins-seungni-ui-norae", kind: "adaptation" },
    { campusId: "korea-university-godaereul-noraehara", campusTitle: "고연가 — 고대를 노래하라", clubId: "kia-tigers-kiareul-eungwonhara", kind: "adaptation" },
    { campusId: "korea-university-godaereul-saranghara", clubId: "ssg-landers-tuhon-ui-landers", kind: "shared" },
    { campusId: "korea-university-yeongwonhara", clubId: "lotte-giants-sori-nop-yeo-oechyeoboja", kind: "adaptation" },
    { campusId: "korea-university-deureora-boara-geurigo-gieokhara", clubId: "kt-wiz-seungnireul-wihayeo", kind: "pending" },
  ],
  yonsei: [
    { campusId: "yonsei-university-haeya", clubId: "doosan-bears-haeya", kind: "shared" },
    { campusId: "yonsei-university-seosi", clubId: "kia-tigers-lineup-song", kind: "shared" },
    { campusId: "yonsei-university-badasae", clubId: "lotte-giants-badasae", kind: "shared" },
    { campusId: "yonsei-university-j-ege", clubId: "ssg-landers-j-ege", kind: "shared" },
  ],
};

// Supplemental preview cards do not publish new catalog songs or video slots.
// Approved songs (including 기아를 응원하라) are resolved from the catalog instead.
export const BASEBALL_PREVIEW_SONGS: Record<string, SongSummary> = {
  "korea-university-godaereul-saranghara": {
    id: "korea-university-godaereul-saranghara",
    title: "고연가 — 고대를 사랑하라",
    teamId: "korea-university", teamName: "고려대학교", teamShortName: "고려",
    description: "이루마의 Kiss the Rain을 바탕으로 한 고연가.",
    tags: ["고연가", "같은 원곡"], dataStatus: "mock",
  },
  "ssg-landers-tuhon-ui-landers": {
    id: "ssg-landers-tuhon-ui-landers", title: "투혼의 랜더스",
    teamId: "ssg-landers", teamName: "SSG 랜더스", teamShortName: "SSG",
    description: "고대를 사랑하라와 이루마의 Kiss the Rain 선율을 공유합니다.",
    tags: ["고려대 연결", "같은 원곡"], dataStatus: "mock",
    media: { kind: "youtube", videoId: "zPGEpmBj4iw", startSeconds: 831,
      sourceUrl: "https://www.youtube.com/watch?v=zPGEpmBj4iw", channelName: "SSG랜더스" },
  },
  "kia-tigers-lineup-song": {
    id: "kia-tigers-lineup-song", title: "라인업송",
    teamId: "kia-tigers", teamName: "KIA 타이거즈", teamShortName: "KIA",
    description: "연세대 서시와 베토벤 바이러스 계열 선율을 공유합니다.",
    tags: ["연세대 연결", "같은 원곡"], dataStatus: "mock",
    media: { kind: "youtube", videoId: "l7XROs9lYSo", startSeconds: 22, embeddable: false,
      sourceUrl: "https://www.youtube.com/watch?v=l7XROs9lYSo", channelName: "기아타이거즈 KIA TIGERS" },
  },
};
