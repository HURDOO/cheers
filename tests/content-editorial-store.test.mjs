import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  EditorialError,
  EditorialStore,
  extractYouTubeVideoId,
  parseBulkTitles,
} from "../scripts/content-editorial-store.mjs";

async function fixture() {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "cheers-editorial-test-"));
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
      lyrics: ["첫 줄", "둘째 줄", "셋째 줄"],
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
  return { projectRoot, store: new EditorialStore(projectRoot) };
}

test("번호와 불릿이 포함된 목록을 제목 목록으로 정리한다", () => {
  assert.deepEqual(parseBulkTitles("1. 첫 곡\n- 둘째 곡\n• 첫 곡\n\n3) 셋째 곡"), ["첫 곡", "둘째 곡", "셋째 곡"]);
});

test("일반 YouTube, 단축, Shorts URL에서 영상 ID를 읽는다", () => {
  assert.equal(extractYouTubeVideoId("https://www.youtube.com/watch?v=abcdefghijk"), "abcdefghijk");
  assert.equal(extractYouTubeVideoId("https://youtu.be/abcdefghijk?t=3"), "abcdefghijk");
  assert.equal(extractYouTubeVideoId("https://youtube.com/shorts/abcdefghijk"), "abcdefghijk");
  assert.equal(extractYouTubeVideoId("https://example.com/video"), null);
});

test("현재 공개곡은 파일을 복제하지 않고 편집 가능한 레거시 레코드로 보여 준다", async () => {
  const { store } = await fixture();
  const state = await store.state();
  const song = state.songs[0];

  assert.equal(song.id, "approved-song");
  assert.equal(song.workflowStage, "published");
  assert.equal(song.persisted, false);
  assert.equal(song.revision, 0);
  assert.equal(song.descriptionText, "승인된 소개\n\n승인된 사용 맥락");
  assert.equal(song.videos[0].rank, 1);
});

test("사용자 대상·보류와 AI 발견곡을 서로 다른 범위로 가져온다", async () => {
  const { store } = await fixture();
  const result = await store.importSongs({
    organizationId: "test-university",
    targetText: "대상곡",
    deferredText: "보류곡",
    discoveredText: "발견곡",
  });

  assert.equal(result.created.length, 3);
  assert.deepEqual(
    result.created.map(({ discoveredBy, scopeStatus }) => [discoveredBy, scopeStatus]),
    [["user", "target"], ["user", "deferred"], ["ai", "discovered_pending"]],
  );
});

test("출처와 권리 확인 필드 없이 자유 본문과 영상 공개 문구를 저장한다", async () => {
  const { store } = await fixture();
  const current = await store.getSong("approved-song");
  const saved = await store.saveSong("approved-song", {
    title: current.title,
    aliases: ["별칭"],
    scopeStatus: "target",
    workflowStage: "published",
    descriptionText: "흥미로운 이야기.[* 원문 출처: https://example.com] 출처 없는 이야기도 가능하다.",
    lyrics: { lines: ["첫 줄", "둘째 줄"] },
    quickFacts: [{ label: "사용 시작", value: "2020" }],
    videos: [{
      rank: 1,
      sourceUrl: "https://youtu.be/abcdefghijk",
      title: "직접 고른 영상",
      channelName: "채널",
      attributionText: "화면에 표시할 출처 문구",
    }],
  }, 0);

  assert.equal(saved.revision, 1);
  assert.equal(saved.workflowStage, "editing");
  assert.equal(saved.descriptionText.includes("출처 없는"), true);
  assert.equal("rights" in saved.videos[0], false);
  assert.equal("permission" in saved.videos[0], false);
});

test("오래된 revision으로 저장하면 덮어쓰지 않는다", async () => {
  const { store } = await fixture();
  const current = await store.getSong("approved-song");
  const input = {
    ...current,
    lyrics: current.lyrics,
    quickFacts: current.quickFacts,
    videos: current.videos,
  };
  await store.saveSong("approved-song", input, 0);

  await assert.rejects(
    () => store.saveSong("approved-song", input, 0),
    (error) => error instanceof EditorialError && error.code === "REVISION_CONFLICT",
  );
});
