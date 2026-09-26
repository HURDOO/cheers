import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  VideoCandidateStore,
  buildSearchQueries,
  collectVideoCandidates,
  extractTimestamps,
  findStartHints,
  rankSearchResults,
} from "../scripts/video-candidates.mjs";

const song = { id: "doosan-bears-haeya", title: "해야", aliases: ["해야해야"], symbolicLines: ["해야 해야", ""] };
const organization = { id: "doosan-bears", name: "두산 베어스", abbreviation: "두산" };

test("곡명·소속·별칭으로 중복 없는 검색어를 만든다", () => {
  assert.deepEqual(buildSearchQueries(song, organization), [
    "두산 베어스 해야 응원가",
    "두산 베어스 해야 직캠",
    "두산 해야 떼창",
    "두산 베어스 해야해야 응원가",
  ]);
});

test("댓글·설명의 타임스탬프를 초로 읽고 잘못된 값은 버린다", () => {
  assert.deepEqual(extractTimestamps("해야 떠라 2:40\n1:02:30 마지막\n12:99 오류\n2026.09.26"), [
    { seconds: 160, line: "해야 떠라 2:40" },
    { seconds: 3750, line: "1:02:30 마지막" },
  ]);
});

test("곡을 언급한 타임스탬프만 시작 초 단서로 모으고 가까운 값은 합친다", () => {
  const hints = findStartHints({
    durationSeconds: 600,
    chapters: [{ title: "해야", start_time: 158.4 }],
    description: "0:10 인트로",
    comments: [
      { text: "해야 떠라부활기념 2:40" },
      { text: "2:41 해야해야 소름" },
      { text: "4:25 6:50 이거 플래시 다시" },
      { text: "9:59 해야 끝" },
      { text: "해야 12:00 영상 밖" },
    ],
  }, song);
  assert.deepEqual(hints.map(({ seconds, source, votes }) => [seconds, source, votes]), [
    [158, "chapter", 3],
    [599, "comment", 1],
  ]);
});

test("곡명이 제목에 있는 영상과 여러 검색어에 걸린 영상을 위로 올린다", () => {
  const ranked = rankSearchResults([
    { query: "q1", entries: [
      { id: "aaaaaaaaaaa", title: "두산 베어스 응원가 해야 떼창", duration: 90, view_count: 1000, channel: "팬" },
      { id: "bbbbbbbbbbb", title: "두산 승리를 위하여", duration: 90, view_count: 1_000_000, channel: "팬" },
      { id: "PL-playlist-id", title: "재생목록" },
    ] },
    { query: "q2", entries: [{ id: "aaaaaaaaaaa", title: "두산 베어스 응원가 해야 떼창", duration: 90, view_count: 1000 }] },
  ], { song, organization });
  assert.deepEqual(ranked.map(({ videoId }) => videoId), ["aaaaaaaaaaa", "bbbbbbbbbbb"]);
  assert.deepEqual(ranked[0].queries, ["q1", "q2"]);
  assert.deepEqual(ranked[0].matchedBy, ["곡명", "소속", "응원 키워드"]);
});

test("검색·상세 조회 실패는 기록하고 나머지 후보를 저장한다", async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "cheers-candidates-test-"));
  const calls = [];
  const run = async (args) => {
    calls.push(args[0]);
    if (args[0].includes("직캠")) throw new Error("network down");
    if (args[0].startsWith("ytsearch")) {
      return JSON.stringify({ entries: [{ id: "aaaaaaaaaaa", title: "해야 응원가", duration: 80, view_count: 10 }, { id: "ccccccccccc", title: "해야", duration: 80 }] });
    }
    if (args[0].endsWith("ccccccccccc")) throw new Error("private video");
    return JSON.stringify({ duration: 80, view_count: 12, upload_date: "20240101", comments: [{ text: "0:15 해야 시작" }] });
  };
  const result = await collectVideoCandidates({ song, organization }, { run, now: () => new Date("2026-09-26T00:00:00Z") });
  const store = new VideoCandidateStore(projectRoot);
  await store.write(result);

  assert.equal(result.items.length, 2);
  assert.equal(result.items.find((item) => item.videoId === "aaaaaaaaaaa").startHints[0].seconds, 15);
  assert.equal(result.errors.length, 2);
  assert.deepEqual(await store.read(song.id), result);
  assert.deepEqual(await store.summaries(), { [song.id]: { collectedAt: "2026-09-26T00:00:00.000Z", count: 2, errorCount: 2 } });
  await assert.rejects(store.read("../escape"), { code: "INVALID_ID" });
});
