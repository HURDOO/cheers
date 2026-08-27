import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const pilotDir = path.resolve(process.argv[2] ?? "research/pilots/minjok-ui-aria");
const errors = [];
const warnings = [];

function readJson(fileName) {
  const filePath = path.join(pilotDir, fileName);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    errors.push(`${fileName}: JSON을 읽을 수 없습니다 (${error.message})`);
    return {};
  }
}

function requireValue(condition, message) {
  if (!condition) errors.push(message);
}

function collectKeys(value, location, forbiddenKeys) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectKeys(item, `${location}[${index}]`, forbiddenKeys));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeys.has(key)) {
      errors.push(`${location}.${key}: 원문 저장 금지 필드입니다.`);
    }
    collectKeys(child, `${location}.${key}`, forbiddenKeys);
  }
}

const webLedger = readJson("web-source-ledger.json");
const youtubeLedger = readJson("youtube-source-ledger.json");
const factFile = readJson("fact-cards.json");
const tmiFile = readJson("tmi-candidates.json");

const webSources = webLedger.webSources ?? webLedger.sources ?? [];
const youtubeSources = youtubeLedger.youtubeSources ?? youtubeLedger.videos ?? youtubeLedger.sources ?? [];
const facts = factFile.facts ?? factFile.cards ?? [];
const tmiItems = tmiFile.items ?? tmiFile.candidates ?? [];

requireValue(Array.isArray(webSources), "web-source-ledger.json: webSources 배열이 필요합니다.");
requireValue(Array.isArray(youtubeSources), "youtube-source-ledger.json: youtubeSources 배열이 필요합니다.");
requireValue(Array.isArray(facts), "fact-cards.json: facts 배열이 필요합니다.");
requireValue(Array.isArray(tmiItems), "tmi-candidates.json: items 또는 candidates 배열이 필요합니다.");
requireValue(webSources.length >= 20, `웹 출처가 ${webSources.length}건입니다. 대규모 샘플 기준은 20건 이상입니다.`);
requireValue(youtubeSources.length >= 50, `YouTube 표본이 ${youtubeSources.length}건입니다. 대규모 샘플 기준은 50건 이상입니다.`);
requireValue(facts.length >= 35, `사실 카드가 ${facts.length}건입니다. 샘플 기준은 35건 이상입니다.`);
requireValue(tmiItems.length >= 15, `TMI 후보가 ${tmiItems.length}건입니다. 샘플 기준은 15건 이상입니다.`);

const sourceIds = new Set();
const sourceUrls = new Set();
const videoIds = new Set();

for (const [index, source] of webSources.entries()) {
  const location = `webSources[${index}]`;
  requireValue(typeof source.id === "string" && source.id.startsWith("web-"), `${location}: web-* 형식의 id가 필요합니다.`);
  requireValue(typeof source.url === "string" && /^https?:\/\//.test(source.url), `${location}: 유효한 URL이 필요합니다.`);
  requireValue(["direct", "context"].includes(source.role), `${location}: role은 direct 또는 context여야 합니다.`);
  requireValue(typeof source.summary === "string" && source.summary.length > 0, `${location}: 요약이 필요합니다.`);
  if (source.summary?.length > 1200) errors.push(`${location}: 요약이 1,200자를 넘어 원문 과다 저장 가능성이 있습니다.`);
  if (sourceIds.has(source.id)) errors.push(`${location}: 중복 출처 id ${source.id}`);
  if (sourceUrls.has(source.url)) warnings.push(`${location}: 중복 URL ${source.url}`);
  sourceIds.add(source.id);
  sourceUrls.add(source.url);
}

for (const [index, source] of youtubeSources.entries()) {
  const location = `youtubeSources[${index}]`;
  requireValue(typeof source.videoId === "string" && source.videoId.length >= 10, `${location}: videoId가 필요합니다.`);
  requireValue(source.id === `yt-${source.videoId}`, `${location}: id는 yt-${source.videoId ?? "VIDEOID"}여야 합니다.`);
  requireValue(typeof source.url === "string" && source.url.includes(source.videoId), `${location}: URL에 videoId가 포함돼야 합니다.`);
  requireValue(["direct", "context"].includes(source.role), `${location}: role은 direct 또는 context여야 합니다.`);
  requireValue(typeof source.title === "string" && source.title.length > 0, `${location}: 제목이 필요합니다.`);
  requireValue(typeof source.summary === "string" && source.summary.length > 0, `${location}: 설명 요약이 필요합니다.`);
  requireValue(["available", "available-empty", "unavailable"].includes(source.commentStatus), `${location}: commentStatus 값이 올바르지 않습니다.`);
  requireValue(Array.isArray(source.commentThemes), `${location}: 익명 commentThemes 배열이 필요합니다.`);
  if (source.summary?.length > 1200) errors.push(`${location}: 설명 요약이 1,200자를 넘어 원문 과다 저장 가능성이 있습니다.`);
  for (const [themeIndex, theme] of (source.commentThemes ?? []).entries()) {
    if (typeof theme !== "string" || theme.length > 600) {
      errors.push(`${location}.commentThemes[${themeIndex}]: 600자 이하 익명 요약이어야 합니다.`);
    }
  }
  if (sourceIds.has(source.id)) errors.push(`${location}: 중복 출처 id ${source.id}`);
  if (videoIds.has(source.videoId)) errors.push(`${location}: 중복 videoId ${source.videoId}`);
  sourceIds.add(source.id);
  videoIds.add(source.videoId);
}

const allowedAssessments = new Set(["verified", "reported", "contested", "anecdotal", "inferred", "unresolved"]);
const allowedConfidence = new Set(["high", "medium", "low"]);
const factIds = new Set();

for (const [index, fact] of facts.entries()) {
  const location = `facts[${index}]`;
  requireValue(typeof fact.id === "string" && fact.id.length > 0, `${location}: id가 필요합니다.`);
  requireValue(typeof fact.claim === "string" && fact.claim.length > 0, `${location}: claim이 필요합니다.`);
  requireValue(allowedAssessments.has(fact.assessment), `${location}: assessment ${fact.assessment}는 허용되지 않습니다.`);
  requireValue(allowedConfidence.has(fact.confidence), `${location}: confidence ${fact.confidence}는 허용되지 않습니다.`);
  requireValue(Array.isArray(fact.sourceRefs) && fact.sourceRefs.length > 0, `${location}: sourceRefs가 하나 이상 필요합니다.`);
  if (factIds.has(fact.id)) errors.push(`${location}: 중복 사실 id ${fact.id}`);
  factIds.add(fact.id);
  for (const sourceRef of fact.sourceRefs ?? []) {
    if (!sourceIds.has(sourceRef)) errors.push(`${location}: 존재하지 않는 출처 참조 ${sourceRef}`);
  }
}

const allowedEditorialStatuses = new Set(["ready", "needs-caveat", "hold"]);
const tmiIds = new Set();
for (const [index, item] of tmiItems.entries()) {
  const location = `tmiItems[${index}]`;
  requireValue(typeof item.id === "string" && item.id.length > 0, `${location}: id가 필요합니다.`);
  requireValue(typeof item.headline === "string" && item.headline.length > 0, `${location}: headline이 필요합니다.`);
  requireValue(typeof item.narrative === "string" && item.narrative.length > 0, `${location}: narrative가 필요합니다.`);
  requireValue(allowedEditorialStatuses.has(item.editorialStatus), `${location}: editorialStatus ${item.editorialStatus}는 허용되지 않습니다.`);
  requireValue(Array.isArray(item.factRefs) && item.factRefs.length > 0, `${location}: factRefs가 하나 이상 필요합니다.`);
  requireValue(Array.isArray(item.sourceRefs) && item.sourceRefs.length > 0, `${location}: sourceRefs가 하나 이상 필요합니다.`);
  if (tmiIds.has(item.id)) errors.push(`${location}: 중복 TMI id ${item.id}`);
  tmiIds.add(item.id);
  for (const factRef of item.factRefs ?? []) {
    if (!factIds.has(factRef)) errors.push(`${location}: 존재하지 않는 사실 참조 ${factRef}`);
  }
  for (const sourceRef of item.sourceRefs ?? []) {
    if (!sourceIds.has(sourceRef)) errors.push(`${location}: 존재하지 않는 출처 참조 ${sourceRef}`);
  }
}

const forbiddenKeys = new Set([
  "rawComments",
  "comments",
  "commentAuthors",
  "rawDescription",
  "descriptionRaw",
  "fullLyrics",
  "lyricsText",
  "transcript"
]);
collectKeys(webLedger, "web-source-ledger", forbiddenKeys);
collectKeys(youtubeLedger, "youtube-source-ledger", forbiddenKeys);
collectKeys(factFile, "fact-cards", forbiddenKeys);
collectKeys(tmiFile, "tmi-candidates", forbiddenKeys);

for (const warning of warnings) console.warn(`경고: ${warning}`);
if (errors.length > 0) {
  for (const error of errors) console.error(`오류: ${error}`);
  console.error(`\n검증 실패: 오류 ${errors.length}건, 경고 ${warnings.length}건`);
  process.exit(1);
}

console.log(`검증 통과: 웹 ${webSources.length}건 · YouTube ${youtubeSources.length}건 · 사실 ${facts.length}건 · TMI ${tmiItems.length}건`);
if (warnings.length > 0) console.log(`경고 ${warnings.length}건은 위 내용을 확인하세요.`);
