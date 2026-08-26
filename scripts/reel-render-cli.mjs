import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderReel } from "./reel-renderer.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = process.env.CONTENT_PROJECT_ROOT
  ? path.resolve(process.env.CONTENT_PROJECT_ROOT)
  : path.resolve(scriptDirectory, "..");
const reelId = process.argv[2];

if (!reelId) {
  console.error("사용법: node scripts/reel-render-cli.mjs <reel-id>");
  process.exitCode = 1;
} else {
  try {
    const result = await renderReel(projectRoot, reelId);
    console.log(`렌더 완료: ${result.outputPath}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
