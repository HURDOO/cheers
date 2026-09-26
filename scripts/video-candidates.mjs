import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { EditorialError } from "./content-editorial-store.mjs";

const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/u;
const SEARCH_RESULTS_PER_QUERY = 12;
const CANDIDATE_LIMIT = 10;
const DETAIL_CONCURRENCY = 3;
const COMMENT_LIMIT = 100;
const CHEER_KEYWORDS = ["응원가", "응원", "떼창", "직캠", "직관", "합동응원", "응원전", "cheer"];
const HINT_SOURCE_PRIORITY = { chapter: 0, description: 1, comment: 2 };

// 비교용 정규화: 공백·문장부호를 지우고 한글·영문 대소문자 차이를 없앤다.
export function normalizeMatchText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ko")
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

export function organizationKeywords(organization) {
  const name = String(organization?.name ?? "").trim();
  const words = new Set([name, organization?.abbreviation, name.split(/\s+/u)[0]]);
  if (name.endsWith("대학교")) words.add(`${name.slice(0, -3)}대`);
  return [...words].map(normalizeMatchText).filter((word) => word.length >= 2);
}

export function songKeywords(song) {
  return [song?.title, ...(song?.aliases ?? []), ...(song?.symbolicLines ?? [])]
    .map(normalizeMatchText)
    .filter((word, index, words) => word.length >= 2 && words.indexOf(word) === index);
}

export function buildSearchQueries(song, organization) {
  const orgName = String(organization?.name ?? "").trim();
  const title = String(song?.title ?? "").trim();
  const alias = song?.aliases?.find((item) => normalizeMatchText(item) !== normalizeMatchText(title));
  const queries = [
    `${orgName} ${title} 응원가`,
    `${orgName} ${title} 직캠`,
    `${orgName.split(/\s+/u)[0]} ${title} 떼창`,
    alias ? `${orgName} ${alias} 응원가` : "",
  ];
  return [...new Set(queries.map((query) => query.replace(/\s+/gu, " ").trim()).filter(Boolean))];
}

export function scoreCandidate(entry, { song, organization, queryHits = 1 }) {
  const title = normalizeMatchText(entry.title);
  const matchedBy = [];
  let score = 0;
  if (songKeywords(song).some((word) => title.includes(word))) {
    score += 50;
    matchedBy.push("곡명");
  }
  if (organizationKeywords(organization).some((word) => title.includes(word))) {
    score += 15;
    matchedBy.push("소속");
  }
  if (CHEER_KEYWORDS.some((word) => title.includes(normalizeMatchText(word)))) {
    score += 10;
    matchedBy.push("응원 키워드");
  }
  const views = Number(entry.viewCount) || 0;
  score += Math.min(20, Math.log10(views + 1) * 4);
  const duration = Number(entry.durationSeconds) || 0;
  if (duration > 0 && duration <= 20) score -= 10;
  else if (duration > 1800) score -= 15;
  else if (duration >= 45 && duration <= 600) score += 5;
  score += Math.max(0, queryHits - 1) * 5;
  return { score: Math.round(score * 10) / 10, matchedBy };
}

// 한 줄 안의 0:21, 1:02:30 같은 타임스탬프를 초 단위로 읽는다.
export function extractTimestamps(text) {
  const results = [];
  for (const line of String(text ?? "").split(/\r?\n/u)) {
    for (const match of line.matchAll(/(?<![\d:])(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?![\d:])/gu)) {
      const [, hours, minutes, seconds] = match;
      if (Number(seconds) >= 60 || (hours && Number(minutes) >= 60)) continue;
      results.push({ seconds: Number(hours ?? 0) * 3600 + Number(minutes) * 60 + Number(seconds), line: line.trim() });
    }
  }
  return results;
}

export function findStartHints(details, song) {
  const keywords = songKeywords(song);
  const mentionsSong = (text) => {
    const normalized = normalizeMatchText(text);
    return keywords.some((word) => normalized.includes(word));
  };
  const duration = Number(details.durationSeconds) || Infinity;
  const raw = [];
  for (const chapter of details.chapters ?? []) {
    if (mentionsSong(chapter.title)) raw.push({ seconds: Math.floor(Number(chapter.start_time) || 0), source: "chapter", text: String(chapter.title) });
  }
  for (const { seconds, line } of extractTimestamps(details.description)) {
    if (mentionsSong(line)) raw.push({ seconds, source: "description", text: line });
  }
  for (const comment of details.comments ?? []) {
    for (const { seconds, line } of extractTimestamps(comment.text)) {
      if (mentionsSong(line)) raw.push({ seconds, source: "comment", text: line });
    }
  }

  const merged = [];
  for (const hint of raw.filter(({ seconds }) => seconds < duration)) {
    const existing = merged.find((item) => Math.abs(item.seconds - hint.seconds) <= 3);
    if (existing) {
      existing.votes += 1;
      if (HINT_SOURCE_PRIORITY[hint.source] < HINT_SOURCE_PRIORITY[existing.source]) Object.assign(existing, { source: hint.source, text: hint.text });
    } else {
      merged.push({ ...hint, text: hint.text.slice(0, 200), votes: 1 });
    }
  }
  return merged
    .sort((left, right) => right.votes - left.votes
      || HINT_SOURCE_PRIORITY[left.source] - HINT_SOURCE_PRIORITY[right.source]
      || left.seconds - right.seconds)
    .slice(0, 5);
}

export function rankSearchResults(resultsByQuery, context) {
  const byId = new Map();
  for (const { query, entries } of resultsByQuery) {
    for (const entry of entries) {
      if (!VIDEO_ID.test(entry?.id ?? "")) continue;
      const existing = byId.get(entry.id);
      if (existing) {
        existing.queries.push(query);
        continue;
      }
      byId.set(entry.id, {
        videoId: entry.id,
        title: String(entry.title ?? "").slice(0, 300),
        channelName: String(entry.channel ?? entry.uploader ?? "").slice(0, 200),
        durationSeconds: Number.isFinite(entry.duration) ? Math.round(entry.duration) : null,
        viewCount: Number.isFinite(entry.view_count) ? entry.view_count : null,
        queries: [query],
      });
    }
  }
  return [...byId.values()]
    .map((item) => ({ ...item, ...scoreCandidate(item, { ...context, queryHits: item.queries.length }) }))
    .sort((left, right) => right.score - left.score);
}

export function runYtDlp(args, { timeoutMs = 60_000, binary = "yt-dlp" } = {}) {
  return new Promise((resolve, reject) => {
    execFile(binary, args, { timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 }, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

export async function collectVideoCandidates({ song, organization }, { run = runYtDlp, now = () => new Date(), onProgress = () => {} } = {}) {
  const queries = buildSearchQueries(song, organization);
  const errors = [];
  const resultsByQuery = [];
  for (const [index, query] of queries.entries()) {
    onProgress(`검색 ${index + 1}/${queries.length}`);
    try {
      const output = await run([`ytsearch${SEARCH_RESULTS_PER_QUERY}:${query}`, "--flat-playlist", "-J", "--no-warnings"]);
      resultsByQuery.push({ query, entries: JSON.parse(output).entries ?? [] });
    } catch (error) {
      errors.push(`검색 실패 (${query}): ${shortError(error)}`);
    }
  }

  const ranked = rankSearchResults(resultsByQuery, { song, organization }).slice(0, CANDIDATE_LIMIT);
  let finished = 0;
  const items = await mapWithConcurrency(ranked, DETAIL_CONCURRENCY, async (item) => {
    try {
      const output = await run([
        `https://www.youtube.com/watch?v=${item.videoId}`,
        "--skip-download",
        "--write-comments",
        "--extractor-args",
        `youtube:max_comments=${COMMENT_LIMIT},all,0;comment_sort=top`,
        "-J",
        "--no-warnings",
      ], { timeoutMs: 90_000 });
      const details = JSON.parse(output);
      return {
        ...item,
        durationSeconds: Number.isFinite(details.duration) ? Math.round(details.duration) : item.durationSeconds,
        viewCount: Number.isFinite(details.view_count) ? details.view_count : item.viewCount,
        uploadDate: /^\d{8}$/u.test(details.upload_date ?? "") ? details.upload_date : null,
        startHints: findStartHints({
          durationSeconds: details.duration,
          chapters: details.chapters,
          description: details.description,
          comments: details.comments,
        }, song),
      };
    } catch (error) {
      errors.push(`상세 조회 실패 (${item.videoId}): ${shortError(error)}`);
      return { ...item, uploadDate: null, startHints: [] };
    } finally {
      finished += 1;
      onProgress(`영상 확인 ${finished}/${ranked.length}`);
    }
  });

  return {
    schemaVersion: 1,
    songId: song.id,
    songTitle: song.title,
    collectedAt: now().toISOString(),
    queries,
    items,
    errors,
  };
}

export class VideoCandidateStore {
  constructor(projectRoot) {
    this.directory = path.join(path.resolve(projectRoot), ".local", "video-candidates");
  }

  async read(songId) {
    assertSafeSongId(songId);
    try {
      return JSON.parse(await readFile(path.join(this.directory, `${songId}.json`), "utf8"));
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
  }

  async write(result) {
    assertSafeSongId(result.songId);
    await mkdir(this.directory, { recursive: true });
    const filePath = path.join(this.directory, `${result.songId}.json`);
    const temporaryPath = path.join(this.directory, `.${result.songId}.${randomBytes(4).toString("hex")}.tmp`);
    await writeFile(temporaryPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    await rename(temporaryPath, filePath);
  }

  async summaries() {
    let names;
    try {
      names = await readdir(this.directory);
    } catch (error) {
      if (error?.code === "ENOENT") return {};
      throw error;
    }
    const summaries = {};
    await Promise.all(names.filter((name) => /^[a-z0-9-]+\.json$/u.test(name)).map(async (name) => {
      try {
        const value = JSON.parse(await readFile(path.join(this.directory, name), "utf8"));
        summaries[value.songId] = { collectedAt: value.collectedAt, count: value.items?.length ?? 0, errorCount: value.errors?.length ?? 0 };
      } catch {
        // 손상된 후보 파일은 다시 수집하면 덮어쓴다.
      }
    }));
    return summaries;
  }
}

function assertSafeSongId(songId) {
  if (!SAFE_ID.test(String(songId ?? ""))) throw new EditorialError("INVALID_ID", "응원가 ID가 올바르지 않습니다.");
}

function shortError(error) {
  return String(error?.stderr || error?.message || error).split("\n").find((line) => line.trim())?.slice(0, 200) ?? "알 수 없는 오류";
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }));
  return results;
}
