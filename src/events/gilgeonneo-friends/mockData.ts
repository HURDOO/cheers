export type SchoolId = "konkuk" | "sejong";

export type CheerCategory =
  | "공식 응원가"
  | "응원단 응원곡"
  | "교가/학생가"
  | "스포츠 응원"
  | "확인 중";

export interface EventCheerMock {
  id: string;
  school: SchoolId;
  title: string;
  category: CheerCategory;
  eyebrow: string;
  description: string;
  lyricPreview: [string, string];
  useMoment: string;
  videoLabel: string;
  status: "known" | "mock";
  original?: {
    title: string;
    artist: string;
    label: "원곡" | "학교곡";
  };
}

export const EVENT = {
  title: "우린, 길건너 친구들",
  dateRange: "2026. 09. 18 — 09. 19",
  startDate: "2026-09-18T18:30:00+09:00",
  tagline: "길 하나를 사이에 둔 두 학교, 첫 대항전을 앞두고 응원부터 알아보자.",
  updatedAt: "2026. 08. 28",
  notice: "OX-K와 IGNIS의 행사 참여 및 응원가 세트리스트는 아직 공식 발표 전입니다.",
} as const;

export const SCHOOLS = {
  konkuk: {
    id: "konkuk" as const,
    shortName: "건국",
    name: "건국대학교",
    englishName: "KONKUK UNIVERSITY",
    mark: "KU",
  },
  sejong: {
    id: "sejong" as const,
    shortName: "세종",
    name: "세종대학교",
    englishName: "SEJONG UNIVERSITY",
    mark: "SJ",
  },
} as const;

export const MOCK_CHEERS: EventCheerMock[] = [
  {
    id: "konkuk-forever",
    school: "konkuk",
    title: "건국과 영원히",
    category: "공식 응원가",
    eyebrow: "MAIN CHEER",
    description: "2024년에 공개된 건국대학교의 메인 응원가. 떼창과 구호가 많은 구조로 소개됐다.",
    lyricPreview: ["대표 가사 연결 예정", "구호 타이밍 연결 예정"],
    useMoment: "이번 대항전에서 먼저 익혀둘 건국대 응원가로 배치한 mock 카드입니다.",
    videoLabel: "공식 가사 영상 연결 예정",
    status: "known",
    original: {
      title: "슈퍼히어로",
      artist: "이승환",
      label: "원곡",
    },
  },
  {
    id: "victory-aria",
    school: "konkuk",
    title: "승리의 아리아",
    category: "공식 응원가",
    eyebrow: "VICTORY ANTHEM",
    description: "클래식 선율을 록과 성악의 두 버전으로 풀어낸 건국대학교의 승리 앤섬.",
    lyricPreview: ["대표 가사 연결 예정", "현장 구호 연결 예정"],
    useMoment: "경기 전후나 분위기를 크게 끌어올리는 순간을 상정한 mock 설명입니다.",
    videoLabel: "공식 음원 연결 예정",
    status: "known",
    original: {
      title: "G선상의 아리아",
      artist: "J. S. Bach",
      label: "원곡",
    },
  },
  {
    id: "sejong-school-song",
    school: "sejong",
    title: "세종대학교 교가",
    category: "교가/학생가",
    eyebrow: "SCHOOL SONG",
    description: "학교 노래는 존재하지만 실제 응원가와는 구분해서 보여줘야 한다.",
    lyricPreview: ["교가 가사 연결 예정", "응원 사용 여부 확인 중"],
    useMoment: "응원가가 확정될 때까지 학교 노래의 위치를 설명하기 위한 mock 카드입니다.",
    videoLabel: "학교 공식 자료 연결 예정",
    status: "known",
    original: {
      title: "세종대학교 교가",
      artist: "작사 주영하 · 작곡 현제명",
      label: "학교곡",
    },
  },
  {
    id: "ignis-stage-medley",
    school: "sejong",
    title: "IGNIS 응원 메들리",
    category: "확인 중",
    eyebrow: "MOCK PLACEHOLDER",
    description: "IGNIS의 실제 사용곡과 행사 세트리스트를 연결하기 위한 자리 표시자입니다.",
    lyricPreview: ["실사용 곡 확인 중", "공식 발표 후 교체"],
    useMoment: "실제 곡으로 오해하지 않도록 운영 데이터와 분리한 개발용 mock입니다.",
    videoLabel: "응원단 공연 영상 연결 예정",
    status: "mock",
  },
  {
    id: "sejong-kings-call",
    school: "sejong",
    title: "세종! 킹스!",
    category: "스포츠 응원",
    eyebrow: "BASEBALL CULTURE",
    description: "세종킹스에서 확인되는 짧은 콜 앤 리스폰스. 학교 공식 응원단 곡과는 별개다.",
    lyricPreview: ["세종!", "킹스!"],
    useMoment: "세종대 안에 이미 존재하던 스포츠 응원문화를 보여주는 사이드 스토리입니다.",
    videoLabel: "현장 자료 연결 예정",
    status: "known",
  },
];

export const EVENT_PHASES = [
  {
    index: "01",
    label: "스포츠 예선",
    date: "09. 01 — 09. 18",
    description: "종목별 세부 경기 일시는 참가자용 매뉴얼과 후속 공지를 기준으로 업데이트합니다.",
  },
  {
    index: "02",
    label: "거리전야제",
    date: "09. 18 · 18:30—23:50",
    description: "건대입구와 화양동 일대에서 양교 학생 교류 프로그램과 거리 이벤트가 열립니다.",
  },
  {
    index: "03",
    label: "스포츠 결선",
    date: "09. 19",
    description: "첫해 대항전의 승부가 결정되는 결선. 세부 대진과 시간은 공식 발표 후 반영합니다.",
  },
] as const;

export const SPORTS = ["축구", "농구", "배드민턴", "e스포츠"] as const;

export const ORIGINAL_CARDS = [
  {
    index: "SRC 01",
    title: "슈퍼히어로",
    artist: "이승환",
    relation: "건국과 영원히의 원곡",
    tone: "green",
  },
  {
    index: "SRC 02",
    title: "G선상의 아리아",
    artist: "J. S. Bach",
    relation: "승리의 아리아의 기반 선율",
    tone: "gold",
  },
  {
    index: "SRC 03",
    title: "세종대학교 교가",
    artist: "주영하 · 현제명",
    relation: "응원가와 구분되는 학교곡",
    tone: "red",
  },
] as const;
