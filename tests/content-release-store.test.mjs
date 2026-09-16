import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { EditorialError, EditorialStore } from "../scripts/content-editorial-store.mjs";
import { ContentReleaseStore, validatePublicCatalog } from "../scripts/content-release-store.mjs";

async function fixture() {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "cheers-release-test-"));
  const dataDirectory = path.join(projectRoot, "data");
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(path.join(dataDirectory, "teams.json"), JSON.stringify({
    schemaVersion: 1,
    items: [{
      id: "test-university",
      name: "테스트대학교",
      abbreviation: "TEST",
      type: "university",
      region: "서울",
      colors: { primary: "#112233", secondary: "#445566" },
    }],
  }));
  await writeFile(path.join(dataDirectory, "cheer-songs.json"), JSON.stringify({
    schemaVersion: 1,
    items: [{
      id: "approved-song",
      title: "승인곡",
      aliases: [],
      symbolicLines: ["승인", "응원"],
      teamId: "test-university",
      originalSongId: "original-song",
      originType: "adaptation",
      originNote: "원곡 관계",
      year: 2020,
      timelineYear: 2020,
      yearStatus: "confirmed",
      yearLabel: "2020",
      chronologyNote: "사용자 승인",
      lyrics: ["첫 줄", "둘째 줄"],
      description: "승인된 소개",
      usageContext: "승인된 사용 맥락",
      status: "verified",
      sources: [],
    }],
  }));
  await writeFile(path.join(dataDirectory, "media.json"), JSON.stringify({
    schemaVersion: 1,
    items: [{
      id: "approved-video",
      cheerSongId: "approved-song",
      videoId: "abcdefghijk",
      title: "승인 영상",
      channelName: "채널",
      role: "official-performance",
      sourceUrl: "https://www.youtube.com/watch?v=abcdefghijk",
      preferred: true,
      availability: "playable",
    }],
  }));
  const editorialStore = new EditorialStore(projectRoot);
  const releaseStore = new ContentReleaseStore(projectRoot, editorialStore);
  await editorialStore.initialize();
  return { projectRoot, editorialStore, releaseStore };
}

test("기존 정본을 최초 불변 릴리스와 사이트 카탈로그로 보존한다", async () => {
  const { projectRoot, editorialStore, releaseStore } = await fixture();
  const catalog = await releaseStore.initialize();
  const status = await releaseStore.describe(await editorialStore.state());
  const releaseFiles = await readdir(path.join(projectRoot, "content", "releases"));

  assert.equal(catalog.songs.length, 1);
  assert.equal(catalog.songs[0].descriptionText, "승인된 소개\n\n승인된 사용 맥락");
  assert.equal(status.songs["approved-song"].status, "current");
  assert.deepEqual(releaseFiles, [`${catalog.releaseId}.json`]);
  validatePublicCatalog(catalog);
});

test("편집 revision을 공개하면 새 릴리스를 만들고 내부 필드를 제외한다", async () => {
  const { projectRoot, editorialStore, releaseStore } = await fixture();
  const initial = await releaseStore.initialize();
  const current = await editorialStore.getSong("approved-song");
  const edited = await editorialStore.saveSong(current.id, {
    descriptionText: "수정한 공개 본문.[* 참고 메모]",
    workflowStage: "review_ready",
  }, current.revision);

  assert.equal((await releaseStore.describe()).songs[edited.id].status, "changes_pending");
  const result = await releaseStore.publishSongs([{ id: edited.id, expectedRevision: edited.revision }]);
  const published = result.catalog.songs.find((song) => song.id === edited.id);
  const releaseFiles = await readdir(path.join(projectRoot, "content", "releases"));

  assert.notEqual(result.release.releaseId, initial.releaseId);
  assert.equal(published.descriptionText, "수정한 공개 본문.[* 참고 메모]");
  assert.equal("workflowStage" in published, false);
  assert.equal("researchText" in published, false);
  assert.equal((await releaseStore.describe()).songs[edited.id].status, "current");
  await editorialStore.saveSong(edited.id, { workflowStage: "published" }, edited.revision);
  assert.equal((await releaseStore.describe()).songs[edited.id].status, "current");
  assert.equal(releaseFiles.length, 2);

  const snapshot = JSON.parse(await readFile(path.join(projectRoot, "content", "releases", `${result.release.releaseId}.json`), "utf8"));
  assert.equal(snapshot.parentReleaseId, initial.releaseId);
  assert.deepEqual(snapshot.changedSongIds, [edited.id]);
});

test("공개 후 수정본은 자동 노출하지 않고 재공개 필요로 표시한다", async () => {
  const { editorialStore, releaseStore } = await fixture();
  await releaseStore.initialize();
  const current = await editorialStore.getSong("approved-song");
  const edited = await editorialStore.saveSong(current.id, { descriptionText: "첫 공개 수정본" }, current.revision);
  await releaseStore.publishSongs([{ id: edited.id, expectedRevision: edited.revision }]);
  const later = await editorialStore.saveSong(edited.id, { descriptionText: "아직 공개하지 않은 후속 수정본" }, edited.revision);
  const catalog = await releaseStore.readCurrent();

  assert.equal((await releaseStore.describe()).songs[later.id].status, "changes_pending");
  assert.equal(catalog.songs[0].descriptionText, "첫 공개 수정본");
});

test("소속 정보가 바뀌면 연결된 공개곡도 재공개 대상으로 표시한다", async () => {
  const { editorialStore, releaseStore } = await fixture();
  await releaseStore.initialize();
  const organization = await editorialStore.getOrganization("test-university");
  await editorialStore.saveOrganization(organization.id, { name: "새 테스트대학교" }, organization.revision);

  assert.equal((await releaseStore.describe()).songs["approved-song"].status, "changes_pending");
});

test("공개 내리기는 새 릴리스에서만 곡을 제외하고 이전 스냅샷은 남긴다", async () => {
  const { projectRoot, editorialStore, releaseStore } = await fixture();
  const initial = await releaseStore.initialize();
  const song = await editorialStore.getSong("approved-song");
  const result = await releaseStore.unpublishSongs([{ id: song.id, expectedRevision: song.revision }]);

  assert.equal(result.catalog.songs.length, 0);
  assert.equal((await releaseStore.describe()).songs[song.id].status, "unpublished");
  assert.equal(JSON.parse(await readFile(path.join(projectRoot, "content", "releases", `${initial.releaseId}.json`), "utf8")).songs.length, 1);
});

test("오래된 revision으로 공개하면 현재 릴리스를 바꾸지 않는다", async () => {
  const { editorialStore, releaseStore } = await fixture();
  const initial = await releaseStore.initialize();
  const song = await editorialStore.getSong("approved-song");
  await editorialStore.saveSong(song.id, { descriptionText: "새 수정본" }, song.revision);

  await assert.rejects(
    () => releaseStore.publishSongs([{ id: song.id, expectedRevision: song.revision }]),
    (error) => error instanceof EditorialError && error.code === "REVISION_CONFLICT",
  );
  assert.equal((await releaseStore.readCurrent()).releaseId, initial.releaseId);
});
