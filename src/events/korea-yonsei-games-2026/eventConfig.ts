import type { ScheduleItem, Side, SideCuration, TimelineItem } from "./eventTypes";
import eventCuration from "./eventCuration.json";

export const EVENT = {
  title: "2026 정기 연고전 · 고연전",
  startDate: "2026-10-02T00:00:00+09:00",
  endDate: "2026-10-03T23:59:59+09:00",
  updatedAt: "2026. 09. 07",
  archiveHref: "/",
} as const;

export const SIDE_META = {
  yonsei: {
    name: "연세대학교",
    shortName: "연세",
    englishName: "YONSEI",
    rivalryName: "연고전",
    primary: "#003876",
    deep: "#001f4d",
    opponent: "#8b0029",
    symbol: "연",
  },
  korea: {
    name: "고려대학교",
    shortName: "고려",
    englishName: "KOREA",
    rivalryName: "고연전",
    primary: "#8b0029",
    deep: "#540018",
    opponent: "#003876",
    symbol: "고",
  },
} as const satisfies Record<Side, {
  name: string;
  shortName: string;
  englishName: string;
  rivalryName: string;
  primary: string;
  deep: string;
  opponent: string;
  symbol: string;
}>;

export const SCHEDULES: ScheduleItem[] = [
  {
    id: "yonsei-mirae-ot",
    side: "yonsei",
    dateTime: "2026-09-07T19:00:00+09:00",
    endDateTime: "2026-09-07T21:00:00+09:00",
    dateLabel: "09.07 월",
    timeLabel: "19:00",
    campus: "미래캠퍼스",
    venue: "정의관 대강당",
  },
  {
    id: "yonsei-international-ot",
    side: "yonsei",
    dateTime: "2026-09-09T19:00:00+09:00",
    endDateTime: "2026-09-09T21:00:00+09:00",
    dateLabel: "09.09 수",
    timeLabel: "19:00",
    campus: "국제캠퍼스",
    venue: "종합관 대강당",
  },
  {
    id: "korea-seoul-ot",
    side: "korea",
    dateTime: "2026-09-09T18:00:00+09:00",
    endDateTime: "2026-09-09T20:00:00+09:00",
    dateLabel: "09.09 수",
    timeLabel: "18:00",
    campus: "서울캠퍼스",
    venue: "화정체육관",
  },
  {
    id: "korea-sejong-ot",
    side: "korea",
    dateTime: "2026-09-14T18:00:00+09:00",
    endDateTime: "2026-09-14T20:00:00+09:00",
    dateLabel: "09.14 월",
    timeLabel: "18:00",
    campus: "세종캠퍼스",
    // Confirmed 2026-09-07: https://www.kus-student-council-38th.co.kr/schedule
    venue: "녹지운동장",
    officialUrl: "https://www.kus-student-council-38th.co.kr/schedule",
  },
];

export const TIMELINE: TimelineItem[] = [
  ...SCHEDULES.map((schedule) => ({
    id: schedule.id,
    dateTime: schedule.dateTime,
    endDateTime: schedule.endDateTime,
    dateLabel: schedule.dateLabel,
    timeLabel: schedule.timeLabel,
    title: `${SIDE_META[schedule.side].shortName} 응원 OT`,
    detail: `${schedule.campus} · ${schedule.venue}`,
    side: schedule.side,
  })),
  {
    id: "joint-cheer",
    dateTime: "2026-09-22T18:00:00+09:00",
    endDateTime: "2026-09-22T23:59:59+09:00",
    dateLabel: "09.22 화",
    timeLabel: "18:00",
    title: "합동응원전",
    detail: "연세대학교 신촌캠퍼스 · 노천극장",
  },
  {
    id: "regular-games",
    dateTime: EVENT.startDate,
    endDateTime: EVENT.endDate,
    dateLabel: "10.02 금 — 03 토",
    title: "2026 정기전",
    detail: "잠실 · 목동 종목별 경기장",
    isFinal: true,
  },
].sort((left, right) => new Date(left.dateTime).getTime() - new Date(right.dateTime).getTime());

export const SIDE_CURATION = eventCuration.sides satisfies Record<Side, SideCuration>;

export const KBO_TEAM_IDS = [
  "kia-tigers",
  "samsung-lions",
  "lg-twins",
  "doosan-bears",
  "kt-wiz",
  "ssg-landers",
  "lotte-giants",
  "hanwha-eagles",
  "nc-dinos",
  "kiwoom-heroes",
] as const;
