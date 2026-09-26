import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EditorialError, EditorialStore } from "./content-editorial-store.mjs";
import { ContentJobStore } from "./content-job-store.mjs";
import { ContentReleaseStore } from "./content-release-store.mjs";
import { ReelStore, validateReel } from "./reel-store.mjs";
import { detectReelTools, renderReel } from "./reel-renderer.mjs";
import { fetchYouTubeMetadata } from "./youtube-metadata.mjs";
import { readOriginalSongCatalog, saveOriginalSongOrder } from "./original-song-order.mjs";
import { VideoCandidateStore, collectVideoCandidates, runYtDlp } from "./video-candidates.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = process.env.CONTENT_PROJECT_ROOT
  ? path.resolve(process.env.CONTENT_PROJECT_ROOT)
  : path.resolve(scriptDirectory, "..");
const adminDirectory = path.join(projectRoot, "admin");
const sharedDirectory = path.join(projectRoot, "shared");
const eventCurationPath = path.join(projectRoot, "src", "events", "korea-yonsei-games-2026", "eventCuration.json");
const originalSongsPath = path.join(projectRoot, "data", "original-songs.json");
const host = process.env.CONTENT_ADMIN_HOST?.trim() || "0.0.0.0";
const parsedPort = Number.parseInt(process.env.CONTENT_ADMIN_PORT ?? "4175", 10);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 4175;
const store = new EditorialStore(projectRoot);
const jobStore = new ContentJobStore(projectRoot, store);
const releaseStore = new ContentReleaseStore(projectRoot, store);
const reelStore = new ReelStore(projectRoot);
const activeReelRenders = new Map();
const candidateStore = new VideoCandidateStore(projectRoot);
const candidateTasks = new Map();
const candidateQueue = [];
let candidateWorkerRunning = false;
let mutationInProgress = false;

const staticFiles = new Map([
  ["/", { filePath: path.join(adminDirectory, "index.html"), type: "text/html; charset=utf-8" }],
  ["/admin", { filePath: path.join(adminDirectory, "index.html"), type: "text/html; charset=utf-8" }],
  ["/app.js", { filePath: path.join(adminDirectory, "app.js"), type: "text/javascript; charset=utf-8" }],
  ["/priority.js", { filePath: path.join(adminDirectory, "priority.js"), type: "text/javascript; charset=utf-8" }],
  ["/workbench.js", { filePath: path.join(adminDirectory, "workbench.js"), type: "text/javascript; charset=utf-8" }],
  ["/song-editor.js", { filePath: path.join(adminDirectory, "song-editor.js"), type: "text/javascript; charset=utf-8" }],
  ["/styles.css", { filePath: path.join(adminDirectory, "styles.css"), type: "text/css; charset=utf-8" }],
  ["/shared/inline-notes.mjs", { filePath: path.join(sharedDirectory, "inline-notes.mjs"), type: "text/javascript; charset=utf-8" }],
  ["/shared/youtube.mjs", { filePath: path.join(sharedDirectory, "youtube.mjs"), type: "text/javascript; charset=utf-8" }],
]);

async function readPriorityPlan() {
  const [eventCurationText, originalSongsText] = await Promise.all([
    readFile(eventCurationPath, "utf8"),
    readFile(originalSongsPath, "utf8"),
  ]);
  const eventCuration = JSON.parse(eventCurationText);
  const originalSongs = JSON.parse(originalSongsText);
  return {
    ...eventCuration,
    originalSongIds: (originalSongs.items ?? []).map(({ id }) => id),
  };
}

function securityHeaders(contentType) {
  return {
    "Cache-Control": "no-store",
    "Content-Type": contentType,
    "Cross-Origin-Opener-Policy": "same-origin",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' data: https://i.ytimg.com",
      "frame-src https://www.youtube-nocookie.com",
      "media-src 'self' blob:",
      "connect-src 'self'",
      "base-uri 'none'",
      "form-action 'self'",
    ].join("; "),
  };
}

async function sendVideo(request, response, filePath) {
  let fileStats;
  try {
    fileStats = await stat(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return sendJson(response, 404, { error: "아직 렌더링된 영상이 없습니다." });
    throw error;
  }
  const range = request.headers.range?.match(/^bytes=(\d*)-(\d*)$/u);
  if (!range) {
    response.writeHead(200, {
      ...securityHeaders("video/mp4"),
      "Accept-Ranges": "bytes",
      "Content-Length": fileStats.size,
    });
    return createReadStream(filePath).pipe(response);
  }
  const start = range[1] ? Number.parseInt(range[1], 10) : 0;
  const end = range[2] ? Math.min(Number.parseInt(range[2], 10), fileStats.size - 1) : fileStats.size - 1;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= fileStats.size) {
    response.writeHead(416, { "Content-Range": `bytes */${fileStats.size}` });
    return response.end();
  }
  response.writeHead(206, {
    ...securityHeaders("video/mp4"),
    "Accept-Ranges": "bytes",
    "Content-Length": end - start + 1,
    "Content-Range": `bytes ${start}-${end}/${fileStats.size}`,
  });
  return createReadStream(filePath, { start, end }).pipe(response);
}

function startReelRender(reelId) {
  const existing = activeReelRenders.get(reelId);
  if (existing) return false;
  const task = renderReel(projectRoot, reelId)
    .catch((error) => console.error(`릴스 렌더 실패 (${reelId})`, error))
    .finally(() => activeReelRenders.delete(reelId));
  activeReelRenders.set(reelId, task);
  return true;
}

function enqueueCandidateCollection(songIds) {
  const queued = [];
  for (const songId of songIds) {
    if (["queued", "running"].includes(candidateTasks.get(songId)?.status)) continue;
    candidateTasks.set(songId, { status: "queued", phase: "대기", error: null, updatedAt: new Date().toISOString() });
    candidateQueue.push(songId);
    queued.push(songId);
  }
  if (!candidateWorkerRunning) runCandidateWorker();
  return queued;
}

// yt-dlp 호출은 한 곡씩 순서대로 처리해 검색 차단과 과부하를 피한다.
async function runCandidateWorker() {
  candidateWorkerRunning = true;
  try {
    while (candidateQueue.length > 0) {
      const songId = candidateQueue.shift();
      const update = (patch) => candidateTasks.set(songId, { ...candidateTasks.get(songId), ...patch, updatedAt: new Date().toISOString() });
      update({ status: "running", phase: "검색 준비" });
      try {
        const binary = detectReelTools().ytdlp;
        if (!binary) throw new EditorialError("YTDLP_MISSING", "영상 후보 수집에는 yt-dlp 설치가 필요합니다.", 503);
        const [song, state] = await Promise.all([store.getSong(songId), store.state()]);
        const organization = state.organizations.find(({ id }) => id === song.organizationId);
        const result = await collectVideoCandidates({ song, organization }, {
          run: (args, options) => runYtDlp(args, { ...options, binary }),
          onProgress: (phase) => update({ phase }),
        });
        await candidateStore.write(result);
        update({ status: "completed", phase: `후보 ${result.items.length}개`, error: null });
      } catch (error) {
        console.error(`영상 후보 수집 실패 (${songId})`, error);
        update({ status: "failed", phase: "실패", error: error instanceof EditorialError ? error.message : "영상 후보를 수집하지 못했습니다." });
      }
    }
  } finally {
    candidateWorkerRunning = false;
  }
}

function sendJson(response, status, payload) {
  response.writeHead(status, securityHeaders("application/json; charset=utf-8"));
  response.end(`${JSON.stringify(payload)}\n`);
}

function sendText(response, status, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(status, securityHeaders(contentType));
  response.end(body);
}

function isPrivateNetworkAddress(value) {
  const address = String(value ?? "").toLowerCase().replace(/^::ffff:/u, "");
  if (address === "::1") return true;
  if (address.startsWith("fc") || address.startsWith("fd") || address.startsWith("fe80:")) return true;

  const octets = address.split(".").map((part) => Number.parseInt(part, 10));
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [first, second] = octets;
  return first === 10
    || first === 127
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168);
}

function lanAccessUrls() {
  if (host !== "0.0.0.0") return [`http://${host}:${port}`];
  const candidates = Object.entries(networkInterfaces()).flatMap(([name, addresses = []]) => (
    addresses
      .filter((address) => address.family === "IPv4" && !address.internal && isPrivateNetworkAddress(address.address))
      .map((address) => ({ name, address: address.address }))
  ));
  const physical = candidates.filter(({ name }) => !/^(?:awdl|bridge|docker|gif|llw|lo|stf|utun|vmenet)/u.test(name));
  const selected = physical.length > 0 ? physical : candidates;
  return ["http://127.0.0.1:" + port, ...selected.map(({ address }) => `http://${address}:${port}`)];
}

async function readRequestJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.byteLength;
    if (size > 1_500_000) throw new EditorialError("REQUEST_TOO_LARGE", "요청 본문이 너무 큽니다.", 413);
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new EditorialError("INVALID_JSON", "JSON 요청을 읽을 수 없습니다.");
  }
}

async function withMutation(operation) {
  if (mutationInProgress) {
    throw new EditorialError("MUTATION_BUSY", "다른 저장 작업이 진행 중입니다. 잠시 후 다시 시도해 주세요.", 409);
  }
  mutationInProgress = true;
  try {
    return await operation();
  } finally {
    mutationInProgress = false;
  }
}

async function validateSongBatch(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new EditorialError("EMPTY_SONG_BATCH", "일괄 작업할 응원가를 한 곡 이상 선택해 주세요.");
  }
  if (items.length > 200) throw new EditorialError("SONG_BATCH_TOO_LARGE", "한 번에 최대 200곡까지 처리할 수 있습니다.", 413);
  const ids = items.map(({ id }) => String(id ?? ""));
  if (new Set(ids).size !== ids.length) throw new EditorialError("DUPLICATE_SONG_BATCH", "일괄 작업 목록에 같은 응원가가 중복되었습니다.");
  const songs = await Promise.all(items.map(async (item) => {
    const song = await store.getSong(item.id);
    if (!Number.isInteger(item.expectedRevision) || song.revision !== item.expectedRevision) {
      throw new EditorialError("REVISION_CONFLICT", `${song.title}이 변경되었습니다. 새로고침한 뒤 다시 시도해 주세요.`, 409);
    }
    return song;
  }));
  return songs;
}

async function handleApi(request, response, url) {
  if (url.pathname === "/api/youtube-metadata" && request.method === "GET") {
    return sendJson(response, 200, await fetchYouTubeMetadata(url.searchParams.get("url")));
  }
  if (url.pathname === "/api/health" && request.method === "GET") {
    return sendJson(response, 200, { ok: true });
  }
  if (url.pathname === "/api/state" && request.method === "GET") {
    const [editorialState, jobs, reels, priorityPlan, originalCatalog, videoCandidates] = await Promise.all([
      store.state(),
      jobStore.list(),
      reelStore.list(),
      readPriorityPlan(),
      readOriginalSongCatalog(originalSongsPath),
      candidateStore.summaries(),
    ]);
    const publication = await releaseStore.describe(editorialState);
    const songs = await Promise.all(editorialState.songs.map(async (song) => ({
      ...song,
      researchText: await store.readResearch(song.id),
      publication: publication.songs[song.id],
    })));
    return sendJson(response, 200, {
      ...editorialState,
      songs,
      jobs,
      reels,
      priorityPlan,
      originalSongs: originalCatalog.catalog.items,
      originalOrderRevision: originalCatalog.revision,
      publication: publication.current,
      reelTools: detectReelTools(),
      videoCandidates,
      candidateTasks: Object.fromEntries(candidateTasks),
    });
  }
  if (url.pathname === "/api/video-candidates/collect" && request.method === "POST") {
    const body = await readRequestJson(request);
    const songIds = Array.isArray(body.songIds) ? body.songIds.map(String) : [];
    if (songIds.length === 0 || songIds.length > 200) {
      throw new EditorialError("INVALID_CANDIDATE_REQUEST", "후보를 수집할 응원가를 1~200곡 선택해 주세요.");
    }
    await Promise.all(songIds.map((id) => store.getSong(id)));
    const queued = enqueueCandidateCollection(songIds);
    return sendJson(response, 202, { queued, tasks: Object.fromEntries(candidateTasks) });
  }
  if (url.pathname === "/api/original-songs/order" && request.method === "PUT") {
    const body = await readRequestJson(request);
    const result = await withMutation(() => saveOriginalSongOrder(originalSongsPath, body.ids, body.expectedRevision));
    return sendJson(response, 200, result);
  }
  if (url.pathname === "/api/import" && request.method === "POST") {
    const body = await readRequestJson(request);
    const result = await withMutation(() => store.importSongs(body));
    return sendJson(response, 201, result);
  }

  if (url.pathname === "/api/organizations" && request.method === "POST") {
    const body = await readRequestJson(request);
    const organization = await withMutation(() => store.createOrganization(body.organization));
    return sendJson(response, 201, { organization });
  }

  const organizationMatch = url.pathname.match(/^\/api\/organizations\/([a-z0-9-]+)$/u);
  if (organizationMatch && request.method === "PUT") {
    const body = await readRequestJson(request);
    const organization = await withMutation(() => (
      store.saveOrganization(organizationMatch[1], body.organization, body.expectedRevision)
    ));
    return sendJson(response, 200, { organization });
  }
  if (organizationMatch && request.method === "DELETE") {
    const body = await readRequestJson(request);
    const [editorialState, publication] = await Promise.all([store.state(), releaseStore.describe()]);
    const publicSong = editorialState.songs.find((song) => (
      song.organizationId === organizationMatch[1]
      && publication.songs[song.id]?.status !== "unpublished"
    ));
    if (publicSong) {
      throw new EditorialError(
        "ORGANIZATION_HAS_PUBLIC_SONGS",
        `사이트에 공개 중인 '${publicSong.title}'을 포함한 응원가는 먼저 공개를 내려 주세요.`,
        409,
      );
    }
    const result = await withMutation(() => store.deleteOrganization(
      organizationMatch[1],
      body.expectedRevision,
      { cascade: url.searchParams.get("cascade") === "true" },
    ));
    return sendJson(response, 200, result);
  }

  if (url.pathname === "/api/songs" && request.method === "POST") {
    const body = await readRequestJson(request);
    const song = await withMutation(() => store.createSong(body.song));
    return sendJson(response, 201, { song });
  }

  if (url.pathname === "/api/songs/bulk" && request.method === "PUT") {
    const body = await readRequestJson(request);
    const patch = body.patch ?? {};
    const patchKeys = Object.keys(patch);
    if (patchKeys.length !== 1 || !["workflowStage", "scopeStatus"].includes(patchKeys[0])) {
      throw new EditorialError("INVALID_SONG_BULK_PATCH", "일괄 변경은 작업 라벨 또는 조사 범위 한 항목씩만 지원합니다.");
    }
    const songs = await withMutation(async () => {
      await validateSongBatch(body.items);
      const updated = [];
      for (const item of body.items) updated.push(await store.saveSong(item.id, patch, item.expectedRevision));
      return updated;
    });
    return sendJson(response, 200, { songs });
  }

  if (url.pathname === "/api/songs/bulk" && request.method === "POST" && url.searchParams.get("action") === "request-enrichment") {
    const body = await readRequestJson(request);
    const results = await withMutation(async () => {
      await validateSongBatch(body.items);
      const created = [];
      const existing = [];
      for (const item of body.items) {
        const result = await jobStore.createEnrichmentJob(item.id, item.expectedRevision);
        (result.created ? created : existing).push(result.job);
      }
      return { created, existing };
    });
    return sendJson(response, results.created.length > 0 ? 201 : 200, results);
  }

  if (url.pathname === "/api/songs/bulk" && request.method === "POST" && url.searchParams.get("action") === "apply-polish") {
    const body = await readRequestJson(request);
    const songs = await withMutation(async () => {
      await validateSongBatch(body.items);
      const updated = [];
      for (const item of body.items) {
        const descriptionText = String(item.descriptionText ?? "").trim();
        if (!descriptionText) throw new EditorialError("EMPTY_DESCRIPTION", "다듬은 본문이 비어 있는 곡이 있습니다.");
        updated.push(await store.saveSong(item.id, { descriptionText, descriptionStatus: "polished" }, item.expectedRevision));
      }
      return updated;
    });
    return sendJson(response, 200, { songs });
  }

  if (url.pathname === "/api/songs/bulk" && request.method === "POST" && url.searchParams.get("action") === "publish") {
    const body = await readRequestJson(request);
    const result = await withMutation(async () => {
      const songs = await validateSongBatch(body.items);
      const release = await releaseStore.publishSongs(body.items);
      const updatedSongs = [];
      for (const song of songs) {
        updatedSongs.push(song.workflowStage === "published"
          ? song
          : await store.saveSong(song.id, { workflowStage: "published" }, song.revision));
      }
      return { release: release.release, songs: updatedSongs };
    });
    return sendJson(response, 201, result);
  }

  if (url.pathname === "/api/songs/bulk" && request.method === "POST" && url.searchParams.get("action") === "unpublish") {
    const body = await readRequestJson(request);
    const result = await withMutation(async () => {
      const songs = await validateSongBatch(body.items);
      const release = await releaseStore.unpublishSongs(body.items);
      const updatedSongs = [];
      for (const song of songs) {
        updatedSongs.push(song.workflowStage === "published"
          ? await store.saveSong(song.id, { workflowStage: "approved" }, song.revision)
          : song);
      }
      return { release: release.release, songs: updatedSongs };
    });
    return sendJson(response, 201, result);
  }

  const candidateMatch = url.pathname.match(/^\/api\/songs\/([a-z0-9-]+)\/video-candidates$/u);
  if (candidateMatch && request.method === "GET") {
    await store.getSong(candidateMatch[1]);
    return sendJson(response, 200, { candidates: await candidateStore.read(candidateMatch[1]) });
  }

  const songMatch = url.pathname.match(/^\/api\/songs\/([a-z0-9-]+)$/u);
  if (songMatch && request.method === "PUT") {
    const body = await readRequestJson(request);
    const result = await withMutation(() => store.saveSong(songMatch[1], body.song, body.expectedRevision));
    return sendJson(response, 200, { song: result });
  }
  if (songMatch && request.method === "POST" && ["request-enrichment", "request-research"].includes(url.searchParams.get("action"))) {
    const body = await readRequestJson(request);
    const result = await withMutation(() => jobStore.createEnrichmentJob(songMatch[1], body.expectedRevision));
    return sendJson(response, result.created ? 201 : 200, result);
  }
  if (songMatch && request.method === "DELETE") {
    const body = await readRequestJson(request);
    const publication = await releaseStore.describe();
    if (publication.songs[songMatch[1]]?.status !== "unpublished") {
      throw new EditorialError("SONG_IS_PUBLIC", "사이트에 공개 중인 응원가는 먼저 공개를 내려 주세요.", 409);
    }
    const result = await withMutation(() => store.deleteSong(songMatch[1], body.expectedRevision));
    return sendJson(response, 200, result);
  }

  if (url.pathname === "/api/reels" && request.method === "POST") {
    const body = await readRequestJson(request);
    const reel = await withMutation(() => reelStore.create(body.reel));
    return sendJson(response, 201, { reel });
  }

  const reelOutputMatch = url.pathname.match(/^\/api\/reels\/([a-z0-9-]+)\/output$/u);
  if (reelOutputMatch && request.method === "GET") {
    await reelStore.get(reelOutputMatch[1]);
    return sendVideo(request, response, reelStore.outputPath(reelOutputMatch[1]));
  }

  const reelMatch = url.pathname.match(/^\/api\/reels\/([a-z0-9-]+)$/u);
  if (reelMatch && request.method === "PUT") {
    const body = await readRequestJson(request);
    const reel = await withMutation(() => reelStore.save(reelMatch[1], body.reel, body.expectedRevision));
    return sendJson(response, 200, { reel });
  }
  if (reelMatch && request.method === "POST" && url.searchParams.get("action") === "render") {
    const body = await readRequestJson(request);
    const reel = await reelStore.get(reelMatch[1]);
    if (reel.revision !== body.expectedRevision) {
      throw new EditorialError("REVISION_CONFLICT", "릴스 프로젝트가 변경되었습니다. 새로고침한 뒤 다시 시도해 주세요.", 409);
    }
    if (!detectReelTools().ready) {
      throw new EditorialError("REEL_TOOLS_MISSING", "영상 렌더링에는 ffmpeg와 yt-dlp 설치가 필요합니다.", 503);
    }
    validateReel(reel, { requireRenderable: true });
    if (!activeReelRenders.has(reel.id)) {
      await reelStore.writeRenderStatus(reel.id, { status: "queued", progress: 0, phase: "렌더 대기", error: null, outputReady: false });
    }
    const started = startReelRender(reel.id);
    return sendJson(response, started ? 202 : 200, { started, render: await reelStore.readRenderStatus(reel.id) });
  }
  if (reelMatch && request.method === "DELETE") {
    const body = await readRequestJson(request);
    const result = await withMutation(() => reelStore.delete(reelMatch[1], body.expectedRevision));
    return sendJson(response, 200, result);
  }

  return sendJson(response, 404, { error: "API 경로를 찾을 수 없습니다." });
}

async function handleRequest(request, response) {
  try {
    if (!isPrivateNetworkAddress(request.socket.remoteAddress)) {
      return sendJson(response, 403, { error: "내부망에서만 Admin에 접속할 수 있습니다." });
    }
    const url = new URL(request.url ?? "/", "http://admin.internal");
    if (url.pathname.startsWith("/api/")) return await handleApi(request, response, url);

    const asset = staticFiles.get(url.pathname.replace(/\/$/u, "") || "/");
    if (!asset || request.method !== "GET") return sendText(response, 404, "찾을 수 없습니다.");
    return sendText(response, 200, await readFile(asset.filePath, "utf8"), asset.type);
  } catch (error) {
    if (error instanceof EditorialError) {
      return sendJson(response, error.statusCode, {
        error: error.message,
        code: error.code,
        details: error.details,
      });
    }
    console.error(error);
    return sendJson(response, 500, { error: "Admin 요청을 처리하지 못했습니다." });
  }
}

await Promise.all([store.initialize(), jobStore.initialize(), reelStore.initialize(), releaseStore.initialize()]);
const server = createServer(handleRequest);
server.listen(port, host, () => {
  console.log("응원가 콘텐츠 Admin");
  for (const url of lanAccessUrls()) console.log(`- ${url}`);
  console.log("루프백과 사설 내부망에서만 접속할 수 있습니다. 종료하려면 Ctrl+C를 누르세요.");
});
