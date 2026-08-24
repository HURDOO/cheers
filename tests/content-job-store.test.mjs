import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { EditorialStore } from "../scripts/content-editorial-store.mjs";
import { ContentJobStore } from "../scripts/content-job-store.mjs";

async function fixture() {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "cheers-job-test-"));
  const dataDirectory = path.join(projectRoot, "data");
  await mkdir(dataDirectory, { recursive: true });
  await Promise.all([
    writeFile(path.join(dataDirectory, "teams.json"), JSON.stringify({
      schemaVersion: 1,
      items: [{ id: "test-team", name: "테스트 팀", abbreviation: "T", type: "baseball", region: "서울", colors: { primary: "#000000", secondary: "#ffffff" } }],
    })),
    writeFile(path.join(dataDirectory, "cheer-songs.json"), JSON.stringify({ schemaVersion: 1, items: [] })),
    writeFile(path.join(dataDirectory, "media.json"), JSON.stringify({ schemaVersion: 1, items: [] })),
  ]);
  const editorialStore = new EditorialStore(projectRoot);
  const imported = await editorialStore.importSongs({ organizationId: "test-team", targetText: "조사할 곡" });
  const song = imported.created[0];
  return {
    projectRoot,
    editorialStore,
    jobStore: new ContentJobStore(projectRoot, editorialStore),
    song,
  };
}

test("Admin 요청을 하나의 대기 작업으로 만들고 Naru/Codex가 수령한다", async () => {
  const { jobStore, song } = await fixture();
  const first = await jobStore.createResearchJob(song.id, song.revision);
  const duplicate = await jobStore.createResearchJob(song.id, song.revision);
  const work = await jobStore.claimNext();

  assert.equal(first.created, true);
  assert.equal(duplicate.created, false);
  assert.equal(work.job.id, first.job.id);
  assert.equal(work.job.status, "running");
  assert.equal(work.instructions.some((line) => line.includes("출처는 선택 사항")), true);
});

test("텍스트 조사 결과를 research.md로 저장하고 사용자 편집 전 단계로 넘긴다", async () => {
  const { editorialStore, jobStore, song } = await fixture();
  const request = await jobStore.createResearchJob(song.id, song.revision);
  await jobStore.claimNext();
  const resultText = "# 조사 메모\n\n## TMI 후보\n\n- 출처 없이도 재미있는 이야기";
  const submitted = await jobStore.submitResearch(request.job.id, resultText);
  const updated = await editorialStore.getSong(song.id);

  assert.equal(submitted.stale, false);
  assert.equal(updated.workflowStage, "research_ready");
  assert.equal(await editorialStore.readResearch(song.id), `${resultText}\n`);
});

test("요청 뒤 곡 revision이 바뀌면 오래된 조사를 자동 적용하지 않는다", async () => {
  const { editorialStore, jobStore, song } = await fixture();
  await jobStore.createResearchJob(song.id, song.revision);
  await editorialStore.saveSong(song.id, {
    ...song,
    descriptionText: "사용자가 먼저 수정한 원고",
  }, song.revision);

  assert.equal(await jobStore.claimNext(), null);
  const [job] = await jobStore.list();
  assert.equal(job.status, "stale");
  assert.equal(await editorialStore.readResearch(song.id), "");
});
