import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = process.env.REVIEW_PROJECT_ROOT
  ? path.resolve(process.env.REVIEW_PROJECT_ROOT)
  : path.resolve(scriptDirectory, "..");
const reviewDirectory = path.join(projectRoot, "review");
const batchesDirectory = path.join(projectRoot, "research", "batches");
const deepResearchDirectory = path.join(projectRoot, "research", "deep");
const deepBatchesDirectory = path.join(deepResearchDirectory, "batches");
const deepDecisionsPath = path.join(deepResearchDirectory, "decisions.json");
const dataDirectory = path.join(projectRoot, "data");
const deepAggregateBatchId = "deep-research";

const host = process.env.REVIEW_HOST || "127.0.0.1";
const parsedPort = Number.parseInt(process.env.REVIEW_PORT || "4174", 10);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 4174;
const reviewPin = process.env.REVIEW_PIN || "5678";
const sessionCookieName = "cheers_review_session";
const sessionLifetimeMs = 12 * 60 * 60 * 1000;
const sessions = new Map();
const loginAttempts = new Map();
let mutationInProgress = false;

const catalogPaths = {
  teams: path.join(dataDirectory, "teams.json"),
  originals: path.join(dataDirectory, "original-songs.json"),
  cheerSongs: path.join(dataDirectory, "cheer-songs.json"),
  media: path.join(dataDirectory, "media.json"),
};

const staticFiles = new Map([
  ["/", { file: "index.html", type: "text/html; charset=utf-8" }],
  ["/review", { file: "index.html", type: "text/html; charset=utf-8" }],
  ["/app.js", { file: "app.js", type: "text/javascript; charset=utf-8" }],
  ["/styles.css", { file: "styles.css", type: "text/css; charset=utf-8" }],
]);

function securityHeaders(contentType) {
  return {
    "Cache-Control": "no-store",
    "Content-Type": contentType,
    "Cross-Origin-Opener-Policy": "same-origin",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' data: https://i.ytimg.com",
      "frame-src https://www.youtube-nocookie.com",
      "connect-src 'self'",
      "base-uri 'none'",
      "form-action 'self'",
    ].join("; "),
  };
}

function sendJson(response, status, payload, extraHeaders = {}) {
  response.writeHead(status, {
    ...securityHeaders("application/json; charset=utf-8"),
    ...extraHeaders,
  });
  response.end(`${JSON.stringify(payload)}\n`);
}

function sendText(response, status, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(status, securityHeaders(contentType));
  response.end(body);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeTextAtomic(filePath, value) {
  const temporaryPath = `${filePath}.${process.pid}.${randomBytes(5).toString("hex")}.tmp`;
  await writeFile(temporaryPath, value, "utf8");
  await rename(temporaryPath, filePath);
}

async function writeJsonAtomic(filePath, value) {
  await writeTextAtomic(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function formatInlineObject(value) {
  return `{${Object.entries(value)
    .map(([key, item]) => `${JSON.stringify(key)}: ${JSON.stringify(item)}`)
    .join(", ")}}`;
}

function formatCanonicalJson(value, indentation = 0, fieldPath = []) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  const padding = " ".repeat(indentation);
  const childPadding = " ".repeat(indentation + 2);

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.every((item) => item === null || typeof item !== "object")) {
      return `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
    }
    if (
      fieldPath.at(-1) === "sources" &&
      value.every((item) => item && typeof item === "object" && !Array.isArray(item) && Object.values(item).every((entry) => entry === null || typeof entry !== "object"))
    ) {
      return `[\n${value.map((item) => `${childPadding}${formatInlineObject(item)}`).join(",\n")}\n${padding}]`;
    }
    return `[\n${value
      .map((item) => `${childPadding}${formatCanonicalJson(item, indentation + 2, fieldPath)}`)
      .join(",\n")}\n${padding}]`;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) return "{}";
  return `{\n${entries
    .map(([key, item]) => `${childPadding}${JSON.stringify(key)}: ${formatCanonicalJson(item, indentation + 2, [...fieldPath, key])}`)
    .join(",\n")}\n${padding}}`;
}

function stringifyCanonicalCatalog(value) {
  return `${formatCanonicalJson(value)}\n`;
}

function parseCookies(request) {
  return Object.fromEntries(
    (request.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        return separator === -1
          ? [part, ""]
          : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      }),
  );
}

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [token, expiresAt] of sessions.entries()) {
    if (expiresAt <= now) sessions.delete(token);
  }
}

function isAuthenticated(request) {
  cleanExpiredSessions();
  const token = parseCookies(request)[sessionCookieName];
  const expiresAt = token ? sessions.get(token) : undefined;
  return Boolean(expiresAt && expiresAt > Date.now());
}

function pinsMatch(candidate, expected) {
  const candidateHash = createHash("sha256").update(String(candidate)).digest();
  const expectedHash = createHash("sha256").update(String(expected)).digest();
  return timingSafeEqual(candidateHash, expectedHash);
}

function clientKey(request) {
  return request.socket.remoteAddress || "local";
}

function canAttemptLogin(request) {
  const key = clientKey(request);
  const cutoff = Date.now() - 60_000;
  const recent = (loginAttempts.get(key) || []).filter((time) => time > cutoff);
  loginAttempts.set(key, recent);
  return recent.length < 8;
}

function recordFailedLogin(request) {
  const key = clientKey(request);
  loginAttempts.set(key, [...(loginAttempts.get(key) || []), Date.now()]);
}

async function readRequestJson(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_500_000) throw new Error("요청 본문이 너무 큽니다.");
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("JSON 요청을 읽을 수 없습니다.");
  }
}

function assertCatalog(file, label) {
  if (file?.schemaVersion !== 1 || !Array.isArray(file?.items)) {
    throw new Error(`${label}의 형식이 올바르지 않습니다.`);
  }
  return file;
}

async function loadCatalogs() {
  const [teams, originals, cheerSongs, media] = await Promise.all([
    readJson(catalogPaths.teams),
    readJson(catalogPaths.originals),
    readJson(catalogPaths.cheerSongs),
    readJson(catalogPaths.media),
  ]);

  return {
    teams: assertCatalog(teams, "teams.json"),
    originals: assertCatalog(originals, "original-songs.json"),
    cheerSongs: assertCatalog(cheerSongs, "cheer-songs.json"),
    media: assertCatalog(media, "media.json"),
  };
}

async function listBatchIds() {
  const entries = await readdir(batchesDirectory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .reverse();
}

async function listDeepBatchFiles() {
  const entries = await readdir(deepBatchesDirectory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.json$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

async function loadOptionalJson(filePath, fallback) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

async function loadBatch(batchId) {
  if (!(await listBatchIds()).includes(batchId)) throw new Error("존재하지 않는 조사 배치입니다.");
  const directory = path.join(batchesDirectory, batchId);
  const candidatesPath = path.join(directory, "candidates.json");
  const evidencePath = path.join(directory, "evidence.json");
  const decisionsPath = path.join(directory, "decisions.json");
  const titlesPath = path.join(directory, "titles.json");
  const inventoryPath = path.join(directory, "inventory.json");
  const inventoryDecisionsPath = path.join(directory, "inventory-decisions.json");

  const [candidates, evidence, decisions, titles, inventory, inventoryDecisions] = await Promise.all([
    loadOptionalJson(candidatesPath, { schemaVersion: 1, batchId, items: [] }),
    loadOptionalJson(evidencePath, { schemaVersion: 1, batchId, items: [] }),
    loadOptionalJson(decisionsPath, { schemaVersion: 1, batchId, items: [] }),
    loadOptionalJson(titlesPath, { schemaVersion: 1, batchId, organizations: [] }),
    loadOptionalJson(inventoryPath, { schemaVersion: 1, batchId, organizations: [] }),
    loadOptionalJson(inventoryDecisionsPath, { schemaVersion: 1, batchId, items: [] }),
  ]);

  for (const [value, label] of [
    [candidates, "candidates.json"],
    [evidence, "evidence.json"],
    [decisions, "decisions.json"],
  ]) {
    if (value?.schemaVersion !== 1 || !Array.isArray(value?.items)) {
      throw new Error(`${batchId}/${label}의 형식이 올바르지 않습니다.`);
    }
  }

  for (const [value, label] of [
    [titles, "titles.json"],
    [inventory, "inventory.json"],
  ]) {
    if (value?.schemaVersion !== 1 || !Array.isArray(value?.organizations)) {
      throw new Error(`${batchId}/${label}의 형식이 올바르지 않습니다.`);
    }
  }
  if (inventoryDecisions?.schemaVersion !== 1 || !Array.isArray(inventoryDecisions?.items)) {
    throw new Error(`${batchId}/inventory-decisions.json의 형식이 올바르지 않습니다.`);
  }

  return {
    batchId,
    directory,
    candidatesPath,
    evidencePath,
    decisionsPath,
    titlesPath,
    inventoryPath,
    inventoryDecisionsPath,
    candidates,
    evidence,
    decisions,
    titles,
    inventory,
    inventoryDecisions,
  };
}

function assertDeepBatch(batch, fileName) {
  if (
    batch?.schemaVersion !== 1 ||
    typeof batch?.batchId !== "string" ||
    !batch?.organization ||
    typeof batch.organization.id !== "string" ||
    typeof batch.organization.name !== "string" ||
    !Array.isArray(batch?.items) ||
    !Array.isArray(batch?.evidence) ||
    !Array.isArray(batch?.youtubeSamples)
  ) {
    throw new Error(`research/deep/batches/${fileName}의 형식이 올바르지 않습니다.`);
  }
  return batch;
}

async function loadDeepResearch() {
  const fileNames = await listDeepBatchFiles();
  const [batches, decisions] = await Promise.all([
    Promise.all(fileNames.map(async (fileName) =>
      assertDeepBatch(await readJson(path.join(deepBatchesDirectory, fileName)), fileName),
    )),
    loadOptionalJson(deepDecisionsPath, {
      schemaVersion: 1,
      batchId: deepAggregateBatchId,
      items: [],
    }),
  ]);

  if (decisions?.schemaVersion !== 1 || !Array.isArray(decisions?.items)) {
    throw new Error("research/deep/decisions.json의 형식이 올바르지 않습니다.");
  }
  return { batches, decisions };
}

function normalizeComparableTitle(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("ko")
    .replace(/[‘’'“”\"「」『』]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function comparableTitleVariants(value) {
  const original = String(value || "");
  const withoutAnnotations = original
    .replace(/\([^)]*\)/g, " ")
    .replace(/（[^）]*）/g, " ")
    .replace(/\[[^\]]*\]/g, " ");
  return new Set(
    [normalizeComparableTitle(original), normalizeComparableTitle(withoutAnnotations)].filter(Boolean),
  );
}

function comparableTitlesMatch(left, right) {
  const leftVariants = comparableTitleVariants(left);
  const rightVariants = comparableTitleVariants(right);
  return [...leftVariants].some((variant) => rightVariants.has(variant));
}

function findOriginalSongId(candidate, originals) {
  const sourceWork = normalizeComparableTitle(
    candidate.origin?.sourceWork || candidate.origin?.underlyingWork || "",
  );
  if (!sourceWork) return "";

  const exact = originals.find((song) => normalizeComparableTitle(song.title) === sourceWork);
  if (exact) return exact.id;

  const contained = originals.find((song) => {
    const title = normalizeComparableTitle(song.title);
    return title && (sourceWork.includes(title) || title.includes(sourceWork));
  });
  return contained?.id || "";
}

function evidenceSources(candidate, evidenceItems) {
  const evidenceIds = new Set(candidate.evidenceRefs || []);
  const records = evidenceItems.filter(
    (evidence) => evidence.candidateId === candidate.id || evidenceIds.has(evidence.id),
  );
  const sources = [];

  for (const evidence of records) {
    const scope = evidence.kind === "youtube" ? "usage" : undefined;
    if (typeof evidence.url === "string") {
      sources.push({ label: evidence.title || evidence.publisher || "조사 근거", url: evidence.url, scope });
    }
    for (const source of evidence.sources || []) {
      if (typeof source?.url === "string") {
        sources.push({ label: source.title || evidence.title || "조사 근거", url: source.url });
      }
    }
  }

  const seen = new Set();
  return sources
    .filter(({ url }) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .slice(0, 8);
}

function deriveYear(candidate) {
  const chronology = candidate.chronology || {};
  const introductionYear = Number.isInteger(chronology.introductionYear)
    ? chronology.introductionYear
    : null;
  const reportedYear = Number.isInteger(chronology.reportedIntroductionYear)
    ? chronology.reportedIntroductionYear
    : null;
  const documentedYear = Number.isInteger(chronology.earliestDocumentedYear)
    ? chronology.earliestDocumentedYear
    : null;
  const timelineYear = introductionYear || reportedYear || documentedYear || new Date().getFullYear();
  const yearStatus = introductionYear
    ? "confirmed"
    : reportedYear
      ? "reported"
      : "earliest-documented";
  const yearLabel =
    chronology.displayLabel ||
    (introductionYear
      ? `since ${introductionYear}`
      : reportedYear
        ? `추정 시작 연도 ${reportedYear} · 정확한 도입 연도 불명확`
        : `최초 확인 ${timelineYear} · 공식 도입 연도 불명확`);

  return {
    year: introductionYear,
    timelineYear,
    yearStatus,
    yearLabel,
  };
}

function deriveOriginType(relationship) {
  if (["adaptation", "arrangement", "combined-adaptation", "commissioned-original"].includes(relationship)) {
    return relationship;
  }
  return relationship === "motif-or-arrangement" ? "arrangement" : "adaptation";
}

function deriveDraft(candidate, evidenceItems, catalogs) {
  const team = catalogs.teams.items.find((item) => item.name === candidate.teamName);
  const year = deriveYear(candidate);
  const sourceWork = candidate.origin?.sourceWork || candidate.origin?.underlyingWork || "원곡";
  const originNote =
    candidate.origin?.notes ||
    (sourceWork ? `${sourceWork}와의 관계를 조사 근거에 따라 정리했다.` : "원곡 관계를 입력하세요.");

  return {
    id: candidate.id,
    title: candidate.resolvedTitle || candidate.requestedLabels?.[0] || candidate.id,
    aliases: Array.isArray(candidate.aliases) ? candidate.aliases : [],
    symbolicLines: ["", ""],
    teamId: team?.id || "",
    originalSongId: findOriginalSongId(candidate, catalogs.originals.items),
    originType: deriveOriginType(candidate.origin?.relationship),
    originNote,
    ...year,
    chronologyNote: candidate.chronology?.notes || "",
    lyrics: [],
    description: candidate.description || "",
    usageContext: candidate.usageContext || "",
    status: "verified",
    sources: evidenceSources(candidate, evidenceItems),
  };
}

function normalizeCanonicalRecord(input, candidateId) {
  const strings = (items) =>
    Array.isArray(items)
      ? [...new Set(items.map((item) => String(item).trim()).filter(Boolean))]
      : [];
  const sourceItems = Array.isArray(input?.sources) ? input.sources : [];
  const secondaryOriginalSongIds = strings(input?.secondaryOriginalSongIds);
  const sourceCheerSongId = String(input?.sourceCheerSongId || "").trim();
  const durationSeconds = Number.isInteger(input?.durationSeconds) && input.durationSeconds > 0
    ? input.durationSeconds
    : null;
  const record = {
    id: candidateId,
    title: String(input?.title || "").trim(),
    aliases: strings(input?.aliases),
    symbolicLines: Array.isArray(input?.symbolicLines)
      ? input.symbolicLines.slice(0, 2).map((line) => String(line).trim())
      : [],
    teamId: String(input?.teamId || "").trim(),
    originalSongId: String(input?.originalSongId || "").trim(),
    ...(secondaryOriginalSongIds.length > 0 ? { secondaryOriginalSongIds } : {}),
    ...(sourceCheerSongId ? { sourceCheerSongId } : {}),
    originType: String(input?.originType || "").trim(),
    originNote: String(input?.originNote || "").trim(),
    year: Number.isInteger(input?.year) ? input.year : null,
    timelineYear: Number.isInteger(input?.timelineYear) ? input.timelineYear : null,
    yearStatus: String(input?.yearStatus || "").trim(),
    yearLabel: String(input?.yearLabel || "").trim(),
    chronologyNote: String(input?.chronologyNote || "").trim(),
    ...(durationSeconds ? { durationSeconds } : {}),
    lyrics: Array.isArray(input?.lyrics) ? input.lyrics.map((line) => String(line)) : [],
    description: String(input?.description || "").trim(),
    usageContext: String(input?.usageContext || "").trim(),
    status: input?.status === "draft" ? "draft" : "verified",
    sources: sourceItems.map((source) => {
      const normalized = {
        label: String(source?.label || "").trim(),
        url: String(source?.url || "").trim(),
      };
      if (["title", "origin", "chronology", "usage"].includes(source?.scope)) {
        normalized.scope = source.scope;
      }
      return normalized;
    }),
  };
  return record;
}

function validateCanonicalRecord(record, catalogs) {
  const errors = [];
  const currentYear = new Date().getFullYear();
  const required = [
    "id",
    "title",
    "teamId",
    "originalSongId",
    "originType",
    "originNote",
    "yearStatus",
    "yearLabel",
    "chronologyNote",
    "description",
    "usageContext",
  ];
  for (const field of required) {
    if (typeof record[field] !== "string" || record[field].trim() === "") {
      errors.push(`${field} 값을 입력하세요.`);
    }
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id || "")) {
    errors.push("id는 영문 소문자·숫자·하이픈만 사용할 수 있습니다.");
  }
  if (!Array.isArray(record.symbolicLines) || record.symbolicLines.length !== 2 || record.symbolicLines.some((line) => !line)) {
    errors.push("상징 문구 두 줄을 모두 입력하세요.");
  }
  if (!catalogs.teams.items.some(({ id }) => id === record.teamId)) {
    errors.push("정본 데이터에 등록된 팀을 선택하세요.");
  }
  if (!catalogs.originals.items.some(({ id }) => id === record.originalSongId)) {
    errors.push("정본 데이터에 등록된 원곡을 선택하세요.");
  }
  if (!["adaptation", "arrangement", "combined-adaptation", "commissioned-original"].includes(record.originType)) {
    errors.push("원곡 관계 유형을 선택하세요.");
  }
  if (!["confirmed", "earliest-documented", "reported"].includes(record.yearStatus)) {
    errors.push("연도 상태를 선택하세요.");
  }
  if (!Number.isInteger(record.timelineYear) || record.timelineYear < 1800 || record.timelineYear > currentYear + 1) {
    errors.push(`기준 연도는 1800~${currentYear + 1} 범위여야 합니다.`);
  }
  if (record.yearStatus === "confirmed" && (!Number.isInteger(record.year) || record.year !== record.timelineYear)) {
    errors.push("확정 연도는 도입 연도와 기준 연도가 같아야 합니다.");
  }
  if (record.yearStatus !== "confirmed" && record.year !== null) {
    errors.push("미확정 연도인 경우 도입 연도는 비워야 합니다.");
  }
  if (!Array.isArray(record.sources) || (record.status === "verified" && record.sources.length === 0)) {
    errors.push("검증 완료 레코드에는 출처가 하나 이상 필요합니다.");
  }
  for (const [index, source] of (record.sources || []).entries()) {
    if (!source.label) errors.push(`출처 ${index + 1}의 이름을 입력하세요.`);
    try {
      const url = new URL(source.url);
      if (!new Set(["http:", "https:"]).has(url.protocol)) throw new Error("protocol");
    } catch {
      errors.push(`출처 ${index + 1}의 URL이 올바르지 않습니다.`);
    }
  }
  if (record.sourceCheerSongId && !catalogs.cheerSongs.items.some(({ id }) => id === record.sourceCheerSongId)) {
    errors.push("직접 차용한 응원가가 정본 데이터에 없습니다.");
  }
  if (record.sourceCheerSongId === record.id) {
    errors.push("응원가가 자기 자신을 직접 차용한 곡으로 지정될 수 없습니다.");
  }
  for (const originalSongId of record.secondaryOriginalSongIds || []) {
    if (!catalogs.originals.items.some(({ id }) => id === originalSongId)) {
      errors.push(`보조 원곡 '${originalSongId}'이 정본 데이터에 없습니다.`);
    }
  }
  return errors;
}

function buildCandidateView(candidate, batch, catalogs) {
  const decision = batch.decisions.items.find((item) => item.candidateId === candidate.id) || null;
  const canonical = catalogs.cheerSongs.items.find((item) => item.id === candidate.id) || null;
  const referencedEvidence = new Set(candidate.evidenceRefs || []);
  const evidence = batch.evidence.items.filter(
    (item) => item.candidateId === candidate.id || referencedEvidence.has(item.id),
  );
  const draft = decision?.canonicalDraft || canonical || deriveDraft(candidate, evidence, catalogs);
  const validationErrors = validateCanonicalRecord(normalizeCanonicalRecord(draft, candidate.id), catalogs);

  return {
    candidate,
    decision,
    canonical,
    draft,
    evidence,
    validationErrors,
    isPublished: Boolean(canonical),
  };
}

async function readInventoryDetail(directory, organization) {
  const detailRef = String(organization.detailRef || "");
  const fileName = detailRef.split("#")[0].replace(/^\.\//, "");
  if (!/^[a-z0-9-]+\.md$/i.test(fileName)) return { excerpt: "", urls: [] };
  const filePath = path.resolve(directory, fileName);
  if (path.dirname(filePath) !== path.resolve(directory)) return { excerpt: "", urls: [] };

  let contents;
  try {
    contents = await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return { excerpt: "", urls: [] };
    throw error;
  }

  const lines = contents.split(/\r?\n/);
  const heading = `## ${organization.name}`;
  let start = lines.findIndex((line) => line.trim() === heading);
  let end;
  if (start >= 0) {
    end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
    if (end === -1) end = Math.min(lines.length, start + 45);
  } else {
    start = lines.findIndex((line) => line.includes(`| ${organization.name} |`) || line.includes(organization.name));
    if (start === -1) return { excerpt: "", urls: [] };
    start = Math.max(0, start - 2);
    end = Math.min(lines.length, start + 9);
  }

  const excerpt = lines.slice(start, end).join("\n").trim().slice(0, 9_000);
  const urls = [...new Set(excerpt.match(/https?:\/\/[^\s)>|]+/g) || [])];
  return { excerpt, urls };
}

function inventoryDecisionKey(organizationId, title) {
  return `${organizationId}\u0000${title}`;
}

async function buildInventoryBatchView(batch, catalogs) {
  const inventoryOrganizations = batch.inventory.organizations;
  const decisionByKey = new Map(
    batch.inventoryDecisions.items.map((decision) => [
      inventoryDecisionKey(decision.organizationId, decision.title),
      decision,
    ]),
  );
  const organizations = [];
  const inventoryItems = [];

  for (const organization of batch.titles.organizations) {
    const inventoryOrganization = inventoryOrganizations.find((item) =>
      item.name === organization.name ||
      item.id === organization.id ||
      `kbo-${item.id}` === organization.id,
    );
    const detail = await readInventoryDetail(batch.directory, organization);
    const sources = [...new Set([...(inventoryOrganization?.sources || []), ...detail.urls])];
    const possibleTeams = catalogs.teams.items.filter(({ name }) =>
      organization.name.includes(name) || name.includes(organization.name.replace(/\s+(신촌|서울·ERICA)$/u, "")),
    );
    const possibleTeamIds = new Set(possibleTeams.map(({ id }) => id));

    const createItem = (title, listStatus) => {
      const canonicalMatches = catalogs.cheerSongs.items
        .filter((song) => {
          const titleMatches = [song.title, ...(song.aliases || [])]
            .some((label) => comparableTitlesMatch(label, title));
          return titleMatches && possibleTeamIds.has(song.teamId);
        })
        .map(({ id, title: canonicalTitle, teamId }) => ({ id, title: canonicalTitle, teamId }));
      const decision = decisionByKey.get(inventoryDecisionKey(organization.id, title)) || null;
      const alreadyApproved = organization.existingApprovedTitles.some((approvedTitle) =>
        comparableTitlesMatch(approvedTitle, title),
      ) || canonicalMatches.length > 0;
      const itemId = createHash("sha256")
        .update(`${organization.id}\u0000${title}`)
        .digest("hex")
        .slice(0, 16);
      inventoryItems.push({
        itemId,
        organizationId: organization.id,
        organizationName: organization.name,
        organizationType: organization.type,
        title,
        listStatus,
        alreadyApproved,
        canonicalMatches,
        decision,
      });
    };

    organization.currentTitles.forEach((title) => createItem(title, "current"));
    organization.uncertainTitles.forEach((title) => createItem(title, "uncertain"));
    organizations.push({
      id: organization.id,
      name: organization.name,
      type: organization.type,
      currentCount: organization.currentTitles.length,
      uncertainCount: organization.uncertainTitles.length,
      existingApprovedCount: organization.existingApprovedTitles.length,
      detailRef: organization.detailRef || inventoryOrganization?.detailRef || "",
      detailExcerpt: detail.excerpt,
      sources,
    });
  }

  return {
    batchId: batch.batchId,
    kind: "inventory",
    checkedAt: batch.titles.checkedAt || batch.inventory.checkedAt || null,
    status: batch.inventory.status || "title-inventory",
    organizations,
    inventoryItems,
    discrepancyNotes: Array.isArray(batch.titles.discrepancyNotes) ? batch.titles.discrepancyNotes : [],
  };
}

function deepItemEvidenceRefs(item) {
  const refs = new Set(Array.isArray(item.evidenceRefs) ? item.evidenceRefs : []);
  for (const claim of item.claims || []) {
    for (const ref of claim.evidenceRefs || []) refs.add(ref);
  }
  for (const trivia of item.trivia || []) {
    for (const ref of trivia.evidenceRefs || []) refs.add(ref);
  }
  return refs;
}

function evidenceSupportsDeepItem(record, songId) {
  return (record.supports || []).some((support) => {
    const value = String(support || "");
    return value === songId || value.startsWith(`${songId}.`) || value.startsWith("all.");
  });
}

function findDeepCanonicalMatches(item, organization, catalogs) {
  const possibleTeamIds = new Set(
    catalogs.teams.items
      .filter(({ id, name }) =>
        id === organization.id ||
        organization.name.includes(name) ||
        name.includes(organization.name.replace(/\s+(신촌|서울·ERICA|서울·국제)$/u, "")),
      )
      .map(({ id }) => id),
  );
  const labels = [item.title, ...(item.aliases || [])];
  return catalogs.cheerSongs.items
    .filter((song) =>
      song.id === item.id ||
      (possibleTeamIds.has(song.teamId) &&
        [song.title, ...(song.aliases || [])].some((canonicalLabel) =>
          labels.some((label) => comparableTitlesMatch(canonicalLabel, label)),
        )),
    )
    .map(({ id, title, teamId }) => ({ id, title, teamId }));
}

function deepResearchHash(song, evidence, youtubeSamples) {
  return createHash("sha256")
    .update(JSON.stringify({ song, evidence, youtubeSamples }))
    .digest("hex")
    .slice(0, 16);
}

function buildDeepBatchView(deepResearch, catalogs) {
  const decisionBySongId = new Map(
    deepResearch.decisions.items.map((decision) => [decision.songId, decision]),
  );
  const organizationById = new Map();
  const deepItems = [];
  let evidenceCount = 0;
  let youtubeSampleCount = 0;

  for (const batch of deepResearch.batches) {
    const organization = batch.organization;
    if (!organizationById.has(organization.id)) {
      organizationById.set(organization.id, {
        id: organization.id,
        name: organization.name,
        type: organization.type,
        itemCount: 0,
        batchCount: 0,
      });
    }
    const organizationSummary = organizationById.get(organization.id);
    organizationSummary.batchCount += 1;
    organizationSummary.itemCount += batch.items.length;
    evidenceCount += batch.evidence.length;
    youtubeSampleCount += batch.youtubeSamples.length;

    for (const song of batch.items) {
      const refs = deepItemEvidenceRefs(song);
      const videoRefs = new Set(song.youtubeSampleRefs || []);
      const evidence = batch.evidence.filter(
        (record) => refs.has(record.id) || evidenceSupportsDeepItem(record, song.id),
      );
      const youtubeSamples = batch.youtubeSamples.filter(
        (sample) => sample.songId === song.id || videoRefs.has(sample.id),
      );
      const researchHash = deepResearchHash(song, evidence, youtubeSamples);
      const storedDecision = decisionBySongId.get(song.id) || null;
      deepItems.push({
        itemId: song.id,
        sourceBatchId: batch.batchId,
        checkedAt: batch.checkedAt || null,
        batchStatus: batch.status || null,
        organization,
        rightsNote: batch.rightsNote || "",
        batchCoverage: batch.coverage || null,
        song,
        evidence,
        youtubeSamples,
        researchHash,
        decision: storedDecision
          ? { ...storedDecision, isStale: storedDecision.researchHash !== researchHash }
          : null,
        canonicalMatches: findDeepCanonicalMatches(song, organization, catalogs),
      });
    }
  }

  return {
    batchId: deepAggregateBatchId,
    kind: "deep",
    displayName: `심층 리서치 · ${deepItems.length}곡`,
    checkedAt: deepResearch.batches
      .map(({ checkedAt }) => checkedAt)
      .filter(Boolean)
      .sort()
      .at(-1) || null,
    status: "needs-review",
    sourceBatchCount: deepResearch.batches.length,
    evidenceCount,
    youtubeSampleCount,
    organizations: [...organizationById.values()].sort((left, right) =>
      left.name.localeCompare(right.name, "ko"),
    ),
    deepItems,
  };
}

async function buildState() {
  const [catalogs, batchIds, deepResearch] = await Promise.all([
    loadCatalogs(),
    listBatchIds(),
    loadDeepResearch(),
  ]);
  const batches = [];

  if (deepResearch.batches.length > 0) {
    batches.push(buildDeepBatchView(deepResearch, catalogs));
  }

  for (const batchId of batchIds) {
    const batch = await loadBatch(batchId);
    if (batch.titles.organizations.length > 0) {
      batches.push(await buildInventoryBatchView(batch, catalogs));
    }
    if (batch.candidates.items.length > 0) {
      batches.push({
        batchId,
        kind: "detailed",
        checkedAt: batch.candidates.checkedAt || batch.evidence.checkedAt || null,
        status: batch.candidates.status || null,
        candidates: batch.candidates.items.map((candidate) => buildCandidateView(candidate, batch, catalogs)),
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    batches,
    catalogs: {
      teams: catalogs.teams.items,
      originals: catalogs.originals.items,
      cheerSongs: catalogs.cheerSongs.items.map(({ id, title, teamId }) => ({ id, title, teamId })),
    },
  };
}

function upsertDecision(decisions, candidateId, updates) {
  const index = decisions.items.findIndex((item) => item.candidateId === candidateId);
  const existing = index === -1 ? { candidateId, confirmedBy: "user" } : decisions.items[index];
  const next = { ...existing, ...updates, candidateId, confirmedBy: "user" };
  if (index === -1) decisions.items.push(next);
  else decisions.items[index] = next;
  decisions.updatedAt = new Date().toISOString();
  return next;
}

async function withMutation(operation) {
  if (mutationInProgress) throw new Error("다른 저장 또는 검증 작업이 진행 중입니다.");
  mutationInProgress = true;
  try {
    return await operation();
  } finally {
    mutationInProgress = false;
  }
}

async function saveDecision({ batchId, candidateId, draft, decision, notes }) {
  return withMutation(async () => {
    const [batch, catalogs] = await Promise.all([loadBatch(batchId), loadCatalogs()]);
    if (!batch.candidates.items.some(({ id }) => id === candidateId)) {
      throw new Error("이 배치에서 조사 후보를 찾을 수 없습니다.");
    }
    if (!["pending", "approved", "rejected"].includes(decision)) {
      throw new Error("지원하지 않는 검수 결정입니다.");
    }

    const canonicalDraft = normalizeCanonicalRecord(draft, candidateId);
    const validationErrors = validateCanonicalRecord(canonicalDraft, catalogs);
    if (decision === "approved" && validationErrors.length > 0) {
      const error = new Error("필수 항목을 먼저 수정하세요.");
      error.details = validationErrors;
      throw error;
    }

    const now = new Date().toISOString();
    const saved = upsertDecision(batch.decisions, candidateId, {
      decision,
      canonicalDraft,
      notes: String(notes || "").trim(),
      reviewedAt: now,
      ...(decision === "approved" ? { approvedAt: now } : {}),
    });
    await writeJsonAtomic(batch.decisionsPath, batch.decisions);
    return { decision: saved, validationErrors };
  });
}

async function saveInventoryDecision({ batchId, organizationId, title, decision, resolvedTitle, notes }) {
  return withMutation(async () => {
    const batch = await loadBatch(batchId);
    const organization = batch.titles.organizations.find((item) => item.id === organizationId);
    if (!organization) throw new Error("목록에서 해당 조직을 찾을 수 없습니다.");
    const listStatus = organization.currentTitles.includes(title)
      ? "current"
      : organization.uncertainTitles.includes(title)
        ? "uncertain"
        : null;
    if (!listStatus) throw new Error("이 조직의 수집 목록에서 곡을 찾을 수 없습니다.");
    if (!["pending", "research-approved", "hold", "excluded"].includes(decision)) {
      throw new Error("지원하지 않는 목록 검수 결정입니다.");
    }

    const index = batch.inventoryDecisions.items.findIndex(
      (item) => item.organizationId === organizationId && item.title === title,
    );
    if (decision === "pending") {
      if (index !== -1) batch.inventoryDecisions.items.splice(index, 1);
    } else {
      const normalizedResolvedTitle = String(resolvedTitle || title).trim();
      if (!normalizedResolvedTitle) throw new Error("검수 후 사용할 곡명을 입력하세요.");
      const next = {
        organizationId,
        organizationName: organization.name,
        title,
        resolvedTitle: normalizedResolvedTitle,
        sourceStatus: listStatus,
        decision,
        notes: String(notes || "").trim(),
        confirmedBy: "user",
        reviewedAt: new Date().toISOString(),
      };
      if (index === -1) batch.inventoryDecisions.items.push(next);
      else batch.inventoryDecisions.items[index] = next;
    }

    batch.inventoryDecisions.batchId = batchId;
    batch.inventoryDecisions.updatedAt = new Date().toISOString();
    batch.inventoryDecisions.itemCount = batch.inventoryDecisions.items.length;
    await writeJsonAtomic(batch.inventoryDecisionsPath, batch.inventoryDecisions);
    return {
      decision: decision === "pending"
        ? null
        : batch.inventoryDecisions.items.find(
            (item) => item.organizationId === organizationId && item.title === title,
          ),
    };
  });
}

async function saveDeepDecision({ sourceBatchId, songId, decision, notes }) {
  return withMutation(async () => {
    const deepResearch = await loadDeepResearch();
    const batch = deepResearch.batches.find(({ batchId }) => batchId === sourceBatchId);
    if (!batch) throw new Error("심층 조사 배치를 찾을 수 없습니다.");
    const song = batch.items.find(({ id }) => id === songId);
    if (!song) throw new Error("심층 조사 배치에서 곡을 찾을 수 없습니다.");
    if (!["pending", "approved", "changes-requested", "hold"].includes(decision)) {
      throw new Error("지원하지 않는 심층 검수 결정입니다.");
    }

    const normalizedNotes = String(notes || "").trim();
    if (decision === "changes-requested" && !normalizedNotes) {
      throw new Error("수정이 필요한 내용을 검수 메모에 남겨주세요.");
    }

    const index = deepResearch.decisions.items.findIndex((item) => item.songId === songId);
    if (decision === "pending") {
      if (index !== -1) deepResearch.decisions.items.splice(index, 1);
    } else {
      const refs = deepItemEvidenceRefs(song);
      const videoRefs = new Set(song.youtubeSampleRefs || []);
      const evidence = batch.evidence.filter(
        (record) => refs.has(record.id) || evidenceSupportsDeepItem(record, song.id),
      );
      const youtubeSamples = batch.youtubeSamples.filter(
        (sample) => sample.songId === song.id || videoRefs.has(sample.id),
      );
      const now = new Date().toISOString();
      const next = {
        songId,
        title: song.title,
        organizationId: batch.organization.id,
        organizationName: batch.organization.name,
        sourceBatchId: batch.batchId,
        decision,
        notes: normalizedNotes,
        researchHash: deepResearchHash(song, evidence, youtubeSamples),
        confirmedBy: "user",
        reviewedAt: now,
        ...(decision === "approved" ? { approvedAt: now } : {}),
      };
      if (index === -1) deepResearch.decisions.items.push(next);
      else deepResearch.decisions.items[index] = next;
    }

    deepResearch.decisions.batchId = deepAggregateBatchId;
    deepResearch.decisions.updatedAt = new Date().toISOString();
    deepResearch.decisions.itemCount = deepResearch.decisions.items.length;
    await writeJsonAtomic(deepDecisionsPath, deepResearch.decisions);
    return {
      decision: decision === "pending"
        ? null
        : deepResearch.decisions.items.find((item) => item.songId === songId),
    };
  });
}

function runCommand(command, args) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: process.env,
      shell: false,
    });
    let output = "";
    const append = (chunk) => {
      output += chunk.toString("utf8");
      if (output.length > 120_000) output = output.slice(-120_000);
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    child.on("error", (error) => resolvePromise({ ok: false, output: error.message }));
    child.on("close", (code) => resolvePromise({ ok: code === 0, code, output: output.trim() }));
  });
}

async function publishApproved({ batchId, candidateIds }) {
  return withMutation(async () => {
    const [batch, catalogs] = await Promise.all([loadBatch(batchId), loadCatalogs()]);
    const requestedIds = Array.isArray(candidateIds) && candidateIds.length > 0
      ? new Set(candidateIds)
      : null;
    const decisions = batch.decisions.items.filter(
      (item) => item.decision === "approved" && (!requestedIds || requestedIds.has(item.candidateId)),
    );
    if (decisions.length === 0) throw new Error("반영할 승인 항목이 없습니다.");

    const nextCheerSongs = structuredClone(catalogs.cheerSongs);
    const errors = [];
    const records = [];
    for (const decision of decisions) {
      const existing = nextCheerSongs.items.find((item) => item.id === decision.candidateId);
      const draft = decision.canonicalDraft || existing;
      if (!draft) {
        errors.push(`${decision.candidateId}: 저장된 정본 초안이 없습니다.`);
        continue;
      }
      const record = normalizeCanonicalRecord(draft, decision.candidateId);
      for (const detail of validateCanonicalRecord(record, catalogs)) {
        errors.push(`${decision.candidateId}: ${detail}`);
      }
      records.push(record);
    }
    if (errors.length > 0) {
      const error = new Error("승인 항목을 반영할 수 없습니다.");
      error.details = errors;
      throw error;
    }

    for (const record of records) {
      const index = nextCheerSongs.items.findIndex((item) => item.id === record.id);
      if (index === -1) nextCheerSongs.items.push(record);
      else nextCheerSongs.items[index] = record;
    }

    const previousCheerSongs = await readFile(catalogPaths.cheerSongs, "utf8");
    const previousDecisions = await readFile(batch.decisionsPath, "utf8");
    await writeTextAtomic(catalogPaths.cheerSongs, stringifyCanonicalCatalog(nextCheerSongs));
    const validation = await runCommand(process.execPath, ["scripts/validate-data.mjs"]);
    if (!validation.ok) {
      await writeTextAtomic(catalogPaths.cheerSongs, previousCheerSongs);
      const error = new Error("데이터 검사에 실패해 정본 파일을 원상 복구했습니다.");
      error.details = [validation.output || "알 수 없는 검증 오류"];
      throw error;
    }

    try {
      const now = new Date().toISOString();
      for (const record of records) {
        const hash = createHash("sha256").update(JSON.stringify(record)).digest("hex").slice(0, 12);
        upsertDecision(batch.decisions, record.id, { publishedAt: now, publishedHash: hash });
      }
      await writeJsonAtomic(batch.decisionsPath, batch.decisions);
    } catch (error) {
      await Promise.all([
        writeTextAtomic(catalogPaths.cheerSongs, previousCheerSongs),
        writeTextAtomic(batch.decisionsPath, previousDecisions),
      ]);
      throw new Error(`검수 이력을 저장하지 못해 정본 파일을 원상 복구했습니다: ${error.message}`);
    }

    return {
      publishedIds: records.map(({ id }) => id),
      validationOutput: validation.output,
    };
  });
}

async function handleApi(request, response, url) {
  if (url.pathname === "/api/session" && request.method === "GET") {
    return sendJson(response, 200, { authenticated: isAuthenticated(request) });
  }

  if (url.pathname === "/api/login" && request.method === "POST") {
    if (!canAttemptLogin(request)) {
      return sendJson(response, 429, { error: "로그인 시도가 너무 많습니다. 1분 뒤 다시 시도하세요." });
    }
    const body = await readRequestJson(request);
    if (!pinsMatch(body.pin || "", reviewPin)) {
      recordFailedLogin(request);
      return sendJson(response, 401, { error: "비밀번호가 맞지 않습니다." });
    }
    loginAttempts.delete(clientKey(request));
    const token = randomBytes(32).toString("hex");
    sessions.set(token, Date.now() + sessionLifetimeMs);
    return sendJson(response, 200, { ok: true }, {
      "Set-Cookie": `${sessionCookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(sessionLifetimeMs / 1000)}`,
    });
  }

  if (url.pathname === "/api/logout" && request.method === "POST") {
    const token = parseCookies(request)[sessionCookieName];
    if (token) sessions.delete(token);
    return sendJson(response, 200, { ok: true }, {
      "Set-Cookie": `${sessionCookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`,
    });
  }

  if (!isAuthenticated(request)) {
    return sendJson(response, 401, { error: "다시 로그인하세요." });
  }

  if (url.pathname === "/api/state" && request.method === "GET") {
    return sendJson(response, 200, await buildState());
  }

  if (url.pathname === "/api/validate" && request.method === "POST") {
    const body = await readRequestJson(request);
    const catalogs = await loadCatalogs();
    const record = normalizeCanonicalRecord(body.draft, String(body.candidateId || ""));
    const errors = validateCanonicalRecord(record, catalogs);
    return sendJson(response, 200, { ok: errors.length === 0, errors, record });
  }

  if (url.pathname === "/api/decision" && request.method === "POST") {
    const body = await readRequestJson(request);
    const result = await saveDecision(body);
    return sendJson(response, 200, { ok: true, ...result });
  }

  if (url.pathname === "/api/inventory/decision" && request.method === "POST") {
    const body = await readRequestJson(request);
    const result = await saveInventoryDecision(body);
    return sendJson(response, 200, { ok: true, ...result });
  }

  if (url.pathname === "/api/deep/decision" && request.method === "POST") {
    const body = await readRequestJson(request);
    const result = await saveDeepDecision(body);
    return sendJson(response, 200, { ok: true, ...result });
  }

  if (url.pathname === "/api/publish" && request.method === "POST") {
    const body = await readRequestJson(request);
    const result = await publishApproved(body);
    return sendJson(response, 200, { ok: true, ...result });
  }

  if (url.pathname === "/api/check" && request.method === "POST") {
    const result = await withMutation(() => runCommand("npm", ["run", "check"]));
    return sendJson(response, result.ok ? 200 : 422, {
      ok: result.ok,
      output: result.output,
      error: result.ok ? undefined : "전체 검사에 실패했습니다.",
    });
  }

  return sendJson(response, 404, { error: "API를 찾을 수 없습니다." });
}

async function handleRequest(request, response) {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || `${host}:${port}`}`);
    if (url.pathname.startsWith("/api/")) return await handleApi(request, response, url);

    const asset = staticFiles.get(url.pathname.replace(/\/$/, "") || "/");
    if (!asset || request.method !== "GET") return sendText(response, 404, "찾을 수 없습니다.");
    const body = await readFile(path.join(reviewDirectory, asset.file));
    return sendText(response, 200, body, asset.type);
  } catch (error) {
    const status = error.message?.includes("진행 중") ? 409 : 400;
    return sendJson(response, status, {
      error: error.message || "요청을 처리하지 못했습니다.",
      details: Array.isArray(error.details) ? error.details : undefined,
    });
  }
}

const server = createServer(handleRequest);
server.listen(port, host, () => {
  console.log(`응원가 검수 도구: http://${host}:${port}/review`);
  console.log("기본 비밀번호: 5678 (REVIEW_PIN 환경변수로 변경 가능)");
  console.log("이 서버는 로컬 주소에만 연결됩니다. 종료하려면 Ctrl+C를 누르세요.");
});

server.on("error", (error) => {
  console.error(`검수 서버를 시작하지 못했습니다: ${error.message}`);
  process.exitCode = 1;
});
