import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EditorialError, EditorialStore } from "./content-editorial-store.mjs";
import { ContentJobStore } from "./content-job-store.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = process.env.CONTENT_PROJECT_ROOT
  ? path.resolve(process.env.CONTENT_PROJECT_ROOT)
  : path.resolve(scriptDirectory, "..");
const adminDirectory = path.join(projectRoot, "admin");
const sharedDirectory = path.join(projectRoot, "shared");
const host = process.env.CONTENT_ADMIN_HOST?.trim() || "0.0.0.0";
const parsedPort = Number.parseInt(process.env.CONTENT_ADMIN_PORT ?? "4175", 10);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 4175;
const store = new EditorialStore(projectRoot);
const jobStore = new ContentJobStore(projectRoot, store);
let mutationInProgress = false;

const staticFiles = new Map([
  ["/", { filePath: path.join(adminDirectory, "index.html"), type: "text/html; charset=utf-8" }],
  ["/admin", { filePath: path.join(adminDirectory, "index.html"), type: "text/html; charset=utf-8" }],
  ["/app.js", { filePath: path.join(adminDirectory, "app.js"), type: "text/javascript; charset=utf-8" }],
  ["/styles.css", { filePath: path.join(adminDirectory, "styles.css"), type: "text/css; charset=utf-8" }],
  ["/shared/inline-notes.mjs", { filePath: path.join(sharedDirectory, "inline-notes.mjs"), type: "text/javascript; charset=utf-8" }],
]);

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
      "connect-src 'self'",
      "base-uri 'none'",
      "form-action 'self'",
    ].join("; "),
  };
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

async function handleApi(request, response, url) {
  if (url.pathname === "/api/health" && request.method === "GET") {
    return sendJson(response, 200, { ok: true });
  }
  if (url.pathname === "/api/state" && request.method === "GET") {
    const [editorialState, jobs] = await Promise.all([store.state(), jobStore.list()]);
    const songs = await Promise.all(editorialState.songs.map(async (song) => ({
      ...song,
      researchText: await store.readResearch(song.id),
    })));
    return sendJson(response, 200, { ...editorialState, songs, jobs });
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

  const songMatch = url.pathname.match(/^\/api\/songs\/([a-z0-9-]+)$/u);
  if (songMatch && request.method === "PUT") {
    const body = await readRequestJson(request);
    const result = await withMutation(() => store.saveSong(songMatch[1], body.song, body.expectedRevision));
    return sendJson(response, 200, { song: result });
  }
  if (songMatch && request.method === "POST" && url.searchParams.get("action") === "request-research") {
    const body = await readRequestJson(request);
    const result = await withMutation(() => jobStore.createResearchJob(songMatch[1], body.expectedRevision));
    return sendJson(response, result.created ? 201 : 200, result);
  }
  if (songMatch && request.method === "DELETE") {
    const body = await readRequestJson(request);
    const result = await withMutation(() => store.deleteSong(songMatch[1], body.expectedRevision));
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

await Promise.all([store.initialize(), jobStore.initialize()]);
const server = createServer(handleRequest);
server.listen(port, host, () => {
  console.log("응원가 콘텐츠 Admin");
  for (const url of lanAccessUrls()) console.log(`- ${url}`);
  console.log("루프백과 사설 내부망에서만 접속할 수 있습니다. 종료하려면 Ctrl+C를 누르세요.");
});
