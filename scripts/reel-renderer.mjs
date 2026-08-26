import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { ReelStore, reelDuration, validateReel } from "./reel-store.mjs";
import { EditorialError } from "./content-editorial-store.mjs";

const TOOL_CANDIDATES = {
  ffmpeg: [process.env.REEL_FFMPEG_PATH, "/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "ffmpeg"],
  ytdlp: [process.env.REEL_YTDLP_PATH, "/opt/homebrew/bin/yt-dlp", "/usr/local/bin/yt-dlp", "yt-dlp"],
  swift: [process.env.REEL_SWIFT_PATH, "/usr/bin/swift", "swift"],
};

export function detectReelTools() {
  const ffmpeg = detectTool(TOOL_CANDIDATES.ffmpeg, ["-version"]);
  const ytdlp = detectTool(TOOL_CANDIDATES.ytdlp, ["--version"]);
  const swift = detectTool(TOOL_CANDIDATES.swift, ["--version"]);
  return { ready: Boolean(ffmpeg && ytdlp && swift), ffmpeg, ytdlp, swift };
}

export function buildAssSubtitles(reel) {
  const lines = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 1080",
    "PlayResY: 1920",
    "WrapStyle: 2",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    "Style: Hook,Pretendard,70,&H00FFFFFF,&H000000FF,&H00131A24,&H7A000000,-1,0,0,0,100,100,-1,0,1,5,1,8,70,70,135,1",
    "Style: Headline,Pretendard,56,&H00FFFFFF,&H000000FF,&H00131A24,&H7A000000,-1,0,0,0,100,100,-1,0,1,4,1,8,75,75,250,1",
    "Style: Source,Pretendard,28,&H00FFFFFF,&H000000FF,&H00131A24,&H8A000000,0,0,0,0,100,100,0,0,3,0,0,7,46,46,52,1",
    "Style: Lyrics,Pretendard,62,&H00FFFFFF,&H000000FF,&H00131A24,&H88000000,-1,0,0,0,100,100,-1,0,1,5,1,2,78,78,290,1",
    "Style: EndCard,Pretendard,58,&H00FFFFFF,&H000000FF,&H00131A24,&H88000000,-1,0,0,0,100,100,-1,0,1,5,1,2,75,75,160,1",
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];
  for (const event of buildOverlayEvents(reel)) {
    const style = { hook: "Hook", headline: "Headline", source: "Source", lyrics: "Lyrics", end: "EndCard" }[event.kind];
    const layer = { source: 1, headline: 2, lyrics: 3, hook: 4, end: 5 }[event.kind];
    lines.push(assEvent(event.start, event.end, style, event.text, layer));
  }
  return `${lines.join("\n")}\n`;
}

export function buildOverlayEvents(reel) {
  const total = reelDuration(reel);
  const events = [];
  if (reel.hookText) events.push({ start: 0, end: Math.min(2.4, total), kind: "hook", text: reel.hookText });
  let offset = 0;
  for (const clip of reel.clips) {
    const duration = clip.endSeconds - clip.startSeconds;
    const end = offset + duration;
    events.push({ start: offset, end, kind: "source", text: `출처 · ${clip.attributionText}` });
    if (clip.headline) events.push({ start: offset, end, kind: "headline", text: clip.headline });
    if (clip.lyricsLines.length > 0) {
      const unit = duration / clip.lyricsLines.length;
      clip.lyricsLines.forEach((line, index) => {
        const lineStart = offset + unit * index;
        const lineEnd = index === clip.lyricsLines.length - 1 ? end : offset + unit * (index + 1);
        events.push({ start: lineStart, end: lineEnd, kind: "lyrics", text: line });
      });
    }
    offset = end;
  }
  if (reel.endCardText && total > 0) events.push({ start: Math.max(0, total - 2.2), end: total, kind: "end", text: reel.endCardText });
  return events;
}

export async function renderReel(projectRoot, reelId) {
  const store = new ReelStore(projectRoot);
  await store.initialize();
  const reel = await store.get(reelId);
  validateReel(reel, { requireRenderable: true });
  const tools = detectReelTools();
  if (!tools.ready) {
    throw new EditorialError("REEL_TOOLS_MISSING", "영상 렌더링에는 ffmpeg와 yt-dlp가 필요합니다.", 503, [{ tools }]);
  }

  const workDirectory = path.join(store.renderDirectory, reel.id);
  const cacheDirectory = path.join(projectRoot, ".local", "reel-source-cache");
  await Promise.all([mkdir(workDirectory, { recursive: true }), mkdir(cacheDirectory, { recursive: true })]);
  const totalDuration = reelDuration(reel);
  const startedAt = new Date().toISOString();
  await store.writeRenderStatus(reel.id, { status: "rendering", progress: 1, phase: "소스 준비", error: null, outputReady: false, startedAt, completedAt: null });

  try {
    const normalizedClips = [];
    for (const [index, clip] of reel.clips.entries()) {
      await store.writeRenderStatus(reel.id, {
        status: "rendering",
        progress: Math.round(5 + (index / reel.clips.length) * 35),
        phase: `소스 ${index + 1}/${reel.clips.length} 준비`,
      });
      const sourcePath = await downloadSource(tools.ytdlp, clip, cacheDirectory);
      const clipPath = path.join(workDirectory, `clip-${String(index + 1).padStart(2, "0")}.mp4`);
      await normalizeClip(tools.ffmpeg, sourcePath, clipPath, { ...clip, startSeconds: 0, endSeconds: clip.endSeconds - clip.startSeconds }, reel.format);
      normalizedClips.push(clipPath);
    }

    const concatPath = path.join(workDirectory, "concat.txt");
    await writeFile(concatPath, `${normalizedClips.map((value) => `file '${escapeConcatPath(value)}'`).join("\n")}\n`, "utf8");
    const joinedPath = path.join(workDirectory, "joined.mp4");
    await store.writeRenderStatus(reel.id, { status: "rendering", progress: 45, phase: "클립 연결" });
    await run(tools.ffmpeg, ["-y", "-f", "concat", "-safe", "0", "-i", concatPath, "-c", "copy", joinedPath]);

    const subtitlePath = path.join(workDirectory, "captions.ass");
    await writeFile(subtitlePath, buildAssSubtitles(reel), "utf8");
    const overlayEvents = buildOverlayEvents(reel);
    const overlayPaths = await renderOverlayImages(projectRoot, tools.swift, workDirectory, reel, overlayEvents);
    const outputPath = store.outputPath(reel.id);
    await store.writeRenderStatus(reel.id, { status: "rendering", progress: 55, phase: "출처·가사 자막 합성" });
    let lastReportedProgress = 55;
    let progressWrites = Promise.resolve();
    const overlayInputs = overlayPaths.flatMap((overlayPath) => ["-loop", "1", "-framerate", "1", "-i", overlayPath]);
    const overlayFilter = buildOverlayFilter(overlayEvents);
    await run(tools.ffmpeg, [
      "-y", "-i", joinedPath, ...overlayInputs,
      "-filter_complex", overlayFilter, "-map", "[video]", "-map", "0:a?", "-t", String(totalDuration),
      "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
      "-metadata", `title=${reel.title}`,
      "-progress", "pipe:1", "-nostats", outputPath,
    ], ({ outTimeSeconds }) => {
      const progress = Math.min(98, Math.round(55 + (outTimeSeconds / Math.max(1, totalDuration)) * 43));
      if (progress < lastReportedProgress + 2) return;
      lastReportedProgress = progress;
      progressWrites = progressWrites.then(() => store.writeRenderStatus(reel.id, { status: "rendering", progress, phase: "최종 영상 인코딩" }));
    });
    await progressWrites;
    await access(outputPath);
    const completedAt = new Date().toISOString();
    await store.writeRenderStatus(reel.id, { status: "completed", progress: 100, phase: "완료", outputReady: true, error: null, completedAt });
    return { reelId: reel.id, outputPath, completedAt };
  } catch (error) {
    await store.writeRenderStatus(reel.id, {
      status: "failed",
      phase: "실패",
      error: error instanceof Error ? error.message : String(error),
      outputReady: false,
      completedAt: new Date().toISOString(),
    });
    throw error;
  }
}

async function renderOverlayImages(projectRoot, swift, workDirectory, reel, events) {
  const overlayDirectory = path.join(workDirectory, "overlays");
  await mkdir(overlayDirectory, { recursive: true });
  const items = events.map((event, index) => ({
    filePath: path.join(overlayDirectory, `overlay-${String(index + 1).padStart(3, "0")}.png`),
    kind: event.kind,
    text: event.text,
  }));
  const specPath = path.join(workDirectory, "overlay-spec.json");
  const moduleCachePath = path.join(projectRoot, ".local", "swift-module-cache");
  await mkdir(moduleCachePath, { recursive: true });
  await writeFile(specPath, `${JSON.stringify({
    width: reel.format.width,
    height: reel.format.height,
    fontPath: path.join(projectRoot, "public", "fonts", "PretendardVariable.woff2"),
    items,
  }, null, 2)}\n`, "utf8");
  await run(swift, ["-module-cache-path", moduleCachePath, path.join(projectRoot, "scripts", "render-reel-overlays.swift"), specPath]);
  return items.map(({ filePath }) => filePath);
}

function buildOverlayFilter(events) {
  let previous = "[0:v]";
  const filters = events.map((event, index) => {
    const output = index === events.length - 1 ? "[video]" : `[overlay${index + 1}]`;
    const start = event.start.toFixed(3);
    const end = event.end.toFixed(3);
    const filter = `${previous}[${index + 1}:v]overlay=0:0:eof_action=repeat:enable='between(t,${start},${end})'${output}`;
    previous = output;
    return filter;
  });
  return filters.join(";");
}

async function downloadSource(ytdlp, clip, cacheDirectory) {
  const hash = createHash("sha256").update(`${clip.sourceUrl}\n${clip.startSeconds}\n${clip.endSeconds}`).digest("hex").slice(0, 24);
  const cached = await findCachedSource(cacheDirectory, hash);
  if (cached) return cached;
  const template = path.join(cacheDirectory, `${hash}.%(ext)s`);
  const { stdout } = await run(ytdlp, [
    "--no-playlist", "--no-progress", "--no-warnings",
    "--format", "bv*+ba/b", "--merge-output-format", "mp4",
    "--download-sections", `*${clip.startSeconds}-${clip.endSeconds}`, "--force-keyframes-at-cuts",
    "--output", template, "--print", "after_move:filepath", clip.sourceUrl,
  ]);
  const reported = stdout.trim().split("\n").filter(Boolean).at(-1);
  if (reported) {
    await access(reported);
    return reported;
  }
  const downloaded = await findCachedSource(cacheDirectory, hash);
  if (!downloaded) throw new Error("다운로드한 영상 파일을 찾을 수 없습니다.");
  return downloaded;
}

async function findCachedSource(directory, hash) {
  const names = await readdir(directory).catch(() => []);
  const name = names.find((entry) => entry.startsWith(`${hash}.`) && !entry.endsWith(".part") && !entry.endsWith(".ytdl"));
  return name ? path.join(directory, name) : null;
}

async function normalizeClip(ffmpeg, sourcePath, outputPath, clip, format) {
  const x = { left: "0", center: "(in_w-out_w)/2", right: "in_w-out_w" }[clip.crop];
  const filter = `scale=${format.width}:${format.height}:force_original_aspect_ratio=increase,crop=${format.width}:${format.height}:${x}:(in_h-out_h)/2,setsar=1,fps=${format.fps}`;
  const duration = clip.endSeconds - clip.startSeconds;
  await run(ffmpeg, [
    "-y", "-ss", String(clip.startSeconds), "-i", sourcePath, "-t", String(duration),
    "-vf", filter,
    "-af", "loudnorm=I=-16:LRA=11:TP=-1.5,aresample=48000",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-r", String(format.fps),
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", outputPath,
  ]);
}

function run(command, args, onProgress = null) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (onProgress) {
        const matches = [...chunk.matchAll(/out_time_ms=(\d+)/gu)];
        const value = matches.at(-1)?.[1];
        if (value) onProgress({ outTimeSeconds: Number(value) / 1_000_000 });
      }
    });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${path.basename(command)} 실행 실패 (${code}): ${stderr.trim().slice(-1600)}`));
    });
  });
}

function detectTool(candidates, args) {
  for (const candidate of candidates.filter(Boolean)) {
    const result = spawnSync(candidate, args, { stdio: "ignore" });
    if (!result.error && result.status === 0) return candidate;
  }
  return null;
}

function assEvent(start, end, style, text, layer) {
  return `Dialogue: ${layer},${assTime(start)},${assTime(end)},${style},,0,0,0,,${escapeAss(text)}`;
}

function assTime(value) {
  const centiseconds = Math.max(0, Math.round(value * 100));
  const hours = Math.floor(centiseconds / 360000);
  const minutes = Math.floor((centiseconds % 360000) / 6000);
  const seconds = Math.floor((centiseconds % 6000) / 100);
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds % 100).padStart(2, "0")}`;
}

function escapeAss(value) {
  return String(value ?? "").replaceAll("\\", "\\\\").replaceAll("{", "\\{").replaceAll("}", "\\}").replace(/\r?\n/gu, "\\N");
}

function escapeConcatPath(value) {
  return value.replaceAll("'", "'\\''");
}
