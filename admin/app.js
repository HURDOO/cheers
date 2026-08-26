const viewRoot = document.querySelector("#view-root");
const pageBreadcrumb = document.querySelector("#page-breadcrumb");
const syncState = document.querySelector("#sync-state");
const refreshButton = document.querySelector("#refresh-button");
const navigation = document.querySelector(".main-nav");
const organizationCount = document.querySelector("#nav-organization-count");
const songCount = document.querySelector("#nav-song-count");
const reelCount = document.querySelector("#nav-reel-count");
const drawerLayer = document.querySelector("#drawer-layer");
const drawerBackdrop = document.querySelector("#drawer-backdrop");
const drawerClose = document.querySelector("#drawer-close");
const drawerExpand = document.querySelector("#drawer-expand");
const drawerEyebrow = document.querySelector("#drawer-eyebrow");
const drawerTitle = document.querySelector("#drawer-title");
const drawerSubtitle = document.querySelector("#drawer-subtitle");
const drawerBody = document.querySelector("#drawer-body");
const entityForm = document.querySelector("#entity-form");
const deleteEntityButton = document.querySelector("#delete-entity-button");
const cancelEntityButton = document.querySelector("#cancel-entity-button");
const saveEntityButton = document.querySelector("#save-entity-button");
const confirmDialog = document.querySelector("#confirm-dialog");
const confirmTitle = document.querySelector("#confirm-title");
const confirmMessage = document.querySelector("#confirm-message");
const confirmPhraseWrap = document.querySelector("#confirm-phrase-wrap");
const confirmPhraseLabel = document.querySelector("#confirm-phrase-label");
const confirmPhraseInput = document.querySelector("#confirm-phrase-input");
const confirmActionButton = document.querySelector("#confirm-action");
const importDialog = document.querySelector("#import-dialog");
const importForm = document.querySelector("#import-form");
const importOrganization = document.querySelector("#import-organization");
const toastRegion = document.querySelector("#toast-region");

const VIEW_LABELS = {
  overview: "대시보드",
  organizations: "대학·구단",
  songs: "응원가",
  reels: "릴스 제작",
};
const TYPE_LABELS = { baseball: "프로야구", university: "대학교" };
const SCOPE_LABELS = {
  target: "조사 대상",
  deferred: "나중에 조사",
  discovered_pending: "AI 추가 발견",
  rejected: "제외",
};
const STAGE_LABELS = {
  listed: "시작 전",
  needs_work: "보완 필요",
  researching: "AI 작업 중",
  research_ready: "수집 완료",
  editing: "편집 중",
  review_ready: "검수 대기",
  approved: "승인",
  published: "공개",
};
const JOB_STATUS_LABELS = {
  none: "작업 없음",
  queued: "대기 중",
  running: "진행 중",
  completed: "최근 완료",
  stale: "무효화됨",
};
const REEL_STATUS_LABELS = {
  draft: "기획 중",
  needs_sources: "소스 필요",
  ready: "렌더 준비",
  rendered: "렌더 완료",
  approved: "업로드 승인",
};
const RENDER_STATUS_LABELS = {
  idle: "렌더 없음",
  queued: "대기 중",
  rendering: "렌더 중",
  completed: "영상 완성",
  failed: "실패",
};
const VIDEO_LABELS = ["공식·가사 영상", "대표 현장 직캠", "추가 영상 1", "추가 영상 2", "추가 영상 3"];
const ACTIVE_JOB_STATUSES = new Set(["queued", "running"]);

const icons = {
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" /></svg>',
  upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 16V7.8L8.4 10.4 7 9l5-5 5 5-1.4 1.4L13 7.8V16h-2Zm-5 4a2 2 0 0 1-2-2v-3h2v3h12v-3h2v3a2 2 0 0 1-2 2H6Z" /></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m20.7 19.3-4.1-4.1a7.5 7.5 0 1 0-1.4 1.4l4.1 4.1 1.4-1.4ZM5 11a6 6 0 1 1 12 0 6 6 0 0 1-12 0Z" /></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16.2V19h2.8l8.3-8.3-2.8-2.8L5 16.2Zm13.7-8.3a1 1 0 0 0 0-1.4l-1.2-1.2a1 1 0 0 0-1.4 0l-1.4 1.4 2.8 2.8 1.2-1.6Z" /></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 20a2 2 0 0 1-2-2V7H4V5h5V4h6v1h5v2h-1v11a2 2 0 0 1-2 2H7Zm10-13H7v11h10V7Zm-8 9V9h2v7H9Zm4 0V9h2v7h-2Z" /></svg>',
  building: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V8l8-5 8 5v13h-6v-6h-4v6H4Zm3-3h1v-5h8v5h1V9.7l-5-3.1-5 3.1V18Z" /></svg>',
  music: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 18.5A3.5 3.5 0 1 1 8 15.34V5l11-2v12.5a3.5 3.5 0 1 1-2-3.16V7.42l-7 1.27v9.81Z" /></svg>',
  video: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 2v3h3V5H5Zm5 0v3h4V5h-4Zm6 0v3h3V5h-3ZM5 10v9h14v-9H5Zm5 2.2 5 2.8-5 2.8v-5.6Z" /></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 16.2-4-4L4 13.6l5.5 5.5L20 8.6 18.6 7.2l-9.1 9Z" /></svg>',
  spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.5 5.2L19 9l-5.5 1.8L12 16l-1.5-5.2L5 9l5.5-1.8L12 2Zm7 12 .8 2.7 2.7.8-2.7.8L19 21l-.8-2.7-2.7-.8 2.7-.8L19 14Z" /></svg>',
};

let database = { organizations: [], songs: [], jobs: [], reels: [], reelTools: { ready: false } };
let currentView = validView(location.hash.slice(1)) ?? "overview";
let busy = false;
let drawerState = null;
let drawerOpener = null;
let reelPollInProgress = false;
const selectedSongIds = new Set();
const filters = {
  organizationSearch: "",
  organizationType: "all",
  songSearch: "",
  songOrganization: "all",
  songScope: "all",
  songStage: "all",
  songJobStatus: "all",
  reelSearch: "",
  reelStatus: "all",
  reelRenderStatus: "all",
};

function validView(value) {
  return Object.hasOwn(VIEW_LABELS, value) ? value : null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeSearch(value) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase("ko").replace(/\s+/gu, "");
}

function splitList(value) {
  return String(value ?? "").split(/[,\n]/u).map((item) => item.trim()).filter(Boolean);
}

function organizationById(id) {
  return database.organizations.find((organization) => organization.id === id) ?? null;
}

function songById(id) {
  return database.songs.find((song) => song.id === id) ?? null;
}

function reelById(id) {
  return database.reels.find((reel) => reel.id === id) ?? null;
}

function reelDuration(reel) {
  return reel.clips?.reduce((sum, clip) => sum + Math.max(0, clip.endSeconds - clip.startSeconds), 0) ?? 0;
}

function formatDuration(seconds) {
  const rounded = Math.round(Number(seconds) || 0);
  const minutes = Math.floor(rounded / 60);
  const rest = String(rounded % 60).padStart(2, "0");
  return minutes ? `${minutes}:${rest}` : `${rounded}초`;
}

function latestJobForSong(id) {
  return [...database.jobs].reverse().find((job) => job.songId === id) ?? null;
}

function formatDate(value) {
  if (!value) return "기본 정본";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function setBusy(nextBusy, label = "처리 중") {
  busy = nextBusy;
  syncState.classList.toggle("is-busy", nextBusy);
  syncState.classList.toggle("is-ready", !nextBusy && database.organizations.length > 0);
  syncState.lastChild.textContent = nextBusy ? label : "동기화됨";
  refreshButton.disabled = nextBusy;
  saveEntityButton.disabled = nextBusy;
  deleteEntityButton.disabled = nextBusy;
}

function toast(message, type = "success") {
  const element = document.createElement("div");
  element.className = `toast ${type === "error" ? "is-error" : ""}`;
  element.textContent = message;
  toastRegion.append(element);
  window.setTimeout(() => element.remove(), 4200);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = await response.json().catch(() => ({ error: "서버 응답을 읽을 수 없습니다." }));
  if (!response.ok) {
    const error = new Error(payload.error ?? `요청 실패 (${response.status})`);
    error.code = payload.code;
    error.details = payload.details;
    throw error;
  }
  return payload;
}

function showError(error) {
  const detail = Array.isArray(error?.details)
    ? error.details.filter((item) => typeof item === "string").join(" · ")
    : "";
  toast(`${error?.message ?? "요청을 완료하지 못했습니다."}${detail ? ` ${detail}` : ""}`, "error");
}

async function loadState({ render = true } = {}) {
  setBusy(true, "불러오는 중");
  try {
    database = await api("/api/state");
    const currentSongIds = new Set(database.songs.map(({ id }) => id));
    for (const id of selectedSongIds) if (!currentSongIds.has(id)) selectedSongIds.delete(id);
    if (filters.songOrganization !== "all"
      && !database.organizations.some(({ id }) => id === filters.songOrganization)) {
      filters.songOrganization = "all";
    }
    organizationCount.textContent = database.organizations.length;
    songCount.textContent = database.songs.length;
    reelCount.textContent = database.reels?.length ?? 0;
    populateImportOrganizations();
    if (render) renderCurrentView();
  } finally {
    setBusy(false);
  }
}

function setView(view, { updateHash = true } = {}) {
  if (!validView(view)) return;
  currentView = view;
  if (updateHash && location.hash !== `#${view}`) history.pushState(null, "", `#${view}`);
  renderCurrentView();
  viewRoot.focus({ preventScroll: true });
}

function renderCurrentView() {
  pageBreadcrumb.textContent = VIEW_LABELS[currentView];
  document.title = `${VIEW_LABELS[currentView]} · Cheers Console`;
  navigation.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === currentView);
  });
  if (currentView === "organizations") renderOrganizationsView();
  else if (currentView === "songs") renderSongsView();
  else if (currentView === "reels") renderReelsView();
  else renderOverview();
}

function pageHeader(title, description, actions = "") {
  return `
    <header class="page-header">
      <div class="page-heading"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ""}
    </header>`;
}

function renderOverview() {
  const published = database.songs.filter((song) => song.workflowStage === "published").length;
  const activeJobs = database.jobs.filter((job) => ACTIVE_JOB_STATUSES.has(job.status)).length;
  const edited = database.songs.filter((song) => song.persisted).length;
  const recentSongs = [...database.songs]
    .filter((song) => song.updatedAt)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt, "en"))
    .slice(0, 7);

  viewRoot.innerHTML = `
    ${pageHeader(
      "콘텐츠 데이터베이스",
      "대학·구단과 응원가 데이터를 한곳에서 관리해요.",
      `<button type="button" class="button button-secondary" data-create-organization>${icons.plus}구단 추가</button>
       <button type="button" class="button button-secondary" data-create-song>${icons.plus}응원가 추가</button>
       <button type="button" class="button button-primary" data-create-reel>${icons.plus}릴스 만들기</button>`,
    )}
    <section class="metric-grid" aria-label="데이터 현황">
      ${metricCard("대학·구단", database.organizations.length, "blue", icons.building)}
      ${metricCard("전체 응원가", database.songs.length, "green", icons.music)}
      ${metricCard("편집 레코드", edited, "purple", icons.check)}
      ${metricCard("진행 중 AI 작업", activeJobs, "orange", icons.spark)}
      ${metricCard("릴스 프로젝트", database.reels?.length ?? 0, "blue", icons.video)}
    </section>
    <section class="dashboard-grid">
      <article class="panel">
        <header class="panel-header"><div><h2>구단별 응원가</h2><p>구단을 선택하면 해당 응원가 목록으로 이동해요.</p></div><button type="button" class="button button-ghost" data-go-view="organizations">전체 관리</button></header>
        <div class="organization-overview-grid">
          ${database.organizations.map((organization) => organizationOverviewCard(organization)).join("") || emptySmall("등록된 구단이 없어요")}
        </div>
      </article>
      <article class="panel">
        <header class="panel-header"><div><h2>최근 변경</h2><p>오버레이로 저장된 최신 응원가예요.</p></div><span class="pill blue">공개 ${published}</span></header>
        <div class="activity-list">
          ${recentSongs.map((song) => recentActivity(song)).join("") || emptySmall("아직 변경된 응원가가 없어요")}
        </div>
      </article>
    </section>`;
}

function metricCard(label, value, color, icon) {
  return `<article class="metric-card"><span class="metric-icon ${color}">${icon}</span><div class="metric-copy"><span>${escapeHtml(label)}</span><strong>${Number(value).toLocaleString("ko-KR")}</strong></div></article>`;
}

function organizationOverviewCard(organization) {
  return `
    <button type="button" class="organization-card" data-view-songs-organization="${escapeHtml(organization.id)}">
      ${organizationAvatar(organization, "color-avatar")}
      <span class="organization-card-copy"><strong>${escapeHtml(organization.name)}</strong><small>${escapeHtml(TYPE_LABELS[organization.type])} · ${escapeHtml(organization.region)}</small></span>
      <span class="organization-card-count">${organization.songCount}곡</span>
    </button>`;
}

function recentActivity(song) {
  const organization = organizationById(song.organizationId);
  return `
    <button type="button" class="activity-item organization-card" data-edit-song="${escapeHtml(song.id)}">
      <span class="activity-icon">♪</span>
      <span class="activity-copy"><strong>${escapeHtml(song.title)}</strong><small>${escapeHtml(organization?.name ?? "알 수 없음")} · ${escapeHtml(STAGE_LABELS[song.workflowStage])}</small></span>
      <span class="activity-time">${escapeHtml(formatDate(song.updatedAt))}</span>
    </button>`;
}

function emptySmall(message) {
  return `<div class="empty-table"><span class="empty-table-icon">+</span><strong>${escapeHtml(message)}</strong></div>`;
}

function renderOrganizationsView() {
  viewRoot.innerHTML = `
    ${pageHeader(
      "대학·구단",
      "응원가가 소속되는 최상위 데이터를 추가하고 수정하거나 제거해요.",
      `<button type="button" class="button button-primary" data-create-organization>${icons.plus}새 대학·구단</button>`,
    )}
    <section class="data-card">
      <div class="table-toolbar">
        <div class="toolbar-group">
          <label class="search-control"><span class="sr-only">대학·구단 검색</span>${icons.search}<input id="organization-search" type="search" value="${escapeHtml(filters.organizationSearch)}" placeholder="이름, 약칭, 지역 검색" /></label>
          <select id="organization-type-filter" class="filter-select" aria-label="유형 필터">
            <option value="all">모든 유형</option>
            <option value="baseball" ${filters.organizationType === "baseball" ? "selected" : ""}>프로야구</option>
            <option value="university" ${filters.organizationType === "university" ? "selected" : ""}>대학교</option>
          </select>
        </div>
        <span id="organization-result-count" class="table-result"></span>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <colgroup><col style="width:31%"><col style="width:13%"><col style="width:13%"><col style="width:11%"><col style="width:13%"><col style="width:13%"><col style="width:6%"></colgroup>
          <thead><tr><th>이름</th><th>유형</th><th>지역</th><th>응원가</th><th>데이터</th><th>최근 수정</th><th><span class="sr-only">작업</span></th></tr></thead>
          <tbody id="organization-table-body">
            ${database.organizations.map((organization) => organizationRow(organization)).join("")}
            <tr id="organization-empty-row" hidden><td colspan="7"><div class="empty-table"><span class="empty-table-icon">C</span><strong>조건에 맞는 대학·구단이 없어요</strong><p>검색어나 유형 필터를 바꾸거나 새 데이터를 추가해 보세요.</p></div></td></tr>
          </tbody>
        </table>
      </div>
    </section>`;
  applyOrganizationFilters();
}

function organizationRow(organization) {
  return `
    <tr class="row-clickable" data-organization-row="${escapeHtml(organization.id)}" tabindex="0">
      <td><div class="entity-primary">${organizationAvatar(organization, "entity-avatar")}<div class="entity-primary-copy"><strong>${escapeHtml(organization.name)}</strong><small>${escapeHtml(organization.abbreviation)} · ${escapeHtml(organization.id)}</small></div></div></td>
      <td><span class="pill ${organization.type === "baseball" ? "blue" : "purple"}">${escapeHtml(TYPE_LABELS[organization.type])}</span></td>
      <td>${escapeHtml(organization.region)}</td>
      <td><strong>${organization.songCount}</strong>곡</td>
      <td><span class="pill ${organization.isPublished ? "green" : "orange"}">${organization.isPublished ? "공개 정본" : "신규"}</span></td>
      <td><div class="stage-cell"><span>${escapeHtml(formatDate(organization.updatedAt))}</span><small>rev ${organization.revision}</small></div></td>
      <td><div class="row-actions"><button type="button" class="table-action" data-edit-organization="${escapeHtml(organization.id)}" aria-label="${escapeHtml(organization.name)} 수정">${icons.edit}</button><button type="button" class="table-action is-danger" data-delete-organization="${escapeHtml(organization.id)}" aria-label="${escapeHtml(organization.name)} 삭제">${icons.trash}</button></div></td>
    </tr>`;
}

function organizationAvatar(organization, className) {
  const abbreviation = escapeHtml(organization.abbreviation.slice(0, 4));
  const primary = escapeHtml(organization.colors.primary);
  const secondary = escapeHtml(organization.colors.secondary);
  return `<span class="${className}" style="background:linear-gradient(135deg,${primary},${secondary})">${abbreviation}</span>`;
}

function applyOrganizationFilters() {
  const query = normalizeSearch(filters.organizationSearch);
  let visible = 0;
  document.querySelectorAll("[data-organization-row]").forEach((row) => {
    const organization = organizationById(row.dataset.organizationRow);
    const text = normalizeSearch(`${organization.name} ${organization.abbreviation} ${organization.region} ${organization.id}`);
    const matches = (!query || text.includes(query))
      && (filters.organizationType === "all" || organization.type === filters.organizationType);
    row.hidden = !matches;
    if (matches) visible += 1;
  });
  const result = document.querySelector("#organization-result-count");
  const empty = document.querySelector("#organization-empty-row");
  if (result) result.textContent = `${visible}개 표시`;
  if (empty) empty.hidden = visible !== 0;
}

function renderSongsView() {
  const organizationOptions = database.organizations.map((organization) => `<option value="${escapeHtml(organization.id)}" ${filters.songOrganization === organization.id ? "selected" : ""}>${escapeHtml(organization.name)}</option>`).join("");
  viewRoot.innerHTML = `
    ${pageHeader(
      "응원가",
      "작업 라벨을 자유롭게 바꾸고 AI 수집·작성 작업을 필요한 만큼 반복해요.",
      `<button type="button" class="button button-secondary" data-open-import>${icons.upload}목록 추가</button><button type="button" class="button button-primary" data-create-song>${icons.plus}새 응원가</button>`,
    )}
    <section class="data-card">
      <div class="table-toolbar">
        <div class="toolbar-group">
          <label class="search-control"><span class="sr-only">응원가 검색</span>${icons.search}<input id="song-search" type="search" value="${escapeHtml(filters.songSearch)}" placeholder="곡명이나 별칭 검색" /></label>
          <select id="song-organization-filter" class="filter-select" aria-label="대학·구단 필터"><option value="all">모든 대학·구단</option>${organizationOptions}</select>
          <select id="song-scope-filter" class="filter-select" aria-label="조사 범위 필터"><option value="all">모든 조사 범위</option>${selectOptions(SCOPE_LABELS, filters.songScope)}</select>
          <select id="song-stage-filter" class="filter-select" aria-label="작업 라벨 필터"><option value="all">모든 작업 라벨</option>${selectOptions(STAGE_LABELS, filters.songStage)}</select>
          <select id="song-job-filter" class="filter-select" aria-label="AI 작업 상태 필터"><option value="all">모든 AI 작업</option>${selectOptions(JOB_STATUS_LABELS, filters.songJobStatus)}</select>
        </div>
        <span id="song-result-count" class="table-result"></span>
      </div>
      <div id="song-bulk-bar" class="bulk-action-bar" hidden>
        <div class="bulk-selection-count"><strong id="song-selected-count">0곡 선택</strong><small>필터가 바뀌어도 선택은 유지돼요.</small></div>
        <div class="bulk-actions">
          <button type="button" class="button button-primary" data-bulk-request-enrichment>${icons.spark}AI 수집·작성</button>
          <select id="bulk-song-stage" class="filter-select" aria-label="선택한 응원가 작업 라벨 변경"><option value="">작업 라벨 변경…</option>${selectOptions(STAGE_LABELS, "")}</select>
          <select id="bulk-song-scope" class="filter-select" aria-label="선택한 응원가 조사 범위 변경"><option value="">조사 범위 변경…</option>${selectOptions(SCOPE_LABELS, "")}</select>
          <button type="button" class="button button-ghost" data-clear-song-selection>선택 해제</button>
        </div>
      </div>
      <div class="table-scroll">
        <table class="data-table song-data-table">
          <colgroup><col style="width:4%"><col style="width:22%"><col style="width:16%"><col style="width:11%"><col style="width:13%"><col style="width:10%"><col style="width:7%"><col style="width:11%"><col style="width:6%"></colgroup>
          <thead><tr><th><input id="song-select-visible" class="selection-checkbox" type="checkbox" aria-label="현재 표시된 응원가 모두 선택" /></th><th>응원가</th><th>대학·구단</th><th>조사 범위</th><th>작업 라벨</th><th>AI 작업</th><th>영상</th><th>최근 수정</th><th><span class="sr-only">작업</span></th></tr></thead>
          <tbody id="song-table-body">
            ${database.songs.map((song) => songRow(song)).join("")}
            <tr id="song-empty-row" hidden><td colspan="9"><div class="empty-table"><span class="empty-table-icon">♪</span><strong>조건에 맞는 응원가가 없어요</strong><p>필터를 바꾸거나 새 응원가를 추가해 보세요.</p></div></td></tr>
          </tbody>
        </table>
      </div>
    </section>`;
  applySongFilters();
}

function songRow(song) {
  const organization = organizationById(song.organizationId);
  const scopeColor = { target: "blue", deferred: "gray", discovered_pending: "purple", rejected: "red" }[song.scopeStatus];
  const latestJob = latestJobForSong(song.id);
  const jobStatus = latestJob?.status ?? "none";
  const jobColor = { queued: "orange", running: "blue", completed: "green", stale: "red", none: "gray" }[jobStatus];
  return `
    <tr class="row-clickable ${selectedSongIds.has(song.id) ? "is-selected" : ""}" data-song-row="${escapeHtml(song.id)}" tabindex="0">
      <td><input class="selection-checkbox" data-select-song="${escapeHtml(song.id)}" type="checkbox" aria-label="${escapeHtml(song.title)} 선택" ${selectedSongIds.has(song.id) ? "checked" : ""} /></td>
      <td><div class="entity-primary"><span class="entity-avatar song-avatar">♪</span><div class="entity-primary-copy"><strong>${escapeHtml(song.title)}</strong><small>${escapeHtml(song.aliases?.join(", ") || song.id)}</small></div></div></td>
      <td><div class="entity-primary">${organization ? organizationAvatar(organization, "entity-avatar") : ""}<div class="entity-primary-copy"><strong>${escapeHtml(organization?.name ?? "알 수 없음")}</strong><small>${escapeHtml(organization?.abbreviation ?? song.organizationId)}</small></div></div></td>
      <td><span class="pill ${scopeColor}">${escapeHtml(SCOPE_LABELS[song.scopeStatus])}</span></td>
      <td><select class="inline-stage-select" data-inline-song-stage="${escapeHtml(song.id)}" aria-label="${escapeHtml(song.title)} 작업 라벨">${selectOptions(STAGE_LABELS, song.workflowStage)}</select></td>
      <td><span class="pill ${jobColor}">${escapeHtml(JOB_STATUS_LABELS[jobStatus])}</span></td>
      <td><strong>${song.videos?.length ?? 0}</strong> / 5</td>
      <td><div class="stage-cell"><span>${escapeHtml(formatDate(song.updatedAt))}</span><small>rev ${song.revision}${song.isPublished ? " · 정본" : ""}</small></div></td>
      <td><div class="row-actions"><button type="button" class="table-action" data-edit-song="${escapeHtml(song.id)}" aria-label="${escapeHtml(song.title)} 수정">${icons.edit}</button><button type="button" class="table-action is-danger" data-delete-song="${escapeHtml(song.id)}" aria-label="${escapeHtml(song.title)} 삭제">${icons.trash}</button></div></td>
    </tr>`;
}

function selectOptions(labels, selected) {
  return Object.entries(labels).map(([value, label]) => `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
}

function applySongFilters() {
  const query = normalizeSearch(filters.songSearch);
  let visible = 0;
  document.querySelectorAll("[data-song-row]").forEach((row) => {
    const song = songById(row.dataset.songRow);
    const organization = organizationById(song.organizationId);
    const jobStatus = latestJobForSong(song.id)?.status ?? "none";
    const text = normalizeSearch(`${song.title} ${(song.aliases ?? []).join(" ")} ${organization?.name ?? ""} ${song.id}`);
    const matches = (!query || text.includes(query))
      && (filters.songOrganization === "all" || song.organizationId === filters.songOrganization)
      && (filters.songScope === "all" || song.scopeStatus === filters.songScope)
      && (filters.songStage === "all" || song.workflowStage === filters.songStage)
      && (filters.songJobStatus === "all" || jobStatus === filters.songJobStatus);
    row.hidden = !matches;
    if (matches) visible += 1;
  });
  const result = document.querySelector("#song-result-count");
  const empty = document.querySelector("#song-empty-row");
  if (result) result.textContent = `${visible}곡 표시`;
  if (empty) empty.hidden = visible !== 0;
  syncSongSelectionUI();
}

function syncSongSelectionUI() {
  const rows = [...document.querySelectorAll("[data-song-row]")];
  for (const row of rows) {
    const selected = selectedSongIds.has(row.dataset.songRow);
    row.classList.toggle("is-selected", selected);
    const checkbox = row.querySelector("[data-select-song]");
    if (checkbox) checkbox.checked = selected;
  }
  const visibleRows = rows.filter((row) => !row.hidden);
  const selectedVisible = visibleRows.filter((row) => selectedSongIds.has(row.dataset.songRow));
  const selectVisible = document.querySelector("#song-select-visible");
  if (selectVisible) {
    selectVisible.checked = visibleRows.length > 0 && selectedVisible.length === visibleRows.length;
    selectVisible.indeterminate = selectedVisible.length > 0 && selectedVisible.length < visibleRows.length;
  }
  const bar = document.querySelector("#song-bulk-bar");
  const count = document.querySelector("#song-selected-count");
  if (bar) bar.hidden = selectedSongIds.size === 0;
  if (count) count.textContent = `${selectedSongIds.size}곡 선택`;
}

function selectedSongItems() {
  return [...selectedSongIds].map((id) => songById(id)).filter(Boolean).map((song) => ({ id: song.id, expectedRevision: song.revision }));
}

async function bulkRequestEnrichment() {
  const items = selectedSongItems();
  if (items.length === 0 || busy) return;
  setBusy(true, "AI 작업 요청 중");
  try {
    const result = await api("/api/songs/bulk?action=request-enrichment", { method: "POST", body: { items } });
    await loadState();
    toast(`${result.created.length}곡을 AI 작업 목록에 올렸어요.${result.existing.length ? ` 이미 진행 중인 ${result.existing.length}곡은 유지했어요.` : ""}`);
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
}

async function bulkUpdateSongs(patch, label) {
  const items = selectedSongItems();
  if (items.length === 0 || busy) return;
  setBusy(true, "일괄 변경 중");
  try {
    await api("/api/songs/bulk", { method: "PUT", body: { items, patch } });
    await loadState();
    toast(`${items.length}곡을 '${label}'로 바꿨어요.`);
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
}

function renderReelsView() {
  const toolNotice = database.reelTools?.ready
    ? `<span class="pill green">렌더러 준비됨</span>`
    : `<span class="pill orange">ffmpeg · yt-dlp 설치 필요</span>`;
  viewRoot.innerHTML = `
    ${pageHeader(
      "릴스·쇼츠 제작",
      "영상 URL과 구간을 순서대로 놓고 출처·응원가 자막이 들어간 세로 영상을 만들어요.",
      `<button type="button" class="button button-primary" data-create-reel>${icons.plus}새 릴스</button>`,
    )}
    <section class="reel-workflow-strip" aria-label="릴스 제작 흐름">
      <div><span>1</span><strong>소스 입력</strong><small>URL · 시작/종료 구간</small></div>
      <div><span>2</span><strong>화면 문구</strong><small>출처 · 제목 · 가사</small></div>
      <div><span>3</span><strong>자동 합성</strong><small>1080 × 1920 MP4</small></div>
      ${toolNotice}
    </section>
    <section class="data-card">
      <div class="table-toolbar">
        <div class="toolbar-group">
          <label class="search-control"><span class="sr-only">릴스 검색</span>${icons.search}<input id="reel-search" type="search" value="${escapeHtml(filters.reelSearch)}" placeholder="제목이나 원곡 검색" /></label>
          <select id="reel-status-filter" class="filter-select" aria-label="릴스 작업 상태 필터"><option value="all">모든 작업 상태</option>${selectOptions(REEL_STATUS_LABELS, filters.reelStatus)}</select>
          <select id="reel-render-filter" class="filter-select" aria-label="렌더 상태 필터"><option value="all">모든 렌더 상태</option>${selectOptions(RENDER_STATUS_LABELS, filters.reelRenderStatus)}</select>
        </div>
        <span id="reel-result-count" class="table-result"></span>
      </div>
      <div class="table-scroll">
        <table class="data-table reel-data-table">
          <colgroup><col style="width:27%"><col style="width:18%"><col style="width:11%"><col style="width:14%"><col style="width:14%"><col style="width:11%"><col style="width:5%"></colgroup>
          <thead><tr><th>프로젝트</th><th>공유 원곡</th><th>구성</th><th>작업 상태</th><th>렌더</th><th>최근 수정</th><th><span class="sr-only">작업</span></th></tr></thead>
          <tbody>
            ${(database.reels ?? []).map((reel) => reelRow(reel)).join("")}
            <tr id="reel-empty-row" hidden><td colspan="7"><div class="empty-table"><span class="empty-table-icon">▶</span><strong>조건에 맞는 릴스가 없어요</strong><p>첫 프로젝트를 만들고 영상 소스를 이어 붙여 보세요.</p></div></td></tr>
          </tbody>
        </table>
      </div>
    </section>`;
  applyReelFilters();
}

function reelRow(reel) {
  const render = reel.render ?? { status: "idle", progress: 0 };
  const renderColor = { idle: "gray", queued: "orange", rendering: "blue", completed: "green", failed: "red" }[render.status] ?? "gray";
  const statusColor = { draft: "gray", needs_sources: "orange", ready: "blue", rendered: "green", approved: "purple" }[reel.status] ?? "gray";
  const renderLabel = render.status === "rendering"
    ? `${RENDER_STATUS_LABELS.rendering} ${Math.round(render.progress ?? 0)}%`
    : RENDER_STATUS_LABELS[render.status] ?? render.status;
  return `
    <tr class="row-clickable" data-reel-row="${escapeHtml(reel.id)}" tabindex="0">
      <td><div class="entity-primary"><span class="entity-avatar reel-avatar">9:16</span><div class="entity-primary-copy"><strong>${escapeHtml(reel.title)}</strong><small>${escapeHtml(reel.hookText || reel.id)}</small></div></div></td>
      <td><strong>${escapeHtml(reel.originalSongTitle || "미정")}</strong></td>
      <td><div class="stage-cell"><span>${reel.clips.length}개 클립</span><small>${escapeHtml(formatDuration(reelDuration(reel)))}</small></div></td>
      <td><span class="pill ${statusColor}">${escapeHtml(REEL_STATUS_LABELS[reel.status])}</span></td>
      <td><div class="render-state-cell"><span class="pill ${renderColor}">${escapeHtml(renderLabel)}</span>${render.phase && render.status === "rendering" ? `<small>${escapeHtml(render.phase)}</small>` : ""}</div></td>
      <td><div class="stage-cell"><span>${escapeHtml(formatDate(reel.updatedAt))}</span><small>rev ${reel.revision}</small></div></td>
      <td><div class="row-actions"><button type="button" class="table-action" data-edit-reel="${escapeHtml(reel.id)}" aria-label="${escapeHtml(reel.title)} 수정">${icons.edit}</button><button type="button" class="table-action is-danger" data-delete-reel="${escapeHtml(reel.id)}" aria-label="${escapeHtml(reel.title)} 삭제">${icons.trash}</button></div></td>
    </tr>`;
}

function applyReelFilters() {
  const query = normalizeSearch(filters.reelSearch);
  let visible = 0;
  document.querySelectorAll("[data-reel-row]").forEach((row) => {
    const reel = reelById(row.dataset.reelRow);
    const renderStatus = reel.render?.status ?? "idle";
    const text = normalizeSearch(`${reel.title} ${reel.originalSongTitle} ${reel.hookText} ${reel.id}`);
    const matches = (!query || text.includes(query))
      && (filters.reelStatus === "all" || reel.status === filters.reelStatus)
      && (filters.reelRenderStatus === "all" || renderStatus === filters.reelRenderStatus);
    row.hidden = !matches;
    if (matches) visible += 1;
  });
  const result = document.querySelector("#reel-result-count");
  const empty = document.querySelector("#reel-empty-row");
  if (result) result.textContent = `${visible}개 표시`;
  if (empty) empty.hidden = visible !== 0;
}

function openOrganizationDrawer(id = null) {
  const organization = id ? organizationById(id) : null;
  drawerOpener = document.activeElement;
  drawerState = { type: "organization", mode: organization ? "edit" : "create", id, dirty: false, revision: organization?.revision ?? null };
  drawerEyebrow.textContent = organization ? "ORGANIZATION ROW" : "NEW ORGANIZATION";
  drawerTitle.textContent = organization ? organization.name : "대학·구단 추가";
  drawerSubtitle.textContent = organization ? `${organization.id} · revision ${organization.revision}` : "새 최상위 데이터를 만들어요";
  deleteEntityButton.hidden = !organization;
  drawerBody.innerHTML = organizationForm(organization);
  showDrawer();
  updateOrganizationPreview();
}

function organizationForm(organization) {
  const value = organization ?? {
    id: "",
    name: "",
    abbreviation: "",
    type: "baseball",
    region: "",
    colors: { primary: "#3182F6", secondary: "#1B64DA" },
  };
  return `
    <section class="form-section">
      <div id="organization-color-preview" class="entity-color-preview" style="--preview-primary:${escapeHtml(value.colors.primary)};--preview-secondary:${escapeHtml(value.colors.secondary)}">
        <span id="organization-preview-monogram" class="preview-monogram">${escapeHtml(value.abbreviation || "NEW")}</span>
        <div><strong id="organization-preview-name">${escapeHtml(value.name || "새 대학·구단")}</strong><small id="organization-preview-meta">${escapeHtml(TYPE_LABELS[value.type])}${value.region ? ` · ${escapeHtml(value.region)}` : ""}</small></div>
      </div>
      <div class="form-grid">
        <label class="field field-wide"><span>데이터 ID <small>영문 소문자·숫자·하이픈</small></span><input name="id" value="${escapeHtml(value.id)}" ${organization ? "readonly" : 'placeholder="비워두면 이름으로 자동 생성" pattern="[a-z0-9]+(?:-[a-z0-9]+)*"'} /></label>
        <label class="field field-wide"><span>이름</span><input name="name" value="${escapeHtml(value.name)}" required maxlength="200" placeholder="예: 삼성 라이온즈" /></label>
        <label class="field"><span>약칭</span><input name="abbreviation" value="${escapeHtml(value.abbreviation)}" required maxlength="30" placeholder="예: SAM" /></label>
        <label class="field"><span>유형</span><select name="type"><option value="baseball" ${value.type === "baseball" ? "selected" : ""}>프로야구</option><option value="university" ${value.type === "university" ? "selected" : ""}>대학교</option></select></label>
        <label class="field field-wide"><span>지역</span><input name="region" value="${escapeHtml(value.region)}" required maxlength="100" placeholder="예: 대구" /></label>
      </div>
    </section>
    <section class="form-section">
      <header class="form-section-header"><div><h3>브랜드 색상</h3><p>목록과 공개 사이트에서 구단을 구분하는 색이에요.</p></div></header>
      <div class="form-grid">
        ${colorField("대표 색상", "primaryColor", value.colors.primary)}
        ${colorField("보조 색상", "secondaryColor", value.colors.secondary)}
      </div>
    </section>
    ${organization ? `<section class="form-section"><header class="form-section-header"><div><h3>연결 현황</h3><p>이 대학·구단에는 응원가 ${organization.songCount}곡이 연결되어 있어요.</p></div></header><button type="button" class="button button-secondary" data-view-linked-songs="${escapeHtml(organization.id)}">연결된 응원가 보기</button></section>` : ""}`;
}

function colorField(label, name, value) {
  return `<label class="field"><span>${escapeHtml(label)}</span><span class="color-field"><input type="color" data-color-picker="${escapeHtml(name)}" value="${escapeHtml(value)}" aria-label="${escapeHtml(label)} 선택" /><input name="${escapeHtml(name)}" value="${escapeHtml(value)}" required pattern="#[0-9A-Fa-f]{6}" maxlength="7" /></span></label>`;
}

function updateOrganizationPreview() {
  if (drawerState?.type !== "organization") return;
  const formData = new FormData(entityForm);
  const primary = String(formData.get("primaryColor") || "#3182F6");
  const secondary = String(formData.get("secondaryColor") || "#1B64DA");
  const preview = document.querySelector("#organization-color-preview");
  if (!preview) return;
  preview.style.setProperty("--preview-primary", primary);
  preview.style.setProperty("--preview-secondary", secondary);
  document.querySelector("#organization-preview-monogram").textContent = String(formData.get("abbreviation") || "NEW").slice(0, 4);
  document.querySelector("#organization-preview-name").textContent = String(formData.get("name") || "새 대학·구단");
  const type = TYPE_LABELS[String(formData.get("type"))] ?? "유형";
  const region = String(formData.get("region") || "");
  document.querySelector("#organization-preview-meta").textContent = `${type}${region ? ` · ${region}` : ""}`;
}

function openSongDrawer(id = null, defaultOrganizationId = null) {
  const song = id ? songById(id) : null;
  const organizationId = song?.organizationId ?? defaultOrganizationId ?? (filters.songOrganization !== "all" ? filters.songOrganization : database.organizations[0]?.id);
  drawerOpener = document.activeElement;
  drawerState = { type: "song", mode: song ? "edit" : "create", id, dirty: false, revision: song?.revision ?? null };
  drawerEyebrow.textContent = song ? "CHEER SONG ROW" : "NEW CHEER SONG";
  drawerTitle.textContent = song ? song.title : "응원가 추가";
  drawerSubtitle.textContent = song ? `${song.id} · revision ${song.revision}` : "새 응원가 행을 만들어요";
  deleteEntityButton.hidden = !song;
  drawerBody.innerHTML = songForm(song, organizationId);
  showDrawer();
}

function songForm(song, organizationId) {
  const value = song ?? {
    id: "",
    organizationId,
    discoveredBy: "user",
    scopeStatus: "target",
    workflowStage: "listed",
    title: "",
    aliases: [],
    symbolicLines: ["", ""],
    descriptionText: "",
    lyrics: { lines: [] },
    quickFacts: [{ label: "사용 시작", value: "" }, { label: "", value: "" }, { label: "", value: "" }],
    videos: [],
    relationships: [],
    researchText: "",
  };
  const relationship = (type) => value.relationships?.filter((item) => item.type === type).map(({ targetId }) => targetId) ?? [];
  const latestJob = latestJobForSong(value.id);
  return `
    <section class="form-section">
      <header class="form-section-header"><div><h3>기본 정보</h3><p>응원가를 식별하고 어느 구단에 속하는지 정해요.</p></div></header>
      <div class="form-grid">
        <label class="field field-wide"><span>데이터 ID <small>생성 후 변경할 수 없음</small></span><input name="id" value="${escapeHtml(value.id)}" ${song ? "readonly" : 'placeholder="비워두면 자동 생성" pattern="[a-z0-9]+(?:-[a-z0-9]+)*"'} /></label>
        <label class="field field-wide"><span>곡 제목</span><input name="title" value="${escapeHtml(value.title)}" required maxlength="200" /></label>
        <label class="field field-wide"><span>대학·구단</span><select name="organizationId" required>${database.organizations.map((organization) => `<option value="${escapeHtml(organization.id)}" ${value.organizationId === organization.id ? "selected" : ""}>${escapeHtml(organization.name)}</option>`).join("")}</select></label>
        <label class="field field-wide"><span>별칭 <small>쉼표 또는 줄바꿈으로 구분</small></span><input name="aliases" value="${escapeHtml(value.aliases?.join(", ") ?? "")}" /></label>
        <label class="field"><span>대표 문구 1</span><input name="symbolicLine1" value="${escapeHtml(value.symbolicLines?.[0] ?? "")}" maxlength="200" /></label>
        <label class="field"><span>대표 문구 2</span><input name="symbolicLine2" value="${escapeHtml(value.symbolicLines?.[1] ?? "")}" maxlength="200" /></label>
      </div>
    </section>
    <section class="form-section">
      <header class="form-section-header"><div><h3>관리 상태</h3><p>조사 범위와 작업 라벨은 독립적이며 언제든 자유롭게 바꿀 수 있어요.</p></div></header>
      <div class="form-grid three">
        <label class="field"><span>발견 주체</span><select name="discoveredBy"><option value="user" ${value.discoveredBy === "user" ? "selected" : ""}>사용자 목록</option><option value="ai" ${value.discoveredBy === "ai" ? "selected" : ""}>AI 추가 발견</option></select></label>
        <label class="field"><span>조사 범위</span><select name="scopeStatus">${selectOptions(SCOPE_LABELS, value.scopeStatus)}</select></label>
        <label class="field"><span>작업 라벨</span><select name="workflowStage">${selectOptions(STAGE_LABELS, value.workflowStage)}</select></label>
      </div>
    </section>
    <section class="form-section">
      <header class="form-section-header"><div><h3>원곡·응원가 관계</h3><p>ID 기준으로 원곡 계보를 연결해요. 비워둘 수 있어요.</p></div></header>
      <div class="form-grid">
        <label class="field field-wide"><span>대표 원곡 ID</span><input name="originalSongId" value="${escapeHtml(relationship("original-song")[0] ?? "")}" placeholder="original-song-id" /></label>
        <label class="field"><span>보조 원곡 ID <small>쉼표로 구분</small></span><input name="secondaryOriginalSongIds" value="${escapeHtml(relationship("secondary-original-song").join(", "))}" /></label>
        <label class="field"><span>원본 응원가 ID</span><input name="sourceCheerSongId" value="${escapeHtml(relationship("source-cheer-song")[0] ?? "")}" /></label>
      </div>
    </section>
    <section class="form-section">
      <header class="form-section-header"><div><h3>소개·사용 맥락·TMI</h3><p>출처 없이 작성할 수 있고, 필요할 때만 <code>[* 주석]</code>을 넣어요.</p></div><button type="button" class="button button-ghost" data-insert-note>[* 주석] 넣기</button></header>
      <label class="field"><span>공개 본문</span><textarea id="description-input" name="descriptionText" rows="14" maxlength="60000" placeholder="AI 초안을 검수하고 자유롭게 고치는 공간">${escapeHtml(value.descriptionText)}</textarea><p class="field-help">예: 흥미로운 이야기.[* 원문 출처: https://example.com]</p></label>
    </section>
    ${song ? researchSection(value, latestJob) : ""}
    <section class="form-section">
      <header class="form-section-header"><div><h3>가사</h3><p>한 줄씩 입력해요. 공개 화면에서는 처음 두 줄만 먼저 보여요.</p></div></header>
      <label class="field"><span>전체 가사</span><textarea name="lyrics" rows="9">${escapeHtml(value.lyrics?.lines?.join("\n") ?? "")}</textarea></label>
    </section>
    <section class="form-section">
      <header class="form-section-header"><div><h3>간단 정보</h3><p>세 항목까지 표시해요. 첫 라벨은 사용 시작으로 고정돼요.</p></div></header>
      <div class="fact-editor-grid">${Array.from({ length: 3 }, (_, index) => factRow(value.quickFacts?.[index], index)).join("")}</div>
    </section>
    <section class="form-section">
      <header class="form-section-header"><div><h3>영상</h3><p>사용자가 고른 순서대로 다섯 슬롯을 관리해요.</p></div></header>
      <div class="video-editor-list">${Array.from({ length: 5 }, (_, index) => videoSlot(value.videos?.find((video) => video.rank === index + 1), index)).join("")}</div>
    </section>`;
}

function researchSection(song, latestJob) {
  const activeJob = latestJob && ACTIVE_JOB_STATUSES.has(latestJob.status) ? latestJob : null;
  const statusText = activeJob?.status === "running" ? "작성 중" : activeJob?.status === "queued" ? "대기 중" : "AI 수집·작성 요청";
  return `
    <section class="form-section">
      <header class="form-section-header"><div><h3>AI 수집·작성</h3><p>AI가 현재 공개 본문을 읽고 조사·작성·자체 검토를 반복해 직접 보강해요.</p></div><button type="button" class="button button-secondary" data-request-enrichment ${activeJob ? "disabled" : ""}>${icons.spark}${statusText}</button></header>
      <p class="field-help">한 번에 흥미로운 소재 약 10개를 목표로 작성해요. 결과가 부족하면 같은 곡을 다시 작업 목록에 올릴 수 있고, 완료되면 작업 라벨이 ‘수집 완료’로 바뀌어요.</p>
      ${song.researchText?.trim() ? `<div class="research-card"><div class="research-card-header"><strong>최근 AI 작업 기록</strong><span class="pill purple">검수 참고</span></div><pre>${escapeHtml(song.researchText)}</pre></div>` : `<p class="field-help">아직 완료된 AI 작업 기록이 없어요.</p>`}
    </section>`;
}

function factRow(fact = {}, index) {
  return `<div class="fact-editor-row" data-fact-row="${index}"><label class="field"><span>${index + 1}번 라벨</span><input data-fact-label value="${escapeHtml(index === 0 ? "사용 시작" : fact.label ?? "")}" ${index === 0 ? "readonly" : ""} maxlength="40" /></label><label class="field"><span>${index + 1}번 값</span><input data-fact-value value="${escapeHtml(fact.value ?? "")}" maxlength="120" /></label></div>`;
}

function videoSlot(video = {}, index) {
  const rank = index + 1;
  return `
    <details class="video-editor-slot" data-video-slot="${rank}" ${rank <= 2 ? "open" : ""}>
      <summary><span class="video-slot-title"><span class="video-rank">${rank}</span>${escapeHtml(VIDEO_LABELS[index])}</span><span class="video-slot-status">${video.videoId ? "영상 입력됨" : "비어 있음"}</span></summary>
      <div class="video-slot-fields">
        <label class="field field-wide"><span>YouTube URL</span><input data-video-field="sourceUrl" value="${escapeHtml(video.sourceUrl ?? "")}" placeholder="https://www.youtube.com/watch?v=..." /></label>
        <label class="field"><span>영상 제목</span><input data-video-field="title" value="${escapeHtml(video.title ?? "")}" /></label>
        <label class="field"><span>채널명</span><input data-video-field="channelName" value="${escapeHtml(video.channelName ?? "")}" /></label>
        <label class="field field-wide"><span>공개 출처 문구 <small>선택</small></span><input data-video-field="attributionText" value="${escapeHtml(video.attributionText ?? "")}" /></label>
      </div>
    </details>`;
}

function openReelDrawer(id = null) {
  const reel = id ? reelById(id) : null;
  drawerOpener = document.activeElement;
  drawerState = { type: "reel", mode: reel ? "edit" : "create", id, dirty: false, revision: reel?.revision ?? null };
  drawerEyebrow.textContent = reel ? "VERTICAL VIDEO PROJECT" : "NEW VERTICAL VIDEO";
  drawerTitle.textContent = reel ? reel.title : "릴스·쇼츠 만들기";
  drawerSubtitle.textContent = reel ? `${reel.id} · revision ${reel.revision}` : "영상 소스를 순서대로 이어 붙여요";
  deleteEntityButton.hidden = !reel;
  drawerBody.innerHTML = reelForm(reel);
  showDrawer();
  updateReelPreview();
}

function reelForm(reel) {
  const value = reel ?? {
    id: "",
    title: "",
    originalSongTitle: "",
    hookText: "같은 원곡, 전혀 다른 응원가",
    endCardText: "전체 응원가는 프로필 링크에서",
    postCaption: "",
    status: "draft",
    clips: [],
    render: { status: "idle", progress: 0, phase: "대기" },
  };
  const render = value.render ?? { status: "idle", progress: 0, phase: "대기" };
  const activeRender = ["queued", "rendering"].includes(render.status);
  const canRender = Boolean(reel && value.clips.length && database.reelTools?.ready && !activeRender);
  return `
    <section class="form-section reel-studio-section">
      <div class="reel-preview-shell" aria-label="세로 영상 자막 미리보기">
        <div class="reel-preview-screen">
          <div id="reel-preview-source" class="reel-preview-source">출처 · 영상마다 표시</div>
          <div id="reel-preview-hook" class="reel-preview-hook">${escapeHtml(value.hookText || "첫 문장")}</div>
          <div class="reel-preview-play">▶</div>
          <div id="reel-preview-headline" class="reel-preview-headline">${escapeHtml(value.clips[0]?.headline || value.originalSongTitle || "응원가 제목")}</div>
          <div id="reel-preview-lyrics" class="reel-preview-lyrics">${escapeHtml(value.clips[0]?.lyricsLines?.[0] || "가사 자막")}</div>
          <div id="reel-preview-end" class="reel-preview-end">${escapeHtml(value.endCardText || "프로필 링크에서 더 보기")}</div>
        </div>
        <p>실제 렌더에서는 영상 위에 같은 위치로 출처와 가사가 들어가요.</p>
      </div>
      <div class="reel-project-fields">
        <header class="form-section-header"><div><h3>프로젝트</h3><p>인스타 릴스와 유튜브 쇼츠에 함께 쓰는 9:16 영상이에요.</p></div></header>
        <div class="form-grid">
          <label class="field field-wide"><span>프로젝트 ID <small>생성 후 변경할 수 없음</small></span><input name="id" value="${escapeHtml(value.id)}" ${reel ? "readonly" : 'placeholder="비워두면 제목으로 자동 생성" pattern="[a-z0-9]+(?:-[a-z0-9]+)*"'} /></label>
          <label class="field field-wide"><span>제작 제목</span><input name="title" value="${escapeHtml(value.title)}" required maxlength="200" placeholder="예: 같은 원곡을 쓰는 고려대·한화 응원가" /></label>
          <label class="field"><span>공유 원곡</span><input name="originalSongTitle" value="${escapeHtml(value.originalSongTitle)}" maxlength="200" placeholder="예: 질풍가도" /></label>
          <label class="field"><span>작업 상태</span><select name="status">${selectOptions(REEL_STATUS_LABELS, value.status)}</select></label>
          <label class="field field-wide"><span>첫 화면 훅</span><input name="hookText" value="${escapeHtml(value.hookText)}" maxlength="240" placeholder="같은 노래인데 응원법은 이렇게 다릅니다" /></label>
          <label class="field field-wide"><span>마지막 안내</span><input name="endCardText" value="${escapeHtml(value.endCardText)}" maxlength="240" /></label>
          <label class="field field-wide"><span>게시물 본문 <small>선택</small></span><textarea name="postCaption" rows="5" maxlength="10000" placeholder="업로드할 때 복사할 소개와 사이트 유도 문구">${escapeHtml(value.postCaption)}</textarea></label>
        </div>
      </div>
    </section>
    <section class="form-section">
      <header class="form-section-header"><div><h3>영상 클립</h3><p>위에서 아래 순서로 이어져요. 구간은 원본 영상 기준 초 단위예요.</p></div><button type="button" class="button button-secondary" data-add-reel-clip>${icons.plus}클립 추가</button></header>
      <div id="reel-clip-list" class="reel-clip-list">${value.clips.map((clip, index) => reelClipEditor(clip, index)).join("") || `<div class="reel-empty-clips"><strong>아직 클립이 없어요</strong><p>URL과 사용할 구간을 입력해 첫 장면을 추가하세요.</p></div>`}</div>
      <div class="reel-duration-summary"><span>예상 길이</span><strong id="reel-total-duration">${escapeHtml(formatDuration(reelDuration(value)))}</strong><small>쇼츠는 60초 안쪽을 권장해요.</small></div>
    </section>
    ${reel ? `<section class="form-section">
      <header class="form-section-header"><div><h3>자동 렌더</h3><p>URL 영상을 내려받고 클립을 자른 뒤 출처·가사 자막을 합성해요.</p></div><button type="button" class="button button-primary" data-render-reel ${canRender ? "" : "disabled"}>${activeRender ? "렌더 중…" : "세로 영상 만들기"}</button></header>
      ${!database.reelTools?.ready ? `<div class="tool-warning"><strong>렌더러 준비가 필요해요</strong><p>이 Mac에 ffmpeg와 yt-dlp를 설치하면 버튼이 활성화됩니다. 기획과 저장은 지금도 할 수 있어요.</p></div>` : ""}
      ${render.status !== "idle" ? reelRenderCard(value) : `<p class="field-help">저장된 클립이 있으면 1080×1920 MP4로 만들 수 있어요.</p>`}
    </section>` : `<section class="form-section"><p class="field-help">프로젝트를 먼저 저장하면 자동 렌더 버튼이 열려요.</p></section>`}`;
}

function reelClipEditor(clip = {}, index = 0) {
  const id = clip.id || `clip-${Date.now().toString(36)}-${index + 1}`;
  const songOptions = database.songs.map((song) => {
    const organization = organizationById(song.organizationId);
    return `<option value="${escapeHtml(song.id)}" ${clip.songId === song.id ? "selected" : ""}>${escapeHtml(organization?.name ?? "")}: ${escapeHtml(song.title)}</option>`;
  }).join("");
  const duration = Math.max(0, Number(clip.endSeconds ?? 8) - Number(clip.startSeconds ?? 0));
  return `
    <details class="reel-clip-card" data-reel-clip="${escapeHtml(id)}" open>
      <summary>
        <span class="video-slot-title"><span class="video-rank">${index + 1}</span><strong data-clip-summary>${escapeHtml(clip.headline || `클립 ${index + 1}`)}</strong></span>
        <span class="reel-clip-summary-meta"><span data-clip-duration>${escapeHtml(formatDuration(duration))}</span><button type="button" class="clip-icon-button" data-move-clip="up" aria-label="클립 위로">↑</button><button type="button" class="clip-icon-button" data-move-clip="down" aria-label="클립 아래로">↓</button><button type="button" class="clip-icon-button is-danger" data-remove-reel-clip aria-label="클립 제거">×</button></span>
      </summary>
      <div class="reel-clip-fields">
        <label class="field field-wide"><span>영상 URL</span><input data-reel-clip-field="sourceUrl" type="url" value="${escapeHtml(clip.sourceUrl ?? "")}" required placeholder="https://www.youtube.com/watch?v=..." /></label>
        <label class="field"><span>시작 초</span><input data-reel-clip-field="startSeconds" type="number" min="0" max="86400" step="0.1" value="${escapeHtml(clip.startSeconds ?? 0)}" required /></label>
        <label class="field"><span>종료 초</span><input data-reel-clip-field="endSeconds" type="number" min="0.1" max="86400" step="0.1" value="${escapeHtml(clip.endSeconds ?? 8)}" required /></label>
        <label class="field field-wide"><span>연결 응원가 <small>선택</small></span><select data-reel-clip-field="songId"><option value="">연결하지 않음</option>${songOptions}</select></label>
        <label class="field field-wide"><span>장면 제목</span><input data-reel-clip-field="headline" value="${escapeHtml(clip.headline ?? "")}" maxlength="160" placeholder="예: 고려대학교 — 민족의 아리아" /></label>
        <label class="field field-wide"><span>화면 출처 <small>클립 재생 내내 표시</small></span><input data-reel-clip-field="attributionText" value="${escapeHtml(clip.attributionText ?? "")}" required maxlength="240" placeholder="YouTube @채널명 · 영상 제목" /></label>
        <label class="field field-wide"><span>응원가 자막 <small>한 줄씩, 구간 안에 균등 배치</small></span><textarea data-reel-clip-field="lyricsLines" rows="4" maxlength="4000" placeholder="첫 번째 가사\n두 번째 가사">${escapeHtml(clip.lyricsLines?.join("\n") ?? "")}</textarea></label>
        <label class="field"><span>세로 화면 중심</span><select data-reel-clip-field="crop"><option value="left" ${clip.crop === "left" ? "selected" : ""}>왼쪽</option><option value="center" ${!clip.crop || clip.crop === "center" ? "selected" : ""}>가운데</option><option value="right" ${clip.crop === "right" ? "selected" : ""}>오른쪽</option></select></label>
      </div>
    </details>`;
}

function reelRenderCard(reel) {
  const render = reel.render;
  const label = RENDER_STATUS_LABELS[render.status] ?? render.status;
  return `<div class="reel-render-card ${render.status === "failed" ? "is-failed" : ""}">
    <div><strong>${escapeHtml(label)}</strong><span>${Math.round(render.progress ?? 0)}%</span></div>
    <div class="render-progress"><span style="width:${Math.max(0, Math.min(100, render.progress ?? 0))}%"></span></div>
    <p>${escapeHtml(render.error || render.phase || "대기")}</p>
    ${render.outputReady ? `<video controls playsinline preload="metadata" src="/api/reels/${encodeURIComponent(reel.id)}/output"></video><a class="button button-secondary" href="/api/reels/${encodeURIComponent(reel.id)}/output" download="${escapeHtml(reel.id)}.mp4">MP4 내려받기</a>` : ""}
  </div>`;
}

function updateReelPreview() {
  if (drawerState?.type !== "reel") return;
  const formData = new FormData(entityForm);
  const firstClip = drawerBody.querySelector("[data-reel-clip]");
  const clipValue = (name) => firstClip?.querySelector(`[data-reel-clip-field="${name}"]`)?.value.trim() ?? "";
  const firstLyric = clipValue("lyricsLines").split("\n").map((line) => line.trim()).find(Boolean);
  const setText = (id, value) => {
    const element = document.querySelector(id);
    if (element) element.textContent = value;
  };
  setText("#reel-preview-hook", String(formData.get("hookText") || "첫 문장"));
  setText("#reel-preview-headline", clipValue("headline") || String(formData.get("originalSongTitle") || "응원가 제목"));
  setText("#reel-preview-source", `출처 · ${clipValue("attributionText") || "영상마다 표시"}`);
  setText("#reel-preview-lyrics", firstLyric || "가사 자막");
  setText("#reel-preview-end", String(formData.get("endCardText") || "프로필 링크에서 더 보기"));
  let total = 0;
  drawerBody.querySelectorAll("[data-reel-clip]").forEach((card, index) => {
    const start = Number.parseFloat(card.querySelector('[data-reel-clip-field="startSeconds"]').value) || 0;
    const end = Number.parseFloat(card.querySelector('[data-reel-clip-field="endSeconds"]').value) || 0;
    const duration = Math.max(0, end - start);
    total += duration;
    card.querySelector(".video-rank").textContent = index + 1;
    card.querySelector("[data-clip-duration]").textContent = formatDuration(duration);
    const headline = card.querySelector('[data-reel-clip-field="headline"]').value.trim();
    card.querySelector("[data-clip-summary]").textContent = headline || `클립 ${index + 1}`;
  });
  setText("#reel-total-duration", formatDuration(total));
}

function showDrawer() {
  setDrawerExpanded(false);
  drawerLayer.hidden = false;
  document.body.style.overflow = "hidden";
  window.setTimeout(() => drawerBody.querySelector("input:not([readonly]), select, textarea")?.focus(), 30);
}

async function attemptCloseDrawer() {
  if (!drawerState) return;
  if (drawerState.dirty) {
    const confirmed = await askConfirm({
      title: "변경사항을 버릴까요?",
      message: "저장하지 않은 입력 내용은 복구할 수 없어요.",
      confirmLabel: "변경 버리기",
      danger: false,
    });
    if (!confirmed) return;
  }
  closeDrawer();
}

function closeDrawer() {
  setDrawerExpanded(false);
  drawerLayer.hidden = true;
  document.body.style.overflow = "";
  drawerBody.innerHTML = "";
  drawerState = null;
  drawerOpener?.focus?.();
  drawerOpener = null;
}

function setDrawerExpanded(expanded) {
  drawerLayer.classList.toggle("is-expanded", expanded);
  drawerExpand.setAttribute("aria-pressed", String(expanded));
  drawerExpand.setAttribute("aria-label", expanded ? "편집 화면 작게 보기" : "편집 화면 크게 보기");
  drawerExpand.title = expanded ? "작게 보기" : "크게 보기";
}

function captureOrganization() {
  const formData = new FormData(entityForm);
  return {
    id: String(formData.get("id") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    abbreviation: String(formData.get("abbreviation") ?? "").trim(),
    type: String(formData.get("type") ?? ""),
    region: String(formData.get("region") ?? "").trim(),
    colors: {
      primary: String(formData.get("primaryColor") ?? "").trim(),
      secondary: String(formData.get("secondaryColor") ?? "").trim(),
    },
  };
}

function captureSong() {
  const formData = new FormData(entityForm);
  const quickFacts = [...drawerBody.querySelectorAll("[data-fact-row]")].map((row) => ({
    label: row.querySelector("[data-fact-label]").value.trim(),
    value: row.querySelector("[data-fact-value]").value.trim(),
  }));
  const videos = [...drawerBody.querySelectorAll("[data-video-slot]")].map((slot) => {
    const field = (name) => slot.querySelector(`[data-video-field="${name}"]`).value.trim();
    return {
      rank: Number(slot.dataset.videoSlot),
      sourceUrl: field("sourceUrl"),
      title: field("title"),
      channelName: field("channelName"),
      attributionText: field("attributionText"),
    };
  }).filter((video) => video.sourceUrl);
  const relationships = [];
  const originalSongId = String(formData.get("originalSongId") ?? "").trim();
  const secondaryOriginalSongIds = splitList(formData.get("secondaryOriginalSongIds"));
  const sourceCheerSongId = String(formData.get("sourceCheerSongId") ?? "").trim();
  if (originalSongId) relationships.push({ type: "original-song", targetId: originalSongId });
  for (const targetId of secondaryOriginalSongIds) relationships.push({ type: "secondary-original-song", targetId });
  if (sourceCheerSongId) relationships.push({ type: "source-cheer-song", targetId: sourceCheerSongId });
  return {
    id: String(formData.get("id") ?? "").trim(),
    organizationId: String(formData.get("organizationId") ?? ""),
    title: String(formData.get("title") ?? "").trim(),
    aliases: splitList(formData.get("aliases")),
    symbolicLines: [String(formData.get("symbolicLine1") ?? "").trim(), String(formData.get("symbolicLine2") ?? "").trim()],
    discoveredBy: String(formData.get("discoveredBy") ?? "user"),
    scopeStatus: String(formData.get("scopeStatus") ?? "target"),
    workflowStage: String(formData.get("workflowStage") ?? "listed"),
    descriptionText: String(formData.get("descriptionText") ?? ""),
    lyrics: { lines: String(formData.get("lyrics") ?? "").replace(/\r\n/gu, "\n").split("\n") },
    quickFacts,
    videos,
    relationships,
  };
}

function captureReel() {
  const formData = new FormData(entityForm);
  const clips = [...drawerBody.querySelectorAll("[data-reel-clip]")].map((card) => {
    const field = (name) => card.querySelector(`[data-reel-clip-field="${name}"]`).value;
    return {
      id: card.dataset.reelClip,
      sourceUrl: field("sourceUrl").trim(),
      startSeconds: Number.parseFloat(field("startSeconds")),
      endSeconds: Number.parseFloat(field("endSeconds")),
      songId: field("songId"),
      headline: field("headline").trim(),
      attributionText: field("attributionText").trim(),
      lyricsLines: field("lyricsLines").replace(/\r\n/gu, "\n").split("\n").map((line) => line.trim()).filter(Boolean),
      crop: field("crop"),
    };
  });
  return {
    id: String(formData.get("id") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    originalSongTitle: String(formData.get("originalSongTitle") ?? "").trim(),
    hookText: String(formData.get("hookText") ?? "").trim(),
    endCardText: String(formData.get("endCardText") ?? "").trim(),
    postCaption: String(formData.get("postCaption") ?? ""),
    status: String(formData.get("status") ?? "draft"),
    clips,
  };
}

async function saveDrawerEntity() {
  if (!drawerState || busy) return;
  setBusy(true, "저장 중");
  saveEntityButton.textContent = "저장 중…";
  try {
    if (drawerState.type === "organization") {
      const organization = captureOrganization();
      if (drawerState.mode === "create") {
        await api("/api/organizations", { method: "POST", body: { organization } });
        toast("새 대학·구단을 추가했어요.");
      } else {
        await api(`/api/organizations/${encodeURIComponent(drawerState.id)}`, {
          method: "PUT",
          body: { organization, expectedRevision: drawerState.revision },
        });
        toast("대학·구단 정보를 저장했어요.");
      }
    } else if (drawerState.type === "song") {
      const song = captureSong();
      if (drawerState.mode === "create") {
        await api("/api/songs", { method: "POST", body: { song } });
        toast("새 응원가를 추가했어요.");
      } else {
        await api(`/api/songs/${encodeURIComponent(drawerState.id)}`, {
          method: "PUT",
          body: { song, expectedRevision: drawerState.revision },
        });
        toast("응원가 정보를 저장했어요.");
      }
    } else {
      const reel = captureReel();
      if (drawerState.mode === "create") {
        await api("/api/reels", { method: "POST", body: { reel } });
        toast("새 릴스 프로젝트를 만들었어요.");
      } else {
        await api(`/api/reels/${encodeURIComponent(drawerState.id)}`, {
          method: "PUT",
          body: { reel, expectedRevision: drawerState.revision },
        });
        toast("릴스 프로젝트를 저장했어요.");
      }
    }
    drawerState.dirty = false;
    closeDrawer();
    await loadState();
  } catch (error) {
    showError(error);
  } finally {
    saveEntityButton.textContent = "저장";
    setBusy(false);
  }
}

async function deleteOrganization(id) {
  const organization = organizationById(id);
  if (!organization || busy) return;
  const linkedMessage = organization.songCount > 0
    ? `연결된 응원가 ${organization.songCount}곡도 Admin 데이터베이스에서 함께 제거돼요.`
    : "이 행은 Admin 데이터베이스에서 제거돼요.";
  const confirmed = await askConfirm({
    title: `${organization.name}을 삭제할까요?`,
    message: `${linkedMessage} 공개 정본 파일은 직접 수정하지 않고 삭제 기록을 남겨요.`,
    confirmLabel: organization.songCount > 0 ? `${organization.songCount}곡과 함께 삭제` : "삭제",
    phrase: organization.name,
    danger: true,
  });
  if (!confirmed) return;
  setBusy(true, "삭제 중");
  try {
    await api(`/api/organizations/${encodeURIComponent(id)}?cascade=${organization.songCount > 0}`, {
      method: "DELETE",
      body: { expectedRevision: organization.revision },
    });
    if (drawerState?.type === "organization" && drawerState.id === id) closeDrawer();
    await loadState();
    toast(`${organization.name}을 삭제했어요.`);
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
}

async function deleteSong(id) {
  const song = songById(id);
  if (!song || busy) return;
  const confirmed = await askConfirm({
    title: `${song.title}을 삭제할까요?`,
    message: "응원가 행을 제거하고 삭제 기록을 남겨요. 이 작업은 새 편집 데이터로 다시 추가하기 전까지 목록에 나타나지 않아요.",
    confirmLabel: "응원가 삭제",
    phrase: song.title,
    danger: true,
  });
  if (!confirmed) return;
  setBusy(true, "삭제 중");
  try {
    await api(`/api/songs/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: { expectedRevision: song.revision },
    });
    if (drawerState?.type === "song" && drawerState.id === id) closeDrawer();
    await loadState();
    toast(`${song.title}을 삭제했어요.`);
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
}

async function deleteReel(id) {
  const reel = reelById(id);
  if (!reel || busy) return;
  const confirmed = await askConfirm({
    title: `${reel.title}을 삭제할까요?`,
    message: "릴스 기획 데이터가 목록에서 제거됩니다. 이미 생성된 로컬 렌더 파일은 자동으로 지우지 않아요.",
    confirmLabel: "릴스 삭제",
    phrase: reel.title,
    danger: true,
  });
  if (!confirmed) return;
  setBusy(true, "삭제 중");
  try {
    await api(`/api/reels/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: { expectedRevision: reel.revision },
    });
    if (drawerState?.type === "reel" && drawerState.id === id) closeDrawer();
    await loadState();
    toast(`${reel.title}을 삭제했어요.`);
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
}

async function requestReelRender() {
  if (drawerState?.type !== "reel" || drawerState.mode !== "edit" || busy) return;
  if (drawerState.dirty) {
    toast("렌더링하기 전에 변경 내용을 먼저 저장해 주세요.", "error");
    return;
  }
  const id = drawerState.id;
  setBusy(true, "렌더 시작 중");
  try {
    const result = await api(`/api/reels/${encodeURIComponent(id)}?action=render`, {
      method: "POST",
      body: { expectedRevision: drawerState.revision },
    });
    await loadState({ render: false });
    openReelDrawer(id);
    toast(result.started ? "영상 렌더링을 시작했어요." : "이미 이 프로젝트를 렌더링하고 있어요.");
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
}

function askConfirm({ title, message, confirmLabel, phrase = null, danger = true }) {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmActionButton.textContent = confirmLabel;
  confirmActionButton.className = `button ${danger ? "button-danger" : "button-primary"}`;
  confirmPhraseWrap.hidden = !phrase;
  confirmPhraseInput.value = "";
  confirmPhraseInput.placeholder = phrase ?? "";
  confirmPhraseLabel.textContent = phrase ? `'${phrase}' 입력` : "확인";
  confirmActionButton.disabled = Boolean(phrase);

  return new Promise((resolve) => {
    const update = () => { confirmActionButton.disabled = Boolean(phrase) && confirmPhraseInput.value !== phrase; };
    const close = () => {
      confirmPhraseInput.removeEventListener("input", update);
      resolve(confirmDialog.returnValue === "confirm");
    };
    confirmPhraseInput.addEventListener("input", update);
    confirmDialog.addEventListener("close", close, { once: true });
    confirmDialog.showModal();
    if (phrase) window.setTimeout(() => confirmPhraseInput.focus(), 30);
  });
}

function populateImportOrganizations() {
  importOrganization.innerHTML = database.organizations.map((organization) => `<option value="${escapeHtml(organization.id)}">${escapeHtml(organization.name)}</option>`).join("");
  if (filters.songOrganization !== "all") importOrganization.value = filters.songOrganization;
}

function openImportDialog() {
  populateImportOrganizations();
  importDialog.showModal();
}

async function submitImport() {
  if (busy) return;
  const formData = new FormData(importForm);
  setBusy(true, "목록 추가 중");
  try {
    const result = await api("/api/import", {
      method: "POST",
      body: {
        organizationId: importOrganization.value,
        targetText: formData.get("targetText"),
        deferredText: formData.get("deferredText"),
        discoveredText: formData.get("discoveredText"),
      },
    });
    importDialog.close();
    importForm.reset();
    await loadState();
    toast(`${result.created.length}곡을 추가했어요.${result.skipped.length ? ` 중복 ${result.skipped.length}곡은 건너뛰었어요.` : ""}`);
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
}

async function requestEnrichment() {
  if (drawerState?.type !== "song" || drawerState.mode !== "edit" || busy) return;
  if (drawerState.dirty) {
    toast("AI 수집·작성을 요청하기 전에 변경 내용을 먼저 저장해 주세요.", "error");
    return;
  }
  const id = drawerState.id;
  setBusy(true, "작업 요청 중");
  try {
    const result = await api(`/api/songs/${encodeURIComponent(id)}?action=request-enrichment`, {
      method: "POST",
      body: { expectedRevision: drawerState.revision },
    });
    await loadState({ render: false });
    openSongDrawer(id);
    toast(result.created ? "Naru/Codex 수집·작성 작업을 만들었어요." : "이미 진행 중인 AI 작업이 있어요.");
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
}

async function updateSongStage(id, workflowStage, select) {
  const song = songById(id);
  if (!song || busy || song.workflowStage === workflowStage) return;
  select.disabled = true;
  setBusy(true, "라벨 변경 중");
  try {
    await api(`/api/songs/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: { song: { workflowStage }, expectedRevision: song.revision },
    });
    await loadState();
    toast(`${song.title}의 작업 라벨을 '${STAGE_LABELS[workflowStage]}'로 바꿨어요.`);
  } catch (error) {
    select.value = song.workflowStage;
    showError(error);
  } finally {
    select.disabled = false;
    setBusy(false);
  }
}

navigation.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (button) setView(button.dataset.view);
});

viewRoot.addEventListener("click", (event) => {
  const target = event.target;
  const createOrganizationButton = target.closest("[data-create-organization]");
  const createSongButton = target.closest("[data-create-song]");
  const createReelButton = target.closest("[data-create-reel]");
  const editOrganizationButton = target.closest("[data-edit-organization]");
  const editSongButton = target.closest("[data-edit-song]");
  const editReelButton = target.closest("[data-edit-reel]");
  const deleteOrganizationButton = target.closest("[data-delete-organization]");
  const deleteSongButton = target.closest("[data-delete-song]");
  const deleteReelButton = target.closest("[data-delete-reel]");
  const organizationRow = target.closest("[data-organization-row]");
  const songRow = target.closest("[data-song-row]");
  const reelRow = target.closest("[data-reel-row]");
  const linkedOrganization = target.closest("[data-view-songs-organization]");
  const goView = target.closest("[data-go-view]");

  if (createOrganizationButton) openOrganizationDrawer();
  else if (createSongButton) openSongDrawer();
  else if (createReelButton) openReelDrawer();
  else if (editOrganizationButton) openOrganizationDrawer(editOrganizationButton.dataset.editOrganization);
  else if (editSongButton) openSongDrawer(editSongButton.dataset.editSong);
  else if (editReelButton) openReelDrawer(editReelButton.dataset.editReel);
  else if (deleteOrganizationButton) deleteOrganization(deleteOrganizationButton.dataset.deleteOrganization);
  else if (deleteSongButton) deleteSong(deleteSongButton.dataset.deleteSong);
  else if (deleteReelButton) deleteReel(deleteReelButton.dataset.deleteReel);
  else if (target.closest("[data-bulk-request-enrichment]")) bulkRequestEnrichment();
  else if (target.closest("[data-clear-song-selection]")) {
    selectedSongIds.clear();
    syncSongSelectionUI();
  }
  else if (target.closest("[data-open-import]")) openImportDialog();
  else if (target.closest("[data-reload-page]")) location.reload();
  else if (linkedOrganization) {
    filters.songOrganization = linkedOrganization.dataset.viewSongsOrganization;
    setView("songs");
  } else if (goView) setView(goView.dataset.goView);
  else if (organizationRow && !target.closest("button, a, input, select")) openOrganizationDrawer(organizationRow.dataset.organizationRow);
  else if (songRow && !target.closest("button, a, input, select")) openSongDrawer(songRow.dataset.songRow);
  else if (reelRow && !target.closest("button, a, input, select")) openReelDrawer(reelRow.dataset.reelRow);
});

viewRoot.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  if (event.target.closest("button, a, input, select, textarea")) return;
  const organizationRow = event.target.closest("[data-organization-row]");
  const songRow = event.target.closest("[data-song-row]");
  const reelRow = event.target.closest("[data-reel-row]");
  if (organizationRow) {
    event.preventDefault();
    openOrganizationDrawer(organizationRow.dataset.organizationRow);
  } else if (songRow) {
    event.preventDefault();
    openSongDrawer(songRow.dataset.songRow);
  } else if (reelRow) {
    event.preventDefault();
    openReelDrawer(reelRow.dataset.reelRow);
  }
});

viewRoot.addEventListener("input", (event) => {
  if (event.target.id === "organization-search") {
    filters.organizationSearch = event.target.value;
    applyOrganizationFilters();
  }
  if (event.target.id === "song-search") {
    filters.songSearch = event.target.value;
    applySongFilters();
  }
  if (event.target.id === "reel-search") {
    filters.reelSearch = event.target.value;
    applyReelFilters();
  }
});

viewRoot.addEventListener("change", (event) => {
  if (event.target.matches("[data-select-song]")) {
    if (event.target.checked) selectedSongIds.add(event.target.dataset.selectSong);
    else selectedSongIds.delete(event.target.dataset.selectSong);
    syncSongSelectionUI();
  }
  if (event.target.id === "song-select-visible") {
    const visibleRows = [...document.querySelectorAll("[data-song-row]")].filter((row) => !row.hidden);
    for (const row of visibleRows) {
      if (event.target.checked) selectedSongIds.add(row.dataset.songRow);
      else selectedSongIds.delete(row.dataset.songRow);
    }
    syncSongSelectionUI();
  }
  if (event.target.id === "organization-type-filter") {
    filters.organizationType = event.target.value;
    applyOrganizationFilters();
  }
  if (event.target.id === "song-organization-filter") filters.songOrganization = event.target.value;
  if (event.target.id === "song-scope-filter") filters.songScope = event.target.value;
  if (event.target.id === "song-stage-filter") filters.songStage = event.target.value;
  if (event.target.id === "song-job-filter") filters.songJobStatus = event.target.value;
  if (["song-organization-filter", "song-scope-filter", "song-stage-filter", "song-job-filter"].includes(event.target.id)) applySongFilters();
  if (event.target.matches("[data-inline-song-stage]")) {
    updateSongStage(event.target.dataset.inlineSongStage, event.target.value, event.target);
  }
  if (event.target.id === "reel-status-filter") filters.reelStatus = event.target.value;
  if (event.target.id === "reel-render-filter") filters.reelRenderStatus = event.target.value;
  if (["reel-status-filter", "reel-render-filter"].includes(event.target.id)) applyReelFilters();
  if (event.target.id === "bulk-song-stage" && event.target.value) {
    const value = event.target.value;
    event.target.value = "";
    bulkUpdateSongs({ workflowStage: value }, STAGE_LABELS[value]);
  }
  if (event.target.id === "bulk-song-scope" && event.target.value) {
    const value = event.target.value;
    event.target.value = "";
    bulkUpdateSongs({ scopeStatus: value }, SCOPE_LABELS[value]);
  }
});

entityForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveDrawerEntity();
});

entityForm.addEventListener("input", (event) => {
  if (!drawerState || busy) return;
  drawerState.dirty = true;
  if (drawerState.type === "organization") {
    const pickerName = event.target.dataset.colorPicker;
    if (pickerName) {
      const textInput = entityForm.elements.namedItem(pickerName);
      textInput.value = event.target.value.toUpperCase();
    } else if (["primaryColor", "secondaryColor"].includes(event.target.name)) {
      const picker = drawerBody.querySelector(`[data-color-picker="${event.target.name}"]`);
      if (/^#[0-9a-f]{6}$/iu.test(event.target.value)) picker.value = event.target.value;
    }
    updateOrganizationPreview();
  }
  if (drawerState.type === "reel") updateReelPreview();
});

entityForm.addEventListener("change", () => {
  if (!drawerState || busy) return;
  drawerState.dirty = true;
  if (drawerState.type === "organization") updateOrganizationPreview();
  if (drawerState.type === "reel") updateReelPreview();
});

drawerBody.addEventListener("click", (event) => {
  if (event.target.closest("[data-add-reel-clip]")) {
    const list = document.querySelector("#reel-clip-list");
    list.querySelector(".reel-empty-clips")?.remove();
    const index = list.querySelectorAll("[data-reel-clip]").length;
    list.insertAdjacentHTML("beforeend", reelClipEditor({ id: `clip-${Date.now().toString(36)}`, startSeconds: 0, endSeconds: 8, crop: "center" }, index));
    drawerState.dirty = true;
    updateReelPreview();
    list.lastElementChild?.querySelector('[data-reel-clip-field="sourceUrl"]')?.focus();
    return;
  }
  const removeClipButton = event.target.closest("[data-remove-reel-clip]");
  if (removeClipButton) {
    event.preventDefault();
    removeClipButton.closest("[data-reel-clip]").remove();
    drawerState.dirty = true;
    updateReelPreview();
    return;
  }
  const moveClipButton = event.target.closest("[data-move-clip]");
  if (moveClipButton) {
    event.preventDefault();
    const card = moveClipButton.closest("[data-reel-clip]");
    if (moveClipButton.dataset.moveClip === "up" && card.previousElementSibling) card.parentElement.insertBefore(card, card.previousElementSibling);
    if (moveClipButton.dataset.moveClip === "down" && card.nextElementSibling) card.parentElement.insertBefore(card.nextElementSibling, card);
    drawerState.dirty = true;
    updateReelPreview();
    return;
  }
  if (event.target.closest("[data-insert-note]")) {
    const input = document.querySelector("#description-input");
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = input.value.slice(start, end);
    input.setRangeText(`[* ${selected || "원문 출처: https://"}]`, start, end, "end");
    input.focus();
    drawerState.dirty = true;
  }
  if (event.target.closest("[data-request-enrichment]")) requestEnrichment();
  if (event.target.closest("[data-render-reel]")) requestReelRender();
  const linked = event.target.closest("[data-view-linked-songs]");
  if (linked) {
    filters.songOrganization = linked.dataset.viewLinkedSongs;
    drawerState.dirty = false;
    closeDrawer();
    setView("songs");
  }
});

deleteEntityButton.addEventListener("click", () => {
  if (drawerState?.type === "organization") deleteOrganization(drawerState.id);
  if (drawerState?.type === "song") deleteSong(drawerState.id);
  if (drawerState?.type === "reel") deleteReel(drawerState.id);
});
cancelEntityButton.addEventListener("click", attemptCloseDrawer);
drawerClose.addEventListener("click", attemptCloseDrawer);
drawerExpand.addEventListener("click", () => setDrawerExpanded(!drawerLayer.classList.contains("is-expanded")));
drawerBackdrop.addEventListener("click", attemptCloseDrawer);

refreshButton.addEventListener("click", async () => {
  if (drawerState?.dirty) {
    toast("열려 있는 편집 내용을 저장하거나 닫은 뒤 새로고침해 주세요.", "error");
    return;
  }
  try {
    await loadState();
    toast("최신 데이터를 불러왔어요.");
  } catch (error) {
    showError(error);
  }
});

importForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitImport();
});
document.querySelectorAll("[data-close-import]").forEach((button) => button.addEventListener("click", () => importDialog.close()));

window.addEventListener("hashchange", () => {
  const view = validView(location.hash.slice(1));
  if (view && view !== currentView) setView(view, { updateHash: false });
});
window.addEventListener("beforeunload", (event) => {
  if (!drawerState?.dirty) return;
  event.preventDefault();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !drawerLayer.hidden && !confirmDialog.open && !importDialog.open) {
    event.preventDefault();
    attemptCloseDrawer();
  }
});

window.setInterval(async () => {
  const hasActiveRender = database.reels?.some((reel) => ["queued", "rendering"].includes(reel.render?.status));
  if (!hasActiveRender || busy || drawerState?.dirty || reelPollInProgress) return;
  reelPollInProgress = true;
  const openReelId = drawerState?.type === "reel" ? drawerState.id : null;
  try {
    await loadState();
    if (openReelId && reelById(openReelId)) openReelDrawer(openReelId);
  } catch (error) {
    showError(error);
  } finally {
    reelPollInProgress = false;
  }
}, 2500);

try {
  await loadState();
} catch (error) {
  showError(error);
  syncState.lastChild.textContent = "연결 실패";
  viewRoot.innerHTML = `<div class="empty-table"><span class="empty-table-icon">!</span><strong>Admin 데이터를 불러오지 못했어요</strong><p>${escapeHtml(error.message)}</p><button type="button" class="button button-primary" data-reload-page>다시 시도</button></div>`;
}
