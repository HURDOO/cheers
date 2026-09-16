import assert from "node:assert/strict";
import test from "node:test";
import { buildPriorityItems, prioritySummary } from "../admin/priority.js";

function fixture() {
  return {
    priorityPlan: {
      label: "테스트 고연전",
      titles: {
        "yonsei-university-missing": "미등록곡",
        "original-shared": "공유 원곡",
      },
      originalSongIds: ["original-shared"],
      sides: {
        yonsei: {
          mustKnowSongIds: ["yonsei-university-review", "yonsei-university-missing"],
          rivalrySongIds: [],
          memorySongIds: [],
          lineageFamilyIds: ["original-shared"],
          baseballSongIds: [],
        },
        korea: {
          mustKnowSongIds: [],
          rivalrySongIds: [],
          memorySongIds: [],
          lineageFamilyIds: ["original-shared"],
          baseballSongIds: [],
        },
      },
    },
    organizations: [
      { id: "yonsei-university", name: "연세대학교" },
      { id: "korea-university", name: "고려대학교" },
    ],
    jobs: [],
    songs: [
      {
        id: "yonsei-university-review",
        organizationId: "yonsei-university",
        title: "검수곡",
        scopeStatus: "target",
        workflowStage: "review_ready",
        descriptionText: "소개",
        symbolicLines: ["하나", "둘"],
        quickFacts: [{ label: "사용 시작", value: "2020" }, { label: "특징", value: "테스트" }],
        videos: [{ sourceUrl: "https://example.com" }],
        lyrics: { lines: ["가사"] },
        relationships: [{ type: "original-song", targetId: "original-shared" }],
        publication: { status: "changes_pending" },
      },
      {
        id: "korea-university-extra",
        organizationId: "korea-university",
        title: "추가곡",
        scopeStatus: "target",
        workflowStage: "research_ready",
        descriptionText: "소개",
        symbolicLines: [],
        quickFacts: [],
        videos: [],
        lyrics: { lines: [] },
        relationships: [],
        publication: { status: "unpublished" },
      },
    ],
  };
}

test("행사 등급 안에서 최종 검수곡을 미등록곡보다 먼저 배치한다", () => {
  const items = buildPriorityItems(fixture());
  assert.equal(items[0].entityId, "yonsei-university-review");
  assert.equal(items[0].action, "final_review");
  assert.equal(items[1].entityId, "yonsei-university-missing");
  assert.equal(items[1].action, "add_missing");
  assert.equal(items.at(-1).groupKey, "eventBacklogSongIds");
});

test("양교가 공유하는 원곡 계보는 한 작업으로 합치고 양쪽을 요청문에 표시한다", () => {
  const lineage = buildPriorityItems(fixture()).find(({ key }) => key === "lineage:original-shared");
  assert.deepEqual(lineage.sideKeys, ["yonsei", "korea"]);
  assert.match(lineage.prompt, /연세·고려/u);
  assert.equal(lineage.action, "check_lineage");
});

test("요청문은 AI와 사용자의 공개 권한을 분리한다", () => {
  const item = buildPriorityItems(fixture())[0];
  assert.match(item.prompt, /직접 공개하거나 재공개하지는 마/u);
  assert.match(item.prompt, /내가 직접 할 일/u);
});

test("우선순위 요약은 누락·최종 확인·AI 작업을 분리해 센다", () => {
  const summary = prioritySummary(buildPriorityItems(fixture()));
  assert.equal(summary.missing, 1);
  assert.equal(summary.finalReview, 1);
  assert.equal(summary.aiReady, 4);
  assert.equal(summary.remaining, 4);
});
