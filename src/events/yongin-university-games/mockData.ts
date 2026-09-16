export type SchoolId = "kangnam" | "kyunghee" | "dankook" | "yongin" | "hufs";

export type EvidenceStatus = "verified" | "performance" | "event-unconfirmed" | "researching";

export interface EventSong {
  id: string;
  school: SchoolId;
  title: string;
  eyebrow: string;
  description: string;
  context: string;
  status: EvidenceStatus;
  statusLabel: string;
  original?: string;
  year?: string;
  placeholder?: boolean;
}

export interface School {
  id: SchoolId;
  code: string;
  shortName: string;
  name: string;
  campus: string;
  englishName: string;
  squad: string;
  squadNote: string;
  accent: string;
  accentSoft: string;
  ink: string;
}

export const EVENT = {
  title: "2026 용인청정대학체전",
  englishTitle: "YONGIN UNIVERSITY GAMES",
  tagline: "다섯 개의 함성, 하나의 도시.",
  date: "2026. 09. 04 FRI",
  startDate: "2026-09-04T09:00:00+09:00",
  venue: "용인아르피아 축구장",
  updatedAt: "2026. 08. 29",
} as const;

export const SCHOOL_ORDER: SchoolId[] = ["kangnam", "kyunghee", "dankook", "yongin", "hufs"];

export const SCHOOLS: Record<SchoolId, School> = {
  kangnam: {
    id: "kangnam",
    code: "KANGNAM",
    shortName: "강남",
    name: "강남대학교",
    campus: "기흥",
    englishName: "KANGNAM UNIVERSITY",
    squad: "메이화",
    squadNote: "중앙 치어리딩 동아리 · 체전 참가 여부 확인 중",
    accent: "#9FD84A",
    accentSoft: "#DDF6B8",
    ink: "#15351E",
  },
  kyunghee: {
    id: "kyunghee",
    code: "KHU INTL",
    shortName: "경희",
    name: "경희대학교",
    campus: "국제캠퍼스",
    englishName: "KYUNG HEE UNIVERSITY",
    squad: "KHURS-LA",
    squadNote: "국제캠퍼스 응원단 · 체전 참가 여부 확인 중",
    accent: "#E4384F",
    accentSoft: "#FFC5CD",
    ink: "#3A0710",
  },
  dankook: {
    id: "dankook",
    code: "DKU JUKJEON",
    shortName: "단국",
    name: "단국대학교",
    campus: "죽전캠퍼스",
    englishName: "DANKOOK UNIVERSITY",
    squad: "아스테르 × 블랙베어즈",
    squadNote: "죽전 중앙동아리 협업 · 체전 참가 여부 확인 중",
    accent: "#57A6FF",
    accentSoft: "#C5E2FF",
    ink: "#071D3A",
  },
  yongin: {
    id: "yongin",
    code: "YIU",
    shortName: "용인",
    name: "용인대학교",
    campus: "처인",
    englishName: "YONG IN UNIVERSITY",
    squad: "백호",
    squadNote: "학교 응원단 · 체전 사용곡 조사 중",
    accent: "#A878FF",
    accentSoft: "#DDCBFF",
    ink: "#1C0A3A",
  },
  hufs: {
    id: "hufs",
    code: "HUFS GLOBAL",
    shortName: "외대",
    name: "한국외국어대학교",
    campus: "글로벌캠퍼스",
    englishName: "HANKUK UNIVERSITY OF FOREIGN STUDIES",
    squad: "현장 응원팀 확인 중",
    squadNote: "아이기스는 서울캠퍼스 기반 · 직접 참가 여부 미확인",
    accent: "#27D3E2",
    accentSoft: "#B8F3F6",
    ink: "#062E34",
  },
};

export const SONGS: EventSong[] = [
  {
    id: "kangnam-to-you",
    school: "kangnam",
    title: "그대에게",
    eyebrow: "PERFORMANCE TRACK",
    description: "메이화가 학교 공식 행사에서 치어리딩 무대로 사용한 것이 확인된 곡.",
    context: "학교 고유 응원가가 아니라 실제 공연 레퍼토리로 구분해 소개합니다.",
    status: "performance",
    statusLabel: "공연 사용 확인",
    original: "무한궤도 · 그대에게",
  },
  {
    id: "kyunghee-lion",
    school: "kyunghee",
    title: "사자의 노래",
    eyebrow: "INTERNATIONAL CAMPUS ANTHEM",
    description: "경희대학교 국제캠퍼스를 대표하는 응원가. 이번 참가 캠퍼스의 정체성이 가장 선명한 곡입니다.",
    context: "2026 합동 입학식과 국제캠퍼스 춘계대동제 사용 확인.",
    status: "verified",
    statusLabel: "현행 사용 확인",
    year: "2023—2026",
  },
  {
    id: "kyunghee-we-are",
    school: "kyunghee",
    title: "우리는 경희",
    eyebrow: "2026 NEW CHEER",
    description: "KHURS-LA가 2026년 공개한 국제캠퍼스의 새로운 응원가.",
    context: "응원법 가이드와 춘계대동제 공연으로 직접 확인된 최신 레퍼토리입니다.",
    status: "verified",
    statusLabel: "2026 신곡 확인",
    year: "2026",
  },
  {
    id: "kyunghee-all-for-one",
    school: "kyunghee",
    title: "All For One",
    eyebrow: "ONE KYUNG HEE",
    description: "서울과 국제캠퍼스를 함께 묶는 경희대학교의 결속 응원가.",
    context: "양 캠퍼스 공식 공연에서 2026년까지 사용이 확인됐습니다.",
    status: "verified",
    statusLabel: "양 캠퍼스 사용 확인",
    year: "2019—2026",
  },
  {
    id: "dankook-roar",
    school: "dankook",
    title: "단국의 함성",
    eyebrow: "JUKJEON CAMPUS ORIGINAL",
    description: "죽전캠퍼스 블랙베어즈가 만들고 아스테르가 안무와 공연에 참여한 학교 응원곡.",
    context: "2025 홈커밍까지 사용 확인. 2026 체전 사용 여부는 별도 확인 중입니다.",
    status: "verified",
    statusLabel: "죽전 제작곡 확인",
    year: "2024—2025",
  },
  {
    id: "yongin-pending",
    school: "yongin",
    title: "현장 사용곡 공개 대기",
    eyebrow: "FIELD NOTE 01",
    description: "응원단 백호의 존재와 외부 공연은 확인됐지만, 이번 체전에서 사용할 곡은 아직 공개되지 않았습니다.",
    context: "행사 당일 실제 세트리스트를 기록해 첫 아카이브를 완성합니다.",
    status: "researching",
    statusLabel: "조사 중",
    placeholder: true,
  },
  {
    id: "hufs-world",
    school: "hufs",
    title: "외대여 세계로, 세계여 외대로",
    eyebrow: "HUFS CHEER ARCHIVE",
    description: "질풍가도를 원곡으로 한 한국외대의 현행 대표 응원가 중 하나.",
    context: "서울캠퍼스 아이기스 사용곡이며 글로벌캠퍼스 체전 사용 여부는 확인 중입니다.",
    status: "event-unconfirmed",
    statusLabel: "체전 사용 미확인",
    original: "유정석 · 질풍가도",
    year: "2023—2026",
  },
  {
    id: "hufs-you",
    school: "hufs",
    title: "너, 우리 (You HUFS)",
    eyebrow: "HUFS ORIGINAL",
    description: "한국외대를 상징하도록 제작되어 여러 공식 응원 무대에서 이어진 고유 응원가.",
    context: "서울캠퍼스 공식 자료 기반. 글로벌캠퍼스 현장 사용은 별도 확인이 필요합니다.",
    status: "event-unconfirmed",
    statusLabel: "체전 사용 미확인",
    year: "2021—2026",
  },
  {
    id: "hufs-dream",
    school: "hufs",
    title: "외대의 꿈",
    eyebrow: "2026 NEW CHEER",
    description: "코요태의 우리의 꿈을 원곡으로 한 2026년 한국외대 응원가.",
    context: "2026 신입생 환영회와 상반기 퀸쿠아트리아 사용 확인.",
    status: "event-unconfirmed",
    statusLabel: "체전 사용 미확인",
    original: "코요태 · 우리의 꿈",
    year: "2026",
  },
];

export const PROGRAMS = [
  { index: "01", label: "FOOTBALL", name: "축구", note: "메인 경기", state: "official" },
  { index: "02", label: "TUG OF WAR", name: "전략 줄다리기", note: "팀 전략 종목", state: "official" },
  { index: "03", label: "CHEER BATTLE", name: "대학 응원전", note: "세부 규칙 공개 대기", state: "pending" },
  { index: "04", label: "YOUTH QUIZ", name: "청년정책 퀴즈", note: "정책 프로그램", state: "official" },
] as const;

export const TIMELINE = [
  { year: "2025", title: "청년의 아이디어", copy: "YU-Polympics 제안이 정책사업의 출발점이 됐습니다." },
  { year: "2026.05", title: "다섯 대학의 합류", copy: "학생대표가 참여하는 대학연합 TF가 행사 방향을 함께 설계했습니다." },
  { year: "2026.09.04", title: "첫 번째 함성", copy: "용인 다섯 대학의 스포츠와 응원이 처음 한자리에 모입니다." },
] as const;
