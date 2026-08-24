import { readFile } from "node:fs/promises";

const files = {
  teams: new URL("../data/teams.json", import.meta.url),
  originals: new URL("../data/original-songs.json", import.meta.url),
  cheerSongs: new URL("../data/cheer-songs.json", import.meta.url),
  media: new URL("../data/media.json", import.meta.url),
};

const errors = [];
const currentYear = new Date().getFullYear();
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const colorPattern = /^#[0-9A-F]{6}$/i;
const youtubeVideoIdPattern = /^[A-Za-z0-9_-]{11}$/;
const statuses = new Set(["draft", "verified"]);
const sourceScopes = new Set(["title", "origin", "chronology", "usage"]);
const originalKinds = new Set(["source", "commissioned"]);
const cheerYearStatuses = new Set(["confirmed", "earliest-documented", "reported"]);
const cheerOriginTypes = new Set(["adaptation", "arrangement", "combined-adaptation", "commissioned-original"]);
const mediaRoles = new Set(["official-audio", "official-performance", "stadium-recording", "reference"]);
const channelTypes = new Set(["rights-holder", "team-official", "school-official", "fan"]);
const mediaAvailability = new Set(["unchecked", "playable", "unavailable"]);

function addError(file, id, message) {
  errors.push(`${file}${id ? ` (${id})` : ""}: ${message}`);
}

async function loadCatalog(name, url) {
  let value;

  try {
    value = JSON.parse(await readFile(url, "utf8"));
  } catch (error) {
    addError(name, "", `JSON을 읽을 수 없습니다: ${error.message}`);
    return [];
  }

  if (value?.schemaVersion !== 1) addError(name, "", "schemaVersion은 1이어야 합니다.");
  if (!Array.isArray(value?.items)) {
    addError(name, "", "items는 배열이어야 합니다.");
    return [];
  }

  return value.items;
}

function requiredString(file, record, field) {
  if (typeof record[field] !== "string" || record[field].trim() === "") {
    addError(file, record.id, `${field}에 비어 있지 않은 문자열이 필요합니다.`);
  }
}

function validateIds(file, records) {
  const seen = new Set();

  records.forEach((record) => {
    requiredString(file, record, "id");
    if (typeof record.id === "string" && !idPattern.test(record.id)) {
      addError(file, record.id, "id는 영문 소문자·숫자·하이픈만 사용할 수 있습니다.");
    }
    if (seen.has(record.id)) addError(file, record.id, "중복 ID입니다.");
    seen.add(record.id);
  });
}

function validateYear(file, record, allowNull = false) {
  if (allowNull && record.year === null) return;
  if (!Number.isInteger(record.year) || record.year < 1800 || record.year > currentYear + 1) {
    addError(file, record.id, `year는 1800~${currentYear + 1} 범위의 정수여야 합니다.`);
  }
}

function validateUrl(file, id, field, value, allowLocal = false) {
  if (typeof value !== "string" || value.trim() === "") {
    addError(file, id, `${field}에 URL이 필요합니다.`);
    return;
  }

  if (allowLocal && value.startsWith("/")) return;

  try {
    const url = new URL(value);
    if (!new Set(["http:", "https:"]).has(url.protocol)) throw new Error("protocol");
  } catch {
    addError(file, id, `${field}는 http(s) URL${allowLocal ? " 또는 /로 시작하는 로컬 경로" : ""}여야 합니다.`);
  }
}

function validateRecordMetadata(file, record) {
  if (!statuses.has(record.status)) addError(file, record.id, "status는 draft 또는 verified여야 합니다.");
  if (!Array.isArray(record.sources)) {
    addError(file, record.id, "sources는 배열이어야 합니다.");
    return;
  }

  record.sources.forEach((source, index) => {
    if (typeof source?.label !== "string" || source.label.trim() === "") {
      addError(file, record.id, `sources[${index}].label이 필요합니다.`);
    }
    validateUrl(file, record.id, `sources[${index}].url`, source?.url);
    if (source?.scope !== undefined && !sourceScopes.has(source.scope)) {
      addError(file, record.id, `sources[${index}].scope 값이 올바르지 않습니다.`);
    }
  });

  if (record.status === "verified" && record.sources.length === 0) {
    addError(file, record.id, "verified 레코드에는 출처가 하나 이상 필요합니다.");
  }
}

const teams = await loadCatalog("teams.json", files.teams);
const originals = await loadCatalog("original-songs.json", files.originals);
const cheerSongs = await loadCatalog("cheer-songs.json", files.cheerSongs);
const media = await loadCatalog("media.json", files.media);

validateIds("teams.json", teams);
validateIds("original-songs.json", originals);
validateIds("cheer-songs.json", cheerSongs);
validateIds("media.json", media);

teams.forEach((team) => {
  ["name", "abbreviation", "region"].forEach((field) => requiredString("teams.json", team, field));
  if (!new Set(["baseball", "university"]).has(team.type)) {
    addError("teams.json", team.id, "type은 baseball 또는 university여야 합니다.");
  }
  if (!colorPattern.test(team.colors?.primary ?? "")) addError("teams.json", team.id, "colors.primary는 #RRGGBB 형식이어야 합니다.");
  if (!colorPattern.test(team.colors?.secondary ?? "")) addError("teams.json", team.id, "colors.secondary는 #RRGGBB 형식이어야 합니다.");
});

originals.forEach((song) => {
  ["title", "artist"].forEach((field) => requiredString("original-songs.json", song, field));
  validateYear("original-songs.json", song, true);
  if (song.kind !== undefined && !originalKinds.has(song.kind)) {
    addError("original-songs.json", song.id, "kind는 source 또는 commissioned여야 합니다.");
  }
  if (song.yearLabel !== undefined && (typeof song.yearLabel !== "string" || song.yearLabel.trim() === "")) {
    addError("original-songs.json", song.id, "yearLabel은 비어 있지 않은 문자열이어야 합니다.");
  }
  for (const field of ["genre", "country"]) {
    if (song[field] !== undefined && song[field] !== null && (typeof song[field] !== "string" || song[field].trim() === "")) {
      addError("original-songs.json", song.id, `${field}는 null 또는 비어 있지 않은 문자열이어야 합니다.`);
    }
  }
  validateRecordMetadata("original-songs.json", song);
});

const teamIds = new Set(teams.map(({ id }) => id));
const originalIds = new Set(originals.map(({ id }) => id));
const cheerSongIds = new Set(cheerSongs.map(({ id }) => id));

cheerSongs.forEach((song) => {
  ["title", "teamId", "originalSongId", "description", "yearLabel", "originNote", "chronologyNote", "usageContext"].forEach((field) => requiredString("cheer-songs.json", song, field));
  validateYear("cheer-songs.json", song, true);
  validateRecordMetadata("cheer-songs.json", song);

  if (!Array.isArray(song.aliases) || song.aliases.some((alias) => typeof alias !== "string" || alias.trim() === "")) {
    addError("cheer-songs.json", song.id, "aliases는 비어 있지 않은 문자열 배열이어야 합니다.");
  } else if (new Set(song.aliases).size !== song.aliases.length) {
    addError("cheer-songs.json", song.id, "aliases에 중복 값이 있습니다.");
  }
  if (
    !Array.isArray(song.symbolicLines) ||
    song.symbolicLines.length !== 2 ||
    song.symbolicLines.some((line) => typeof line !== "string" || line.trim() === "")
  ) {
    addError("cheer-songs.json", song.id, "symbolicLines에는 비어 있지 않은 문자열 두 줄이 필요합니다.");
  }
  if (!Number.isInteger(song.timelineYear) || song.timelineYear < 1800 || song.timelineYear > currentYear + 1) {
    addError("cheer-songs.json", song.id, `timelineYear는 1800~${currentYear + 1} 범위의 정수여야 합니다.`);
  }
  if (!cheerYearStatuses.has(song.yearStatus)) {
    addError("cheer-songs.json", song.id, "yearStatus 값이 올바르지 않습니다.");
  }
  if (song.yearStatus === "confirmed" && (!Number.isInteger(song.year) || song.year !== song.timelineYear)) {
    addError("cheer-songs.json", song.id, "confirmed 곡은 year와 timelineYear가 같은 정수여야 합니다.");
  }
  if (song.yearStatus !== "confirmed" && song.year !== null) {
    addError("cheer-songs.json", song.id, "미확정 연도 곡의 year는 null이어야 합니다.");
  }
  if (!cheerOriginTypes.has(song.originType)) {
    addError("cheer-songs.json", song.id, "originType 값이 올바르지 않습니다.");
  }

  if (!teamIds.has(song.teamId)) addError("cheer-songs.json", song.id, `존재하지 않는 teamId '${song.teamId}'입니다.`);
  if (!originalIds.has(song.originalSongId)) addError("cheer-songs.json", song.id, `존재하지 않는 originalSongId '${song.originalSongId}'입니다.`);
  if (song.sourceCheerSongId !== undefined && !cheerSongIds.has(song.sourceCheerSongId)) {
    addError("cheer-songs.json", song.id, `존재하지 않는 sourceCheerSongId '${song.sourceCheerSongId}'입니다.`);
  }
  if (song.secondaryOriginalSongIds !== undefined) {
    if (!Array.isArray(song.secondaryOriginalSongIds)) {
      addError("cheer-songs.json", song.id, "secondaryOriginalSongIds는 배열이어야 합니다.");
    } else {
      song.secondaryOriginalSongIds.forEach((id) => {
        if (!originalIds.has(id)) addError("cheer-songs.json", song.id, `존재하지 않는 secondaryOriginalSongId '${id}'입니다.`);
      });
    }
  }
  if (song.durationSeconds !== undefined && (!Number.isInteger(song.durationSeconds) || song.durationSeconds <= 0)) {
    addError("cheer-songs.json", song.id, "durationSeconds는 1 이상의 정수여야 합니다.");
  }
  if (
    !Array.isArray(song.lyrics) ||
    song.lyrics.some((line) => typeof line !== "string") ||
    song.lyrics.some((line) => line !== "" && line.trim() === "")
  ) {
    addError("cheer-songs.json", song.id, "lyrics는 문자열 배열이어야 하며 공백만 있는 줄은 허용하지 않습니다.");
  }

  if (song.audio !== undefined) {
    addError("cheer-songs.json", song.id, "audio 필드는 더 이상 지원하지 않습니다. media.json에 YouTube 영상을 등록하세요.");
  }
});

const preferredBySong = new Map();

media.forEach((item) => {
  ["cheerSongId", "videoId", "title", "channelName", "sourceUrl"].forEach((field) => requiredString("media.json", item, field));

  if (!cheerSongIds.has(item.cheerSongId)) {
    addError("media.json", item.id, `존재하지 않는 cheerSongId '${item.cheerSongId}'입니다.`);
  }
  if (!youtubeVideoIdPattern.test(item.videoId ?? "")) {
    addError("media.json", item.id, "videoId는 11자리 YouTube 영상 ID여야 합니다.");
  }
  if (!mediaRoles.has(item.role)) {
    addError("media.json", item.id, "지원하지 않는 role입니다.");
  }
  if (!channelTypes.has(item.channelType)) {
    addError("media.json", item.id, "지원하지 않는 channelType입니다.");
  }
  if (!mediaAvailability.has(item.availability)) {
    addError("media.json", item.id, "availability는 unchecked, playable 또는 unavailable이어야 합니다.");
  }
  if (typeof item.preferred !== "boolean") {
    addError("media.json", item.id, "preferred는 boolean이어야 합니다.");
  }
  if (item.preferred) {
    if (preferredBySong.has(item.cheerSongId)) {
      addError("media.json", item.id, `응원가 하나에 preferred 미디어를 두 개 이상 지정할 수 없습니다. (${preferredBySong.get(item.cheerSongId)})`);
    }
    preferredBySong.set(item.cheerSongId, item.id);
  }

  validateUrl("media.json", item.id, "sourceUrl", item.sourceUrl);
  try {
    const url = new URL(item.sourceUrl);
    if (!new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]).has(url.hostname)) {
      addError("media.json", item.id, "sourceUrl은 YouTube URL이어야 합니다.");
    }
  } catch {
    // URL 형식 오류는 validateUrl에서 보고합니다.
  }

  for (const field of ["startSeconds", "durationSeconds"]) {
    if (item[field] !== undefined && (!Number.isInteger(item[field]) || item[field] < (field === "durationSeconds" ? 1 : 0))) {
      addError("media.json", item.id, `${field} 값이 올바르지 않습니다.`);
    }
  }
  if (item.checkedAt !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(item.checkedAt)) {
    addError("media.json", item.id, "checkedAt은 YYYY-MM-DD 형식이어야 합니다.");
  }
});

if (errors.length > 0) {
  console.error(`데이터 검증 실패 (${errors.length}건)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  const drafts = cheerSongs.filter(({ status }) => status === "draft").length;
  console.log(`데이터 검증 완료: 팀 ${teams.length}개 · 원곡 ${originals.length}개 · 응원가 ${cheerSongs.length}곡 · YouTube ${media.length}개 (검증 전 ${drafts}곡)`);
}
