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

test("Admin 요청을 하나의 반복 가능한 수집·작성 작업으로 만들고 Naru/Codex가 수령한다", async () => {
  const { jobStore, song } = await fixture();
  const first = await jobStore.createResearchJob(song.id, song.revision);
  const duplicate = await jobStore.createResearchJob(song.id, song.revision);
  const work = await jobStore.claimNext();

  assert.equal(first.created, true);
  assert.equal(duplicate.created, false);
  assert.equal(work.job.id, first.job.id);
  assert.equal(work.job.status, "running");
  assert.equal(work.job.type, "enrich_song");
  assert.equal(work.instructions.some((line) => line.includes("소재 약 10개")), true);
  assert.equal(work.instructions.some((line) => line.includes("현재 descriptionText")), true);
  assert.equal(work.outputFormat.fileType, "json");
});

test("AI가 현재 글을 보강한 공개 본문과 작업 기록을 제출하고 수집 완료 라벨을 붙인다", async () => {
  const { editorialStore, jobStore, song } = await fixture();
  const seeded = await editorialStore.saveSong(song.id, { descriptionText: "사용자가 남긴 문장" }, song.revision);
  const request = await jobStore.createEnrichmentJob(song.id, seeded.revision);
  await jobStore.claimNext();
  const result = {
    descriptionText: "사용자가 남긴 문장을 살리고 흥미로운 이야기를 보강했다.[* https://example.com]",
    researchText: "# AI 작업 기록\n\n- 기존 문장을 보존하고 TMI를 추가함",
  };
  const submitted = await jobStore.submitEnrichment(request.job.id, result);
  const updated = await editorialStore.getSong(song.id);

  assert.equal(submitted.stale, false);
  assert.equal(updated.workflowStage, "research_ready");
  assert.equal(updated.descriptionText, result.descriptionText);
  assert.equal(await editorialStore.readResearch(song.id), `${result.researchText}\n`);
});

test("Codex는 소재 노트만 제출하고 공개 본문과 다듬기 상태는 그대로 둔다", async () => {
  const { editorialStore, jobStore, song } = await fixture();
  const seeded = await editorialStore.saveSong(song.id, { descriptionText: "다듬은 본문", descriptionStatus: "polished" }, song.revision);
  const request = await jobStore.createEnrichmentJob(song.id, seeded.revision);
  const work = await jobStore.claimNext();
  assert.deepEqual(Object.keys(work.outputFormat.fields), ["researchText"]);

  await jobStore.submitEnrichment(request.job.id, { researchText: "## 소재\n\n### 1. 새 이야기\n- 내용: 구전\n- 확신도: 구전\n- 출처: 없음" });
  const updated = await editorialStore.getSong(song.id);
  assert.equal(updated.descriptionText, "다듬은 본문");
  assert.equal(updated.descriptionStatus, "polished");
  assert.equal(updated.workflowStage, "research_ready");
});

test("이전 계약처럼 본문을 함께 제출하면 다듬기 전 초안으로 저장한다", async () => {
  const { editorialStore, jobStore, song } = await fixture();
  const seeded = await editorialStore.saveSong(song.id, { descriptionStatus: "polished" }, song.revision);
  const request = await jobStore.createEnrichmentJob(song.id, seeded.revision);
  await jobStore.claimNext();
  await jobStore.submitEnrichment(request.job.id, { descriptionText: "AI 문장", researchText: "노트" });
  const updated = await editorialStore.getSong(song.id);
  assert.equal(updated.descriptionText, "AI 문장");
  assert.equal(updated.descriptionStatus, "draft");
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

test("완료한 곡도 최신 revision으로 다시 작업 목록에 올릴 수 있다", async () => {
  const { editorialStore, jobStore, song } = await fixture();
  const first = await jobStore.createEnrichmentJob(song.id, song.revision);
  await jobStore.claimNext();
  await jobStore.submitEnrichment(first.job.id, {
    descriptionText: "첫 번째 AI 본문",
    researchText: "첫 작업 기록",
  });

  const updated = await editorialStore.getSong(song.id);
  const second = await jobStore.createEnrichmentJob(song.id, updated.revision);
  assert.equal(second.created, true);
  assert.notEqual(second.job.id, first.job.id);
  assert.equal(second.job.inputRevision, updated.revision);
});
