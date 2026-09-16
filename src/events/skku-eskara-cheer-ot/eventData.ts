export type CheerTag =
  | "대표곡"
  | "떼창"
  | "구호"
  | "입문 추천"
  | "피날레"
  | "오프닝"
  | "어깨동무"
  | "점프"
  | "2026 신곡";

export type TrackEvidence =
  | "official-2026"
  | "official-2025"
  | "brief-mock"
  | "spring-ot";

export interface TrackMedia {
  videoId: string;
  startSeconds: number;
  endSeconds?: number;
  sourceTitle: string;
  sourceUrl: string;
}

/**
 * 이벤트 전용 곡 모델입니다.
 * 정식 카탈로그에 곡이 승인되면 catalogSongId만 채워 상세 페이지와 연결합니다.
 */
export interface EventTrack {
  id: string;
  title: string;
  yearLabel?: string;
  description: string;
  tags: CheerTag[];
  evidence: TrackEvidence;
  evidenceLabel: string;
  catalogSongId?: string;
  media?: TrackMedia;
}

export const EVENT = {
  title: "2026 ESKARA 응원 OT",
  eyebrow: "2026 ESKARA CHEER OT",
  tagline: "9월 4일, 아는 만큼 더 크게 뛴다.",
  date: "2026. 09. 04 FRI",
  startDate: "2026-09-04T00:00:00+09:00",
  campus: "자연과학캠퍼스",
  venue: "수성관 주경기장",
  scale: "1,500명 규모",
  expandedSongCount: "21곡 확대 개편",
  updatedAt: "2026. 09. 02",
  instagramUrl: "https://www.instagram.com/skku_cheerleaders/",
  linktreeUrl: "https://linktr.ee/kinggocheerleader",
  officialUpdateUrl: "https://www.instagram.com/p/DcvWt6EtbgA/",
  teaserUrl: "https://www.instagram.com/reel/DcqBsuePrPk/",
} as const;

const OFFICIAL_2026_MIX = {
  videoId: "pGRrsJsPMe4",
  sourceTitle: "2026 문행대동제 성균관대 응원가 모음",
  sourceUrl: "https://www.youtube.com/watch?v=pGRrsJsPMe4",
} as const;

const OFFICIAL_2025_MIX = {
  videoId: "fTeHh_EvuVw",
  sourceTitle: "2025 ESKARA 킹고응원단 응원가 14곡 모음",
  sourceUrl: "https://www.youtube.com/watch?v=fTeHh_EvuVw",
} as const;

function media2026(startSeconds: number, endSeconds?: number): TrackMedia {
  return { ...OFFICIAL_2026_MIX, startSeconds, endSeconds };
}

function media2025(startSeconds: number, endSeconds?: number): TrackMedia {
  return { ...OFFICIAL_2025_MIX, startSeconds, endSeconds };
}

export const TRACKS: EventTrack[] = [
  {
    id: "kinggo-hamseong",
    title: "킹고인의 함성",
    description: "처음 듣는 사람도 후렴의 힘을 바로 느낄 수 있는 대표 떼창.",
    tags: ["대표곡", "떼창"],
    evidence: "official-2026",
    evidenceLabel: "2026 공식 영상",
    media: media2026(129, 263),
  },
  {
    id: "seonggyuneul-goharira",
    title: "성균을 고하리라",
    description: "묵직하게 시작해 관중의 목소리가 한 덩어리로 커지는 응원가.",
    tags: ["구호", "대표곡"],
    evidence: "official-2026",
    evidenceLabel: "2026 공식 영상",
    media: media2026(1184, 1330),
  },
  {
    id: "yeomyeong",
    title: "여명",
    description: "천천히 쌓아 올리는 도입과 큰 후렴을 먼저 익혀두기 좋은 곡.",
    tags: ["입문 추천", "어깨동무"],
    evidence: "official-2026",
    evidenceLabel: "2026 공식 영상",
    media: media2026(263, 405),
  },
  {
    id: "seongdaereul-joahae",
    title: "성대를 좋아해",
    description: "짧고 친근한 후렴으로 현장에서 가장 빠르게 따라가기 좋은 곡.",
    tags: ["입문 추천", "떼창"],
    evidence: "official-2026",
    evidenceLabel: "2026 공식 영상",
    media: media2026(629, 757),
  },
  {
    id: "seungnireul-wihayeo",
    title: "승리를 위하여",
    yearLabel: "2016",
    description: "리듬과 구호가 선명해 응원석의 에너지를 한 번에 끌어올리는 곡.",
    tags: ["점프", "구호"],
    evidence: "official-2026",
    evidenceLabel: "2026 공식 영상",
    media: media2026(1330, 1468),
  },
  {
    id: "uriga-nugu",
    title: "우리가 누구",
    description: "선창과 답이 명확해 현장에서 소속감을 크게 만드는 구호형 응원가.",
    tags: ["구호", "피날레"],
    evidence: "official-2026",
    evidenceLabel: "2026 공식 영상",
    media: media2026(1468, 1600),
  },
  {
    id: "chuljeong",
    title: "출정",
    description: "첫 박자부터 분위기를 끌어올리는 강한 오프닝·피날레 성격의 곡.",
    tags: ["오프닝", "피날레"],
    evidence: "official-2026",
    evidenceLabel: "2026 공식 영상",
    media: media2026(0, 129),
  },
  {
    id: "seongdaereul-saranghae",
    title: "성대를 사랑해",
    description: "성균인을 향한 애정을 밝고 경쾌하게 풀어낸 응원가.",
    tags: ["떼창", "입문 추천"],
    evidence: "official-2026",
    evidenceLabel: "2026 공식 영상",
    media: media2026(405, 516),
  },
  {
    id: "hamseong",
    title: "함성",
    description: "짧은 호흡과 반복되는 에너지로 응원석의 밀도를 높이는 곡.",
    tags: ["구호", "점프"],
    evidence: "official-2025",
    evidenceLabel: "2025 공식 영상",
    media: media2025(592, 769),
  },
  {
    id: "seonggyunga",
    title: "성균가",
    description: "성균관대 고유곡으로 조사된 전통 레퍼토리. 정식 자료 연결을 준비 중입니다.",
    tags: ["대표곡"],
    evidence: "brief-mock",
    evidenceLabel: "기획 데이터",
  },
  {
    id: "geudae-naui-seonggyun",
    title: "그대 나의 성균",
    description: "학교와 사람에 대한 애정을 서정적으로 이어가는 성균관대 응원가.",
    tags: ["어깨동무", "떼창"],
    evidence: "official-2025",
    evidenceLabel: "2025 공식 영상",
    media: media2025(1140, 1309),
  },
  {
    id: "chanran",
    title: "찬란",
    yearLabel: "2026 · NEW",
    description: "성균인의 청춘을 노래하는 2026년의 새로운 응원가.",
    tags: ["2026 신곡", "떼창"],
    evidence: "official-2026",
    evidenceLabel: "2026 공식 영상",
    media: media2026(516, 629),
  },
  {
    id: "gyeolui",
    title: "결의",
    description: "대화에서 정리된 성균관대 응원곡 후보. 정식 출처와 미디어를 연결할 예정입니다.",
    tags: ["구호"],
    evidence: "brief-mock",
    evidenceLabel: "기획 데이터",
  },
  {
    id: "minjogui-oechim",
    title: "민족의 외침",
    description: "대화에서 정리된 성균관대 응원곡 후보. 정식 출처와 미디어를 연결할 예정입니다.",
    tags: ["떼창"],
    evidence: "brief-mock",
    evidenceLabel: "기획 데이터",
  },
];

const trackById = new Map(TRACKS.map((track) => [track.id, track]));

export const QUICK_TRACK_IDS = [
  "kinggo-hamseong",
  "seonggyuneul-goharira",
  "yeomyeong",
  "seongdaereul-joahae",
  "seungnireul-wihayeo",
  "uriga-nugu",
  "chuljeong",
] as const;

export const QUICK_TRACKS = QUICK_TRACK_IDS.map((id) => trackById.get(id)!);

export const NEW_CHEER = trackById.get("chanran")!;

export interface PastOtTrack {
  id: string;
  title: string;
  note: string;
  media?: TrackMedia;
}

export const PAST_OT_TRACKS: PastOtTrack[] = [
  { id: "red-sunset", title: "붉은 노을", note: "2026 상반기 OT 등장곡", media: media2026(804, 1004) },
  { id: "art", title: "예술이야", note: "2026 상반기 OT 등장곡", media: media2026(1004, 1184) },
  { id: "some-day-21c", title: "21세기의 어떤 날", note: "2026 상반기 OT 피날레" },
  { id: "isnt-it-good", title: "좋지 아니한가", note: "2026 상반기 OT 피날레" },
];

export const TIMELINE = [
  { year: "2025", title: "새로운 형태의 응원 OT 시작" },
  { year: "2026.03", title: "상반기 응원 OT" },
  { year: "2026.09.04", title: "ESKARA 응원 OT" },
] as const;

export function formatDuration(media?: TrackMedia) {
  if (!media?.endSeconds) return "준비 중";
  const duration = media.endSeconds - media.startSeconds;
  return `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`;
}
