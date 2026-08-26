import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { EditorialError } from "../scripts/content-editorial-store.mjs";
import { buildAssSubtitles } from "../scripts/reel-renderer.mjs";
import { ReelStore, reelDuration, validateReel } from "../scripts/reel-store.mjs";

async function fixture() {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "cheers-reel-test-"));
  return { projectRoot, store: new ReelStore(projectRoot) };
}

const sampleInput = {
  id: "shared-original-demo",
  title: "같은 원곡 응원가 모음",
  originalSongTitle: "테스트 원곡",
  hookText: "같은 멜로디가 이렇게 달라집니다",
  endCardText: "전체 응원가는 프로필 링크에서",
  postCaption: "테스트 게시물",
  status: "ready",
  clips: [
    {
      id: "clip-one",
      songId: "first-song",
      sourceUrl: "https://www.youtube.com/watch?v=abcdefghijk",
      startSeconds: 12.5,
      endSeconds: 20,
      headline: "첫 번째 응원가",
      attributionText: "YouTube @첫채널 · 첫 영상",
      lyricsLines: ["첫 줄", "둘째 줄"],
      crop: "center",
    },
    {
      id: "clip-two",
      sourceUrl: "https://youtu.be/lmnopqrstuv",
      startSeconds: 4,
      endSeconds: 10,
      headline: "두 번째 응원가",
      attributionText: "YouTube @둘째채널 · 둘째 영상",
      lyricsLines: ["셋째 줄"],
      crop: "right",
    },
  ],
};

test("릴스 프로젝트를 만들고 클립 순서와 자막을 수정한다", async () => {
  const { store } = await fixture();
  const created = await store.create(sampleInput);

  assert.equal(created.id, "shared-original-demo");
  assert.equal(created.clips.length, 2);
  assert.equal(reelDuration(created), 13.5);
  assert.equal(created.render.status, "idle");

  const saved = await store.save(created.id, {
    ...sampleInput,
    status: "approved",
    clips: [...sampleInput.clips].reverse(),
  }, created.revision);
  assert.equal(saved.revision, 2);
  assert.equal(saved.status, "approved");
  assert.equal(saved.clips[0].id, "clip-two");
});

test("각 클립의 화면 출처와 올바른 구간이 있어야 렌더할 수 있다", async () => {
  const { store } = await fixture();
  const created = await store.create({ ...sampleInput, clips: [] });

  assert.throws(
    () => validateReel(created, { requireRenderable: true }),
    (error) => error instanceof EditorialError && error.code === "REEL_CLIP_REQUIRED",
  );
  await assert.rejects(
    () => store.save(created.id, {
      ...sampleInput,
      clips: [{ ...sampleInput.clips[0], attributionText: "" }],
    }, created.revision),
    (error) => error instanceof EditorialError && error.code === "REEL_ATTRIBUTION_REQUIRED",
  );
});

test("ASS 자막에 훅·클립별 출처·가사·마지막 안내를 시간순으로 만든다", () => {
  const reel = {
    ...sampleInput,
    revision: 1,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    format: { width: 1080, height: 1920, fps: 30 },
  };
  const subtitles = buildAssSubtitles(reel);

  assert.match(subtitles, /Style: Source,Pretendard/u);
  assert.match(subtitles, /출처 · YouTube @첫채널 · 첫 영상/u);
  assert.match(subtitles, /첫 줄/u);
  assert.match(subtitles, /0:00:07\.50,0:00:13\.50,Source/u);
  assert.match(subtitles, /전체 응원가는 프로필 링크에서/u);
});

test("렌더 상태는 기획 revision과 분리해 갱신한다", async () => {
  const { store } = await fixture();
  const created = await store.create(sampleInput);
  await store.writeRenderStatus(created.id, { status: "rendering", progress: 42, phase: "클립 연결" });
  const loaded = await store.get(created.id);

  assert.equal(loaded.revision, 1);
  assert.equal(loaded.render.status, "rendering");
  assert.equal(loaded.render.progress, 42);
});
