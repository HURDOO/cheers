import type {
  CheerSongSource,
  LineageFamily,
  RelationKind,
  SongMedia,
  SongSummary,
  TeamSummary,
} from "./eventTypes";
import { getCheerSong } from "../../data/catalog";

const archiveTeamHref = (name: string) =>
  `/?view=team&type=baseball&q=${encodeURIComponent(name)}`;

const TEAMS: TeamSummary[] = [
  { id: "yonsei-university", name: "연세대학교", shortName: "연세", abbreviation: "YU", primaryColor: "#003876", secondaryColor: "#001f4d", archiveHref: "/?view=team&type=university&q=연세대학교" },
  { id: "korea-university", name: "고려대학교", shortName: "고려", abbreviation: "KU", primaryColor: "#8b0029", secondaryColor: "#540018", archiveHref: "/?view=team&type=university&q=고려대학교" },
  { id: "kia-tigers", name: "KIA 타이거즈", shortName: "KIA", abbreviation: "KIA", primaryColor: "#ea0029", secondaryColor: "#06141f", archiveHref: archiveTeamHref("KIA 타이거즈") },
  { id: "samsung-lions", name: "삼성 라이온즈", shortName: "삼성", abbreviation: "SAM", primaryColor: "#074ca1", secondaryColor: "#c0c0c0" },
  { id: "lg-twins", name: "LG 트윈스", shortName: "LG", abbreviation: "LG", primaryColor: "#c30452", secondaryColor: "#241f20", archiveHref: archiveTeamHref("LG 트윈스") },
  { id: "doosan-bears", name: "두산 베어스", shortName: "두산", abbreviation: "DOO", primaryColor: "#131230", secondaryColor: "#ed1c24", archiveHref: archiveTeamHref("두산 베어스") },
  { id: "kt-wiz", name: "KT 위즈", shortName: "KT", abbreviation: "KT", primaryColor: "#000000", secondaryColor: "#e60012" },
  { id: "ssg-landers", name: "SSG 랜더스", shortName: "SSG", abbreviation: "SSG", primaryColor: "#ce0e2d", secondaryColor: "#ffb81c" },
  { id: "lotte-giants", name: "롯데 자이언츠", shortName: "롯데", abbreviation: "LOT", primaryColor: "#041e42", secondaryColor: "#d00f31", archiveHref: archiveTeamHref("롯데 자이언츠") },
  { id: "hanwha-eagles", name: "한화 이글스", shortName: "한화", abbreviation: "HAN", primaryColor: "#f37321", secondaryColor: "#111111", archiveHref: archiveTeamHref("한화 이글스") },
  { id: "nc-dinos", name: "NC 다이노스", shortName: "NC", abbreviation: "NC", primaryColor: "#315288", secondaryColor: "#c8a977" },
  { id: "kiwoom-heroes", name: "키움 히어로즈", shortName: "키움", abbreviation: "KIW", primaryColor: "#570514", secondaryColor: "#b07f4a", archiveHref: archiveTeamHref("키움 히어로즈") },
];

const teamById = new Map(TEAMS.map((team) => [team.id, team]));

function youtube(videoId: string, startSeconds = 0): SongMedia {
  return {
    kind: "youtube",
    videoId,
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    startSeconds,
  };
}

type SongInput = Omit<SongSummary, "teamName" | "teamShortName" | "dataStatus"> & {
  dataStatus?: SongSummary["dataStatus"];
};

function makeSong(input: SongInput): SongSummary {
  const team = teamById.get(input.teamId);
  if (!team) throw new Error(`이벤트 목 데이터에서 팀 '${input.teamId}'를 찾을 수 없습니다.`);
  const catalogSong = getCheerSong(input.id);

  return {
    aliases: catalogSong?.aliases ?? [],
    yearLabel: catalogSong?.yearLabel ?? "2026 이벤트 큐레이션",
    usageContext: catalogSong?.usageContext ?? "2026 정기전 응원 예습용으로 선별한 곡입니다.",
    chronologyNote: catalogSong?.chronologyNote ?? "정본 아카이브 반영 전인 기획용 정보입니다.",
    lyrics: catalogSong?.lyrics ?? [],
    durationSeconds: catalogSong?.duration ?? undefined,
    media: catalogSong?.youtubeMedia ? {
      kind: "youtube",
      videoId: catalogSong.youtubeMedia.videoId,
      sourceUrl: catalogSong.youtubeMedia.sourceUrl,
      startSeconds: catalogSong.youtubeMedia.startSeconds,
      title: catalogSong.youtubeMedia.title,
      channelName: catalogSong.youtubeMedia.channelName,
    } : undefined,
    archiveHref: catalogSong ? `/?song=${encodeURIComponent(catalogSong.id)}` : undefined,
    ...input,
    teamName: team.name,
    teamShortName: team.shortName,
    dataStatus: input.dataStatus ?? "mock",
  };
}

const SONGS: SongSummary[] = [
  makeSong({ id: "yonsei-university-wonsirim", title: "원시림", teamId: "yonsei-university", description: "첫 박자부터 응원석의 온도를 끌어올리는 연세의 대표 응원가.", tags: ["대표곡", "떼창"], media: youtube("qwKuY1SfPPE"), archiveHref: "/?song=yonsei-university-wonsirim", dataStatus: "verified" }),
  makeSong({ id: "yonsei-university-yonseiyeo-saranghanda", title: "연세여 사랑한다", teamId: "yonsei-university", description: "서로의 어깨를 잇고 함께 부르는 연세의 큰 노래.", tags: ["대표곡", "어깨동무"], media: youtube("cGdOCYiQNyg"), archiveHref: "/?song=yonsei-university-yonseiyeo-saranghanda", dataStatus: "verified" }),
  makeSong({ id: "yonsei-university-haneul-kkeutkkaji", title: "하늘끝까지", teamId: "yonsei-university", description: "후렴으로 갈수록 한 목소리가 되는 서정적인 응원가.", tags: ["대표곡", "떼창"], media: youtube("-UYGsQLVJgc"), archiveHref: "/?song=yonsei-university-haneul-kkeutkkaji", dataStatus: "verified" }),
  makeSong({ id: "yonsei-university-seosi", title: "서시", teamId: "yonsei-university", description: "웅장한 선율 위에 연세의 구호를 쌓아 올리는 대표곡.", tags: ["대표곡", "입문 추천"], media: youtube("sHZY36KlQn8"), archiveHref: "/?song=yonsei-university-seosi", dataStatus: "verified" }),
  makeSong({ id: "yonsei-university-paran", title: "파란", teamId: "yonsei-university", description: "2026 응원 현장에서 다시 확인된 푸른 함성.", tags: ["2026", "응원 OT"] }),
  makeSong({ id: "yonsei-university-cheongchun-mulgyeol", title: "청춘물결", teamId: "yonsei-university", description: "이번 시즌 새 흐름을 보여주는 청춘의 응원가.", tags: ["2026 신곡", "떼창"] }),

  makeSong({ id: "yonsei-university-haeya", title: "해야", teamId: "yonsei-university", description: "강한 리듬과 반복되는 후렴이 오래 남는 현장형 응원가.", tags: ["아카라카", "점프"], media: youtube("kaoZ_oPuTQo"), archiveHref: "/?song=yonsei-university-haeya", dataStatus: "verified" }),
  makeSong({ id: "yonsei-university-seogok", title: "서곡", teamId: "yonsei-university", description: "익숙한 멜로디와 단단한 구호가 만나는 오프닝 트랙.", tags: ["응원 OT", "원곡 계보"] }),
  makeSong({ id: "yonsei-university-oneul-bamsae", title: "오늘 밤새", teamId: "yonsei-university", description: "밤의 응원석을 가볍고 빠르게 달구는 인기곡.", tags: ["아카라카", "떼창"] }),
  makeSong({ id: "yonsei-university-oh-my-friend", title: "Oh My Friend", teamId: "yonsei-university", description: "1학기 현장의 기억을 정기전까지 이어주는 응원가.", tags: ["1학기", "현역"] }),
  makeSong({ id: "yonsei-university-onnurie", title: "온누리에", teamId: "yonsei-university", description: "넓게 퍼지는 후렴이 응원석을 하나로 묶는 곡.", tags: ["1학기", "떼창"] }),
  makeSong({ id: "yonsei-university-haneul-arae", title: "하늘 아래", teamId: "yonsei-university", description: "다른 스포츠 응원문화까지 이어지는 계보가 기대되는 곡.", tags: ["원곡 계보", "현역"] }),
  makeSong({ id: "yonsei-university-j-ege", title: "J에게", teamId: "yonsei-university", description: "오랫동안 연세 응원석에서 불린 곡으로, 반복되는 추임새와 후렴을 함께 익히기 좋습니다.", tags: ["응원 OT", "떼창"], lyrics: ["J 난 너를 못잊어", "J 난 너를 사랑해"], media: youtube("YP5jUhsqjfM", 9) }),
  makeSong({ id: "yonsei-university-badasae", title: "바다새", teamId: "yonsei-university", description: "대학과 야구 응원석을 오가는 흥미로운 계보의 노래.", tags: ["원곡 계보", "아카라카"] }),

  makeSong({ id: "yonsei-university-go-balp-kkum", title: "고.밟.꿈", teamId: "yonsei-university", description: "오래 이어진 연세 라이벌리 응원가.", tags: ["라이벌리", "클래식"] }),
  makeSong({ id: "yonsei-university-woo", title: "Woo", teamId: "yonsei-university", description: "현재 사용되는 가사를 기준으로 소개하는 라이벌리 트랙.", tags: ["라이벌리", "클래식"] }),
  makeSong({ id: "yonsei-university-ko-dae", title: "K.O.대", teamId: "yonsei-university", description: "짧고 강한 구호가 중심이 되는 라이벌리 응원가.", tags: ["라이벌리", "구호"] }),
  makeSong({ id: "yonsei-university-goyangi-sound", title: "고양이 SOUND", teamId: "yonsei-university", description: "익숙한 멜로디를 재치 있게 비튼 최근 세대의 라이벌리 곡.", tags: ["라이벌리", "최근곡"] }),

  makeSong({ id: "korea-university-minjogui-aria", title: "민족의 아리아", teamId: "korea-university", description: "고려대 응원석을 상징하는 거대한 합창의 중심.", tags: ["대표곡", "떼창"], media: youtube("LIxcLsvUjWU"), archiveHref: "/?song=korea-university-minjogui-aria", dataStatus: "verified" }),
  makeSong({ id: "korea-university-forever", title: "Forever", teamId: "korea-university", description: "서정적인 도입과 폭발하는 후렴이 대비되는 대표 응원가.", tags: ["대표곡", "어깨동무"], media: youtube("GxSU75-9n4M"), archiveHref: "/?song=korea-university-forever", dataStatus: "verified" }),
  makeSong({ id: "korea-university-baennorae", title: "뱃노래", teamId: "korea-university", description: "전통 선율이 거대한 응원 구호로 변하는 고려대 대표곡.", tags: ["대표곡", "클래식"], media: youtube("YbADjuEahzg"), archiveHref: "/?song=korea-university-baennorae", dataStatus: "verified" }),
  makeSong({ id: "korea-university-deureora-boara-geurigo-gieokhara", title: "들어라 보아라 그리고 기억하라", teamId: "korea-university", description: "이름 그대로 듣고, 보고, 기억하게 만드는 웅장한 응원가.", tags: ["대표곡", "구호"], media: youtube("8iGlLcy2TXc"), archiveHref: "/?song=korea-university-deureora-boara-geurigo-gieokhara", dataStatus: "verified" }),
  makeSong({ id: "korea-university-yeongwonhi", title: "영원히", teamId: "korea-university", description: "2026 정기전 시즌에 다시 익혀둘 고려대 응원가.", tags: ["2026", "떼창"] }),
  makeSong({ id: "korea-university-seungni-ui-hamseong", title: "승리의 함성", teamId: "korea-university", description: "최근 레퍼토리의 에너지를 압축한 빠른 응원가.", tags: ["최근곡", "점프"] }),

  makeSong({ id: "korea-university-elise-reul-wihayeo", title: "엘리제를 위하여", teamId: "korea-university", description: "익숙한 선율을 고려대만의 함성으로 바꾼 주요곡.", tags: ["입실렌티", "현역"] }),
  makeSong({ id: "korea-university-seoktap", title: "석탑", teamId: "korea-university", description: "묵직한 구호와 학교의 상징을 함께 담은 응원가.", tags: ["입실렌티", "구호"] }),
  makeSong({ id: "korea-university-chulsapyo", title: "출사표", teamId: "korea-university", description: "2026 신입생 응원 OT 레퍼토리에서 확인된 출정의 노래.", tags: ["2026", "응원 OT"] }),
  makeSong({ id: "korea-university-yeongwonhara", title: "영원하라", teamId: "korea-university", description: "대학과 프로야구 응원석의 연결까지 보여주는 현역 응원가.", tags: ["응원 OT", "원곡 계보"], media: youtube("AnLm-gnWA9c", 263), archiveHref: "/?song=korea-university-yeongwonhara", dataStatus: "verified" }),
  makeSong({ id: "korea-university-godaereul-noraehara", title: "고대를 노래하라", teamId: "korea-university", description: "정기전의 정체성을 선명하게 드러내는 고연가.", tags: ["고연가", "정기전"] }),
  makeSong({ id: "korea-university-young-tigers", title: "Young Tigers", teamId: "korea-university", description: "2026 응원 OT에서 다시 만나는 젊은 호랑이의 노래.", tags: ["2026", "응원 OT"] }),
  makeSong({ id: "korea-university-hwaryeo-pieonan-hamseong", title: "화려, 피어난 함성", teamId: "korea-university", description: "익숙한 원곡이 KT 응원석으로도 이어지는 현역곡.", tags: ["입실렌티", "원곡 계보"] }),
  makeSong({ id: "korea-university-goraesanyang", title: "고래사냥", teamId: "korea-university", description: "누구나 금세 합류할 수 있는 유쾌하고 큰 떼창.", tags: ["입실렌티", "떼창"] }),

  makeSong({ id: "korea-university-yonsei-chicken", title: "연세치킨", teamId: "korea-university", description: "고연전 응원석의 오래된 라이벌리 클래식.", tags: ["라이벌리", "클래식"] }),
  makeSong({ id: "korea-university-singgeulbeonggeul", title: "싱글벙글", teamId: "korea-university", description: "가볍게 따라 부르며 상대를 겨냥하는 인기 라이벌리 곡.", tags: ["라이벌리", "인기곡"] }),
  makeSong({ id: "korea-university-kkureora-yonsei", title: "꿇어라 연세", teamId: "korea-university", description: "직선적인 구호로 밀어붙이는 고대 라이벌리 응원가.", tags: ["라이벌리", "구호"] }),
  makeSong({ id: "korea-university-urineun-korea", title: "우리는 고대", teamId: "korea-university", description: "상대보다 우리 진영의 정체성을 앞세우는 라이벌리 트랙.", tags: ["라이벌리", "떼창"] }),

  makeSong({ id: "lg-twins-seoul-ui-aria", title: "서울의 아리아", teamId: "lg-twins", description: "민족의 아리아에서 이어진 프로야구 응원가.", tags: ["고려대 연결", "직접 차용"], media: youtube("Y-cBDnUl5k4", 1451), archiveHref: "/?song=lg-twins-seoul-ui-aria", dataStatus: "verified" }),
  makeSong({ id: "kiwoom-heroes-seungni-ui-hamseong", title: "승리의 함성", teamId: "kiwoom-heroes", description: "같은 아리아 계보를 공유하는 역사적 프로야구 응원가.", tags: ["고려대 연결", "역사적"], media: youtube("sDSqc9JwDNI"), archiveHref: "/?song=kiwoom-heroes-seungni-ui-hamseong", dataStatus: "historic" }),
  makeSong({ id: "lg-twins-seungni-ui-norae", title: "승리의 노래", teamId: "lg-twins", description: "고려대 Forever에서 야구장으로 이어진 응원가.", tags: ["고려대 연결", "직접 차용"], media: youtube("Y-cBDnUl5k4", 1287), archiveHref: "/?song=lg-twins-seungni-ui-norae", dataStatus: "verified" }),
  makeSong({ id: "kt-wiz-winning-kt", title: "위닝케이티", teamId: "kt-wiz", description: "화려, 피어난 함성과 같은 원곡 계보로 묶이는 KT 응원가.", tags: ["고려대 연결", "같은 원곡"] }),
  makeSong({ id: "kt-wiz-seungnireul-wihayeo", title: "승리를 위하여", teamId: "kt-wiz", description: "들어라 보아라 그리고 기억하라와의 계보를 조사 중인 응원가.", tags: ["고려대 연결", "관계 조사 중"] }),
  makeSong({ id: "lotte-giants-sori-nop-yeo-oechyeoboja", title: "소리높여 외쳐보자", teamId: "lotte-giants", description: "영원하라 계열로 이어지는 롯데의 응원가.", tags: ["고려대 연결", "같은 원곡"], media: youtube("AtyqKrWmvGE", 365), archiveHref: "/?song=lotte-giants-sori-nop-yeo-oechyeoboja", dataStatus: "verified" }),
  makeSong({ id: "hanwha-eagles-saranghanda-eagles", title: "사랑한다 이글스", teamId: "hanwha-eagles", description: "연세 하늘끝까지와 같은 원곡으로 이어지는 한화의 노래.", tags: ["연세대 연결", "같은 원곡"], media: youtube("hZ66kWereec"), archiveHref: "/?song=hanwha-eagles-saranghanda-eagles", dataStatus: "verified" }),
  makeSong({ id: "lg-twins-saranghanda-lg", title: "사랑한다 LG", teamId: "lg-twins", description: "연세여 사랑한다에서 프로야구 응원석으로 이어진 응원가.", tags: ["연세대 연결", "직접 차용"], media: youtube("BhwoJFjkAf8", 1027), archiveHref: "/?song=lg-twins-saranghanda-lg", dataStatus: "verified" }),
  makeSong({ id: "doosan-bears-haeya", title: "해야", teamId: "doosan-bears", description: "연세 해야와 같은 원곡이 잠실 응원석에서 다시 울리는 곡.", tags: ["연세대 연결", "같은 원곡"], media: youtube("Hr8ER2a_YbY"), archiveHref: "/?song=doosan-bears-haeya", dataStatus: "verified" }),
  makeSong({ id: "lotte-giants-badasae", title: "바다새", teamId: "lotte-giants", description: "대학과 부산 야구 응원문화 사이를 잇는 친숙한 멜로디.", tags: ["연세대 연결", "같은 원곡"] }),
  makeSong({ id: "ssg-landers-j-ege", title: "J에게", teamId: "ssg-landers", description: "연세 J에게와 같은 뿌리의 노래를 SSG 응원석에서 만나는 곡.", tags: ["연세대 연결", "같은 원곡"], media: youtube("zPGEpmBj4iw", 1432) }),
];

const songById = new Map(SONGS.map((song) => [song.id, song]));

function member(songId: string, relationKind: RelationKind) {
  const song = songById.get(songId);
  if (!song) throw new Error(`이벤트 목 데이터에서 응원가 '${songId}'를 찾을 수 없습니다.`);
  return { song, relationKind };
}

const FAMILIES: LineageFamily[] = [
  {
    id: "andrea-bocelli-melodramma",
    original: { id: "andrea-bocelli-melodramma", title: "Melodramma", artist: "Andrea Bocelli", yearLabel: "2001" },
    members: [
      member("korea-university-minjogui-aria", "same_original"),
      member("lg-twins-seoul-ui-aria", "cheer_to_cheer_adaptation"),
      member("kiwoom-heroes-seungni-ui-hamseong", "cheer_to_cheer_adaptation"),
    ],
    note: "한 원곡이 대학 응원석을 거쳐 프로야구의 서로 다른 관중석으로 퍼진 계보입니다.",
    archiveHref: "/?view=origin&q=Melodramma",
  },
  {
    id: "coldplay-viva-la-vida",
    original: { id: "coldplay-viva-la-vida", title: "Viva la Vida", artist: "Coldplay", yearLabel: "2008" },
    members: [
      member("korea-university-hwaryeo-pieonan-hamseong", "same_original"),
      member("kt-wiz-winning-kt", "same_original"),
    ],
    note: "익숙한 선율이 대학과 야구장에서 각각 다른 함성으로 바뀌는 사례입니다.",
  },
  {
    id: "stratovarius-forever",
    original: { id: "stratovarius-forever", title: "Forever", artist: "Stratovarius", yearLabel: "1996" },
    members: [
      member("korea-university-forever", "same_original"),
      member("lg-twins-seungni-ui-norae", "cheer_to_cheer_adaptation"),
    ],
    note: "고려대의 대표 응원가가 LG의 응원문화로 직접 이어진 계보입니다.",
    archiveHref: "/?view=origin&q=Stratovarius",
  },
  {
    id: "kimi-wo-nosete",
    original: { id: "kimi-wo-nosete", title: "君をのせて", artist: "Azumi Inoue", yearLabel: "1986" },
    members: [
      member("korea-university-deureora-boara-geurigo-gieokhara", "same_original"),
      member("kt-wiz-seungnireul-wihayeo", "same_original"),
    ],
    note: "원곡 하나가 학교와 구단의 서로 다른 구호를 담는 방식에 주목한 기획용 계보입니다.",
    archiveHref: "/?view=origin&q=Kimi%20wo%20Nosete",
  },
  {
    id: "han-sung-min-saranghamyeon-halssurok",
    original: { id: "han-sung-min-saranghamyeon-halssurok", title: "사랑하면 할수록", artist: "한성민", yearLabel: "2001" },
    members: [
      member("yonsei-university-haneul-kkeutkkaji", "same_original"),
      member("hanwha-eagles-saranghanda-eagles", "same_original"),
    ],
    note: "연세의 응원석과 한화의 야구장이 같은 원곡을 각자의 사랑 노래로 부릅니다.",
    archiveHref: "/?view=origin&q=사랑하면%20할수록",
  },
  {
    id: "carlos-gardel-por-una-cabeza",
    original: { id: "carlos-gardel-por-una-cabeza", title: "Por una Cabeza", artist: "Carlos Gardel", yearLabel: "1935" },
    members: [
      member("yonsei-university-yonseiyeo-saranghanda", "same_original"),
      member("lg-twins-saranghanda-lg", "cheer_to_cheer_adaptation"),
    ],
    note: "연세에서 불리던 응원가가 LG 응원석으로 직접 이어진 계보를 보여줍니다.",
    archiveHref: "/?view=origin&q=Por%20una%20Cabeza",
  },
  {
    id: "magma-haeya",
    original: { id: "magma-haeya", title: "해야", artist: "마그마", yearLabel: "1980" },
    members: [
      member("yonsei-university-haeya", "same_original"),
      member("doosan-bears-haeya", "same_original"),
    ],
    note: "같은 록 원곡이 대학 응원과 프로야구 응원에서 서로 다른 현장성을 얻었습니다.",
    archiveHref: "/?view=origin&q=마그마",
  },
];

const familyById = new Map(FAMILIES.map((family) => [family.id, family]));

export const mockSongSource: CheerSongSource = {
  getSong: (id) => songById.get(id),
  getTeam: (id) => teamById.get(id),
  getFamily: (id) => familyById.get(id),
};
