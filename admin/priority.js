const GROUPS = [
  { key: "mustKnowSongIds", code: "P0", label: "필수 암기", description: "행사 전에 먼저 공개할 양교 핵심곡", order: 0, kind: "song" },
  { key: "rivalrySongIds", code: "P1", label: "라이벌전", description: "고연전 현장에서 맥락이 가장 선명한 곡", order: 1, kind: "song" },
  { key: "memorySongIds", code: "P2", label: "추억곡", description: "세대별 기억과 현장 설명을 채울 곡", order: 2, kind: "song" },
  { key: "lineageFamilyIds", code: "P3", label: "원곡 계보", description: "양교·야구 응원가가 만나는 원곡 관계", order: 3, kind: "lineage" },
  { key: "baseballSongIds", code: "P4", label: "야구장 연결", description: "대학 응원과 프로야구 응원의 연결 사례", order: 4, kind: "song" },
];

const ACTION_ORDER = {
  final_review: 0,
  publish: 1,
  editorial_review: 2,
  collect: 3,
  add_missing: 4,
  check_lineage: 5,
  waiting: 6,
  complete: 7,
};

const PUBLICATION_ORDER = { changes_pending: 0, unpublished: 1, current: 2 };

const SIDE_LABELS = { yonsei: "연세", korea: "고려" };
const ACTIVE_JOB_STATUSES = new Set(["queued", "running"]);

function latestJobForSong(jobs, id) {
  return [...jobs].reverse().find((job) => job.songId === id) ?? null;
}

function inferOrganizationId(songId, organizations) {
  return organizations
    .map(({ id }) => id)
    .sort((left, right) => right.length - left.length)
    .find((id) => songId.startsWith(`${id}-`)) ?? "";
}

function songGaps(song) {
  const gaps = [];
  if (!song.descriptionText?.trim()) gaps.push("소개");
  if ((song.symbolicLines ?? []).filter(Boolean).length < 2) gaps.push("상징문구 2줄");
  if ((song.quickFacts ?? []).filter((fact) => fact.label?.trim() && fact.value?.trim()).length < 2) gaps.push("TMI");
  if ((song.videos ?? []).length === 0) gaps.push("대표 영상");
  if ((song.relationships ?? []).length === 0) gaps.push("원곡 관계");
  if ((song.lyrics?.lines ?? []).filter(Boolean).length === 0) gaps.push("가사(선택)");
  return gaps;
}

function songAction(song, jobs) {
  const publicationStatus = song.publication?.status ?? "unpublished";
  const job = latestJobForSong(jobs, song.id);
  if (publicationStatus === "current") return "complete";
  if (ACTIVE_JOB_STATUSES.has(job?.status)) return "waiting";
  if (song.workflowStage === "approved") return "publish";
  if (song.workflowStage === "review_ready" || (song.workflowStage === "published" && publicationStatus === "changes_pending")) {
    return "final_review";
  }
  if (["research_ready", "editing"].includes(song.workflowStage)) return "editorial_review";
  return "collect";
}

function actionCopy(action, publicationStatus, gaps = []) {
  const republish = publicationStatus === "changes_pending";
  const gapText = gaps.length ? ` 특히 ${gaps.join(" · ")} 항목을 확인합니다.` : "";
  if (action === "complete") return {
    label: "공개 완료",
    tone: "green",
    chatgptTask: "추가 작업 없음",
    userTask: "이벤트 화면에서 노출만 확인",
  };
  if (action === "waiting") return {
    label: "AI 작업 중",
    tone: "blue",
    chatgptTask: "현재 수집 작업을 끝내고 결과와 불확실한 항목을 요약",
    userTask: "완료 뒤 출처와 영상 후보 확인",
  };
  if (action === "publish") return {
    label: republish ? "재공개 가능" : "공개 가능",
    tone: "green",
    chatgptTask: "공개 전 변경점과 남은 위험만 짧게 요약",
    userTask: `${republish ? "재공개" : "공개"} 버튼을 눌러 로컬 사이트 반영`,
  };
  if (action === "final_review") return {
    label: "최종 확인",
    tone: "purple",
    chatgptTask: `편집본과 조사 근거를 교차 검수하고 사실·중복·문장·관계를 마지막으로 점검.${gapText}`,
    userTask: `대표 영상·가사·상징문구를 직접 확인한 뒤 ${republish ? "재공개" : "공개"}`,
  };
  if (action === "editorial_review") return {
    label: "편집 검수",
    tone: "orange",
    chatgptTask: `research.md와 편집본을 대조해 빈 항목과 근거가 약한 문장을 보강하고 검수 대기로 이동.${gapText}`,
    userTask: "출처 신뢰도와 대표 영상·가사·상징문구를 직접 확인",
  };
  if (action === "collect") return {
    label: "AI 수집 요청",
    tone: "orange",
    chatgptTask: `공식·1차 자료부터 조사해 소개, 원곡 관계, 연혁, TMI 초안을 작성.${gapText}`,
    userTask: "수집 결과의 출처와 영상 후보를 검토",
  };
  if (action === "add_missing") return {
    label: "목록 추가 필요",
    tone: "red",
    chatgptTask: "곡의 정확한 명칭과 소속을 확인해 Admin에 추가하고, 근거 조사와 편집 초안을 작성",
    userTask: "동명이곡 여부와 대표 영상을 확인한 뒤 검수 대기로 이동",
  };
  return {
    label: "계보 점검",
    tone: "orange",
    chatgptTask: "원곡 정본과 연결 응원가의 관계 근거를 확인하고 누락된 원곡·관계를 보강",
    userTask: "원곡 식별과 관계 표현을 확인",
  };
}

function songPrompt(item) {
  const path = item.exists ? `content/editorial/songs/${item.entityId}/song.json과 같은 폴더의 research.md` : "Admin의 새 응원가 레코드";
  const finalStage = item.action === "publish" ? "공개 전 변경 요약까지만 작성" : "workflowStage를 review_ready까지만 이동";
  return [
    `Cheers 프로젝트의 2026 고연전 우선순위 ${item.code} 작업을 진행해줘.`,
    `대상: ${item.organizationName ? `${item.organizationName} · ` : ""}${item.title}`,
    `ID: ${item.entityId}`,
    `큐레이션: ${item.groupLabel} / ${item.sideLabels.join("·")}`,
    `현재 상태: ${item.actionLabel}${item.gaps.length ? ` / 확인할 빈 항목: ${item.gaps.join(", ")}` : ""}`,
    "",
    `1. ${path}를 먼저 읽어 현재 편집 내용을 보존해줘.`,
    `2. ${item.chatgptTask}`,
    "3. 확인 가능한 출처를 research.md에 남기고, 추정은 사실처럼 단정하지 말아줘.",
    `4. ${finalStage}하고 직접 공개하거나 재공개하지는 마.`,
    "5. 완료 후 변경 내용, 불확실한 부분, 내가 직접 확인할 항목을 짧게 요약해줘.",
    "",
    `내가 직접 할 일: ${item.userTask}`,
  ].join("\n");
}

function lineagePrompt(item) {
  return [
    `Cheers 프로젝트의 2026 고연전 원곡 계보 작업을 진행해줘.`,
    `원곡: ${item.title}`,
    `원곡 ID: ${item.entityId}`,
    `대상 학교: ${item.sideLabels.join("·")}`,
    `현재 상태: ${item.actionLabel}`,
    "",
    "1. data/original-songs.json과 content/editorial/songs 아래의 relationships를 먼저 확인해줘.",
    `2. ${item.chatgptTask}`,
    "3. 원곡 식별, 차용·개사 관계, 연대 정보는 신뢰할 수 있는 근거를 남기고 추정은 구분해줘.",
    "4. 연결된 응원가를 직접 공개하거나 재공개하지 마.",
    "5. 완료 후 수정한 파일, 남은 불확실성, 내가 확인할 관계를 요약해줘.",
    "",
    `내가 직접 할 일: ${item.userTask}`,
  ].join("\n");
}

function makeSongItem({ id, side, group, plan, songs, jobs, organizations }) {
  const song = songs.find((candidate) => candidate.id === id) ?? null;
  const organizationId = song?.organizationId ?? inferOrganizationId(id, organizations);
  const organization = organizations.find(({ id: candidateId }) => candidateId === organizationId);
  const gaps = song ? songGaps(song) : [];
  const action = song ? songAction(song, jobs) : "add_missing";
  const copy = actionCopy(action, song?.publication?.status ?? "unpublished", gaps);
  const item = {
    key: `song:${id}`,
    kind: "song",
    entityId: id,
    title: song?.title ?? plan.titles?.[id] ?? id,
    organizationId,
    organizationName: organization?.name ?? "",
    sideKeys: [side],
    sideLabels: [SIDE_LABELS[side]],
    groupKey: group.key,
    groupLabel: group.label,
    groupDescription: group.description,
    code: group.code,
    groupOrder: group.order,
    action,
    publicationStatus: song?.publication?.status ?? "unpublished",
    actionLabel: copy.label,
    tone: copy.tone,
    chatgptTask: copy.chatgptTask,
    userTask: copy.userTask,
    gaps,
    exists: Boolean(song),
    song,
  };
  item.prompt = songPrompt(item);
  return item;
}

function makeLineageItem({ id, side, group, plan, songs, originalSongIds }) {
  const relatedSongs = songs.filter((song) => (
    (song.relationships ?? []).some((relationship) => relationship.targetId === id)
  ));
  const originalExists = originalSongIds.has(id);
  const currentRelations = relatedSongs.filter((song) => song.publication?.status === "current");
  const complete = originalExists && currentRelations.length > 0;
  const action = complete ? "complete" : "check_lineage";
  const copy = actionCopy(action, "unpublished");
  const missing = [
    ...(!originalExists ? ["원곡 정본"] : []),
    ...(relatedSongs.length === 0 ? ["응원가 관계"] : []),
    ...(relatedSongs.length > 0 && currentRelations.length === 0 ? ["관계가 반영된 공개본"] : []),
  ];
  const item = {
    key: `lineage:${id}`,
    kind: "lineage",
    entityId: id,
    title: plan.titles?.[id] ?? id,
    organizationId: "",
    organizationName: "원곡 데이터",
    sideKeys: [side],
    sideLabels: [SIDE_LABELS[side]],
    groupKey: group.key,
    groupLabel: group.label,
    groupDescription: group.description,
    code: group.code,
    groupOrder: group.order,
    action,
    publicationStatus: "unpublished",
    actionLabel: copy.label,
    tone: copy.tone,
    chatgptTask: `${copy.chatgptTask}${missing.length ? ` 현재 누락: ${missing.join(" · ")}.` : ""}`,
    userTask: copy.userTask,
    gaps: missing,
    exists: originalExists,
    relatedSongIds: relatedSongs.map(({ id: songId }) => songId),
  };
  item.prompt = lineagePrompt(item);
  return item;
}

function mergeItem(target, next) {
  target.sideKeys = [...new Set([...target.sideKeys, ...next.sideKeys])];
  target.sideLabels = [...new Set([...target.sideLabels, ...next.sideLabels])];
  return target;
}

function taskComparator(left, right) {
  return left.groupOrder - right.groupOrder
    || ACTION_ORDER[left.action] - ACTION_ORDER[right.action]
    || (PUBLICATION_ORDER[left.publicationStatus] ?? 3) - (PUBLICATION_ORDER[right.publicationStatus] ?? 3)
    || left.sideLabels.join("").localeCompare(right.sideLabels.join(""), "ko")
    || left.title.localeCompare(right.title, "ko");
}

export function buildPriorityItems(database) {
  const plan = database.priorityPlan;
  if (!plan?.sides) return [];
  const songs = database.songs ?? [];
  const jobs = database.jobs ?? [];
  const organizations = database.organizations ?? [];
  const originalSongIds = new Set(plan.originalSongIds ?? []);
  const items = new Map();
  const directSongIds = new Set();

  for (const [side, curation] of Object.entries(plan.sides)) {
    for (const group of GROUPS) {
      for (const id of curation[group.key] ?? []) {
        if (group.kind === "song") directSongIds.add(id);
        const next = group.kind === "song"
          ? makeSongItem({ id, side, group, plan, songs, jobs, organizations })
          : makeLineageItem({ id, side, group, plan, songs, originalSongIds });
        items.set(next.key, items.has(next.key) ? mergeItem(items.get(next.key), next) : next);
      }
    }
  }

  const backlogGroup = {
    key: "eventBacklogSongIds",
    code: "P5",
    label: "양교 추가곡",
    description: "핵심 큐 다음에 검토할 고려·연세 응원가",
    order: 5,
    kind: "song",
  };
  for (const song of songs) {
    if (song.scopeStatus !== "target" || directSongIds.has(song.id)) continue;
    const side = song.organizationId === "yonsei-university"
      ? "yonsei"
      : song.organizationId === "korea-university" ? "korea" : null;
    if (!side) continue;
    const next = makeSongItem({ id: song.id, side, group: backlogGroup, plan, songs, jobs, organizations });
    items.set(next.key, next);
  }

  return [...items.values()].sort(taskComparator).map((item, index) => {
    const ranked = { ...item, rank: index + 1 };
    return { ...ranked, prompt: ranked.kind === "lineage" ? lineagePrompt(ranked) : songPrompt(ranked) };
  });
}

export function prioritySummary(items) {
  return {
    total: items.length,
    remaining: items.filter(({ action }) => action !== "complete").length,
    missing: items.filter(({ action }) => action === "add_missing").length,
    finalReview: items.filter(({ action }) => ["final_review", "publish"].includes(action)).length,
    aiReady: items.filter(({ action }) => ["final_review", "editorial_review", "collect", "add_missing", "check_lineage"].includes(action)).length,
    complete: items.filter(({ action }) => action === "complete").length,
  };
}

export const priorityGroups = GROUPS.map(({ key, code, label }) => ({ key, code, label })).concat({
  key: "eventBacklogSongIds",
  code: "P5",
  label: "양교 추가곡",
});
