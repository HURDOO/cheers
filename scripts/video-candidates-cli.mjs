import path from "node:path";
import { fileURLToPath } from "node:url";
import { EditorialError, EditorialStore } from "./content-editorial-store.mjs";
import { detectReelTools } from "./reel-renderer.mjs";
import { VideoCandidateStore, collectVideoCandidates, runYtDlp } from "./video-candidates.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = process.env.CONTENT_PROJECT_ROOT
  ? path.resolve(process.env.CONTENT_PROJECT_ROOT)
  : path.resolve(scriptDirectory, "..");
const editorialStore = new EditorialStore(projectRoot);
const candidateStore = new VideoCandidateStore(projectRoot);
const [command = "help", ...args] = process.argv.slice(2);

try {
  if (command === "collect") {
    const force = args.includes("--force");
    const state = await editorialStore.state();
    const organizationById = new Map(state.organizations.map((organization) => [organization.id, organization]));
    const ids = args.filter((arg) => !arg.startsWith("--"));
    const songs = args.includes("--missing")
      ? state.songs.filter((song) => song.scopeStatus !== "rejected" && (song.videos ?? []).length === 0)
      : ids.map((id) => {
        const song = state.songs.find((item) => item.id === id);
        if (!song) throw new EditorialError("SONG_NOT_FOUND", `응원가 '${id}'을 찾을 수 없습니다.`, 404);
        return song;
      });
    if (songs.length === 0) throw new EditorialError("USAGE", "사용법: video-candidates-cli.mjs collect <song-id...> | --missing [--force]");
    const binary = detectReelTools().ytdlp;
    if (!binary) throw new EditorialError("YTDLP_MISSING", "영상 후보 수집에는 yt-dlp 설치가 필요합니다.");
    const run = (runArgs, options) => runYtDlp(runArgs, { ...options, binary });

    for (const [index, song] of songs.entries()) {
      const label = `[${index + 1}/${songs.length}] ${song.title}`;
      if (!force && await candidateStore.read(song.id)) {
        console.log(`${label} · 이미 수집됨, 건너뜀 (--force로 다시 수집)`);
        continue;
      }
      const result = await collectVideoCandidates({ song, organization: organizationById.get(song.organizationId) }, { run });
      await candidateStore.write(result);
      const hinted = result.items.filter((item) => item.startHints.length > 0).length;
      console.log(`${label} · 후보 ${result.items.length}개 · 시작 초 단서 ${hinted}개${result.errors.length ? ` · 오류 ${result.errors.length}건` : ""}`);
    }
  } else {
    console.log([
      "영상 후보 수집 CLI (yt-dlp 필요)",
      "",
      "  node scripts/video-candidates-cli.mjs collect <song-id...>",
      "  node scripts/video-candidates-cli.mjs collect --missing [--force]",
      "",
      "결과는 .local/video-candidates/<song-id>.json에 저장되며 Admin 작업 모드의 영상 고르기에서 사용합니다.",
    ].join("\n"));
  }
} catch (error) {
  if (error instanceof EditorialError) {
    console.error(JSON.stringify({ error: error.message, code: error.code, details: error.details }, null, 2));
    process.exitCode = 1;
  } else {
    throw error;
  }
}
