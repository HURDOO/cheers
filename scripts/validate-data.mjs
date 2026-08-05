import { readFile } from "node:fs/promises";

const files = {
  teams: new URL("../data/teams.json", import.meta.url),
  originals: new URL("../data/original-songs.json", import.meta.url),
  cheerSongs: new URL("../data/cheer-songs.json", import.meta.url),
};

const errors = [];
const currentYear = new Date().getFullYear();
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const colorPattern = /^#[0-9A-F]{6}$/i;
const statuses = new Set(["draft", "verified"]);

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

function validateYear(file, record) {
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
  });

  if (record.status === "verified" && record.sources.length === 0) {
    addError(file, record.id, "verified 레코드에는 출처가 하나 이상 필요합니다.");
  }
}

const teams = await loadCatalog("teams.json", files.teams);
const originals = await loadCatalog("original-songs.json", files.originals);
const cheerSongs = await loadCatalog("cheer-songs.json", files.cheerSongs);

validateIds("teams.json", teams);
validateIds("original-songs.json", originals);
validateIds("cheer-songs.json", cheerSongs);

teams.forEach((team) => {
  ["name", "abbreviation", "region"].forEach((field) => requiredString("teams.json", team, field));
  if (!new Set(["baseball", "university"]).has(team.type)) {
    addError("teams.json", team.id, "type은 baseball 또는 university여야 합니다.");
  }
  if (!colorPattern.test(team.colors?.primary ?? "")) addError("teams.json", team.id, "colors.primary는 #RRGGBB 형식이어야 합니다.");
  if (!colorPattern.test(team.colors?.secondary ?? "")) addError("teams.json", team.id, "colors.secondary는 #RRGGBB 형식이어야 합니다.");
});

originals.forEach((song) => {
  ["title", "artist", "genre", "country"].forEach((field) => requiredString("original-songs.json", song, field));
  validateYear("original-songs.json", song);
  validateRecordMetadata("original-songs.json", song);
});

const teamIds = new Set(teams.map(({ id }) => id));
const originalIds = new Set(originals.map(({ id }) => id));

cheerSongs.forEach((song) => {
  ["title", "teamId", "originalSongId", "description"].forEach((field) => requiredString("cheer-songs.json", song, field));
  validateYear("cheer-songs.json", song);
  validateRecordMetadata("cheer-songs.json", song);

  if (!teamIds.has(song.teamId)) addError("cheer-songs.json", song.id, `존재하지 않는 teamId '${song.teamId}'입니다.`);
  if (!originalIds.has(song.originalSongId)) addError("cheer-songs.json", song.id, `존재하지 않는 originalSongId '${song.originalSongId}'입니다.`);
  if (!Number.isInteger(song.durationSeconds) || song.durationSeconds <= 0) {
    addError("cheer-songs.json", song.id, "durationSeconds는 1 이상의 정수여야 합니다.");
  }
  if (!Array.isArray(song.lyrics) || song.lyrics.length < 1 || song.lyrics.some((line) => typeof line !== "string" || line.trim() === "")) {
    addError("cheer-songs.json", song.id, "lyrics에는 비어 있지 않은 문자열이 하나 이상 필요합니다.");
  }

  if (song.audio !== undefined) {
    validateUrl("cheer-songs.json", song.id, "audio.url", song.audio?.url, true);
    if (typeof song.audio?.credit !== "string" || song.audio.credit.trim() === "") {
      addError("cheer-songs.json", song.id, "audio.credit이 필요합니다.");
    }
    if (song.audio?.licenseUrl !== undefined) {
      validateUrl("cheer-songs.json", song.id, "audio.licenseUrl", song.audio.licenseUrl);
    }
  }
});

if (errors.length > 0) {
  console.error(`데이터 검증 실패 (${errors.length}건)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  const drafts = cheerSongs.filter(({ status }) => status === "draft").length;
  console.log(`데이터 검증 완료: 팀 ${teams.length}개 · 원곡 ${originals.length}개 · 응원가 ${cheerSongs.length}곡 (검증 전 ${drafts}곡)`);
}

