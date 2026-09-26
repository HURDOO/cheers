import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPolishPrompt,
  parsePolishResponse,
  parseTimestamp,
  pickPolishExemplars,
  videoUrlWithStart,
  workQueue,
} from "../admin/workbench.js";

function song(id, overrides = {}) {
  return {
    id,
    organizationId: "test-team",
    title: id,
    aliases: [],
    scopeStatus: "target",
    descriptionText: "",
    descriptionStatus: "draft",
    researchText: "",
    lyrics: { lines: [] },
    videos: [],
    publication: { status: "unpublished" },
    ...overrides,
  };
}

const video = { rank: 1, videoId: "aaaaaaaaaaa", sourceUrl: "https://www.youtube.com/watch?v=aaaaaaaaaaa" };

test("작업 종류마다 남은 곡만 대기열에 넣는다", () => {
  const database = {
    priorityPlan: null,
    songs: [
      song("needs-everything", { researchText: "노트" }),
      song("ready", { videos: [video], lyrics: { lines: ["가사"] } }),
      song("published", { videos: [video], lyrics: { lines: ["가사"] }, descriptionStatus: "polished", publication: { status: "current" } }),
      song("rejected", { scopeStatus: "rejected" }),
    ],
  };
  assert.deepEqual(workQueue(database, "videos").map(({ id }) => id), ["needs-everything"]);
  assert.deepEqual(workQueue(database, "lyrics").map(({ id }) => id), ["needs-everything"]);
  assert.deepEqual(workQueue(database, "polish").map(({ id }) => id), ["needs-everything"]);
  assert.deepEqual(workQueue(database, "publish").map(({ id }) => id), ["ready"]);
  assert.deepEqual(workQueue(database, "videos", { includeDone: true }).map(({ id }) => id), ["needs-everything", "published", "ready"]);
});

test("시작 시각 입력과 URL의 t 파라미터를 서로 변환한다", () => {
  assert.equal(parseTimestamp("2:40"), 160);
  assert.equal(parseTimestamp("1:02:30"), 3750);
  assert.equal(parseTimestamp("95"), 95);
  assert.equal(parseTimestamp("2:75"), null);
  assert.equal(parseTimestamp("abc"), null);
  assert.equal(videoUrlWithStart("aaaaaaaaaaa", 160), "https://www.youtube.com/watch?v=aaaaaaaaaaa&t=160s");
  assert.equal(videoUrlWithStart("aaaaaaaaaaa", 0), "https://www.youtube.com/watch?v=aaaaaaaaaaa");
});

test("다듬기 요청문에 문체 예시, 소재 노트와 답변 형식을 담는다", () => {
  const songs = [song("song-a", { title: "곡 A", researchText: "## 소재\n- 내용: 비밀 이야기" })];
  const exemplar = song("song-b", { title: "곡 B", descriptionText: "예시 문단", descriptionStatus: "polished" });
  const prompt = buildPolishPrompt(songs, { organizations: [{ id: "test-team", name: "테스트 팀" }], exemplars: [exemplar] });
  assert.match(prompt, /--- 예시: 곡 B \(테스트 팀\) ---\n예시 문단/u);
  assert.match(prompt, /\[곡 song-a\] 곡 A · 테스트 팀/u);
  assert.match(prompt, /비밀 이야기/u);
  assert.match(prompt, /===== song-a =====/u);
  assert.match(prompt, /===== END =====$/u);
});

test("문체 예시는 공개 중인 다듬은 긴 본문에서 고른다", () => {
  const long = "가".repeat(400);
  const songs = [
    song("short", { descriptionText: "짧음", descriptionStatus: "polished", publication: { status: "current" } }),
    song("draft", { descriptionText: long, publication: { status: "current" } }),
    song("long", { descriptionText: long, descriptionStatus: "polished", publication: { status: "current" } }),
    song("excluded", { descriptionText: `${long}나`, descriptionStatus: "polished", publication: { status: "current" } }),
  ];
  assert.deepEqual(pickPolishExemplars(songs, new Set(["excluded"])).map(({ id }) => id), ["long"]);
});

test("ChatGPT 답변을 곡 ID별 본문으로 나누고 문제를 알려 준다", () => {
  const response = [
    "```",
    "===== song-a =====",
    "첫 문단이다.",
    "",
    "둘째 문단이다.[* 출처: https://example.com]",
    "===== song-b =====",
    "(공개 본문)",
    "===== unknown-song =====",
    "무시",
    "===== END =====",
    "```",
  ].join("\n");
  const parsed = parsePolishResponse(response, { knownIds: ["song-a", "song-b", "song-c"], expectedIds: ["song-a", "song-b", "song-c"] });
  assert.deepEqual(parsed.items, [{ id: "song-a", descriptionText: "첫 문단이다.\n\n둘째 문단이다.[* 출처: https://example.com]" }]);
  assert.deepEqual(parsed.emptyIds, ["song-b"]);
  assert.deepEqual(parsed.unknownIds, ["unknown-song"]);
  assert.deepEqual(parsed.missingIds, ["song-c"]);
});
