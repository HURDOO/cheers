import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ContentJobStore } from "./content-job-store.mjs";
import { EditorialError, EditorialStore } from "./content-editorial-store.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = process.env.CONTENT_PROJECT_ROOT
  ? path.resolve(process.env.CONTENT_PROJECT_ROOT)
  : path.resolve(scriptDirectory, "..");
const editorialStore = new EditorialStore(projectRoot);
const jobStore = new ContentJobStore(projectRoot, editorialStore);
const [command = "help", ...args] = process.argv.slice(2);

try {
  if (command === "next") {
    const work = await jobStore.claimNext();
    if (!work) {
      console.log(JSON.stringify({ status: "empty", message: "대기 중인 콘텐츠 작업이 없습니다." }, null, 2));
      process.exitCode = 2;
    } else {
      console.log(JSON.stringify(work, null, 2));
    }
  } else if (command === "submit") {
    const [jobId, resultPath] = args;
    if (!jobId || !resultPath) throw new EditorialError("USAGE", "사용법: content-workflow-cli.mjs submit <job-id> <result-json-file>");
    const absoluteResultPath = path.resolve(resultPath);
    let payload;
    try {
      payload = JSON.parse(await readFile(absoluteResultPath, "utf8"));
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new EditorialError("INVALID_RESULT_JSON", "AI 결과 파일이 올바른 JSON이 아닙니다.");
      }
      throw error;
    }
    const result = await jobStore.submitEnrichment(jobId, payload);
    console.log(JSON.stringify(result, null, 2));
    if (result.stale) process.exitCode = 3;
  } else if (command === "status") {
    console.log(JSON.stringify({ jobs: await jobStore.list() }, null, 2));
  } else {
    console.log([
      "응원가 콘텐츠 작업 CLI",
      "",
      "  node scripts/content-workflow-cli.mjs next",
      "  node scripts/content-workflow-cli.mjs submit <job-id> <result-json-file>",
      "  node scripts/content-workflow-cli.mjs status",
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
