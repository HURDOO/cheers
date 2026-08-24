const viewRoot = document.querySelector("#view-root");
const pageBreadcrumb = document.querySelector("#page-breadcrumb");
const syncState = document.querySelector("#sync-state");
const refreshButton = document.querySelector("#refresh-button");
const navigation = document.querySelector(".main-nav");
const organizationCount = document.querySelector("#nav-organization-count");
const songCount = document.querySelector("#nav-song-count");
const drawerLayer = document.querySelector("#drawer-layer");
const drawerBackdrop = document.querySelector("#drawer-backdrop");
const drawerClose = document.querySelector("#drawer-close");
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
};
const TYPE_LABELS = { baseball: "프로야구", university: "대학교" };
const SCOPE_LABELS = {
  target: "조사 대상",
  deferred: "나중에 조사",
  discovered_pending: "AI 추가 발견",
  rejected: "제외",
};
const STAGE_LABELS = {
  listed: "목록 등록",
  researching: "AI 조사 중",
  research_ready: "조사 도착",
  editing: "편집 중",
  review_ready: "최종 확인",
  approved: "승인",
  published: "공개",
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
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 16.2-4-4L4 13.6l5.5 5.5L20 8.6 18.6 7.2l-9.1 9Z" /></svg>',
  spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.5 5.2L19 9l-5.5 1.8L12 16l-1.5-5.2L5 9l5.5-1.8L12 2Zm7 12 .8 2.7 2.7.8-2.7.8L19 21l-.8-2.7-2.7-.8 2.7-.8L19 14Z" /></svg>',
};

let database = { organizations: [], songs: [], jobs: [] };
let currentView = validView(location.hash.slice(1)) ?? "overview";
let busy = false;
let drawerState = null;
let drawerOpener = null;
const filters = {
  organizationSearch: "",
  organizationType: "all",
  songSearch: "",
  songOrganization: "all",
  songScope: "all",
  songStage: "all",
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
    if (filters.songOrganization !== "all"
      && !database.organizations.some(({ id }) => id === filters.songOrganization)) {
      filters.songOrganization = "all";
    }
    organizationCount.textContent = database.organizations.length;
    songCount.textContent = database.songs.length;
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
       <button type="button" class="button button-primary" data-create-song>${icons.plus}응원가 추가</button>`,
    )}
    <section class="metric-grid" aria-label="데이터 현황">
      ${metricCard("대학·구단", database.organizations.length, "blue", icons.building)}
      ${metricCard("전체 응원가", database.songs.length, "green", icons.music)}
      ${metricCard("편집 레코드", edited, "purple", icons.check)}
      ${metricCard("진행 중 AI 작업", activeJobs, "orange", icons.spark)}
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
      "구단별 응원가 행과 콘텐츠, 영상, 조사 상태를 관리해요.",
      `<button type="button" class="button button-secondary" data-open-import>${icons.upload}목록 추가</button><button type="button" class="button button-primary" data-create-song>${icons.plus}새 응원가</button>`,
    )}
    <section class="data-card">
      <div class="table-toolbar">
        <div class="toolbar-group">
          <label class="search-control"><span class="sr-only">응원가 검색</span>${icons.search}<input id="song-search" type="search" value="${escapeHtml(filters.songSearch)}" placeholder="곡명이나 별칭 검색" /></label>
          <select id="song-organization-filter" class="filter-select" aria-label="대학·구단 필터"><option value="all">모든 대학·구단</option>${organizationOptions}</select>
          <select id="song-scope-filter" class="filter-select" aria-label="조사 범위 필터"><option value="all">모든 조사 범위</option>${selectOptions(SCOPE_LABELS, filters.songScope)}</select>
          <select id="song-stage-filter" class="filter-select" aria-label="진행 상태 필터"><option value="all">모든 진행 상태</option>${selectOptions(STAGE_LABELS, filters.songStage)}</select>
        </div>
        <span id="song-result-count" class="table-result"></span>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <colgroup><col style="width:28%"><col style="width:19%"><col style="width:13%"><col style="width:13%"><col style="width:9%"><col style="width:12%"><col style="width:6%"></colgroup>
          <thead><tr><th>응원가</th><th>대학·구단</th><th>조사 범위</th><th>진행 상태</th><th>영상</th><th>최근 수정</th><th><span class="sr-only">작업</span></th></tr></thead>
          <tbody id="song-table-body">
            ${database.songs.map((song) => songRow(song)).join("")}
            <tr id="song-empty-row" hidden><td colspan="7"><div class="empty-table"><span class="empty-table-icon">♪</span><strong>조건에 맞는 응원가가 없어요</strong><p>필터를 바꾸거나 새 응원가를 추가해 보세요.</p></div></td></tr>
          </tbody>
        </table>
      </div>
    </section>`;
  applySongFilters();
}

function songRow(song) {
  const organization = organizationById(song.organizationId);
  const scopeColor = { target: "blue", deferred: "gray", discovered_pending: "purple", rejected: "red" }[song.scopeStatus];
  const stageColor = { published: "green", approved: "green", research_ready: "purple", researching: "orange", editing: "blue", review_ready: "orange", listed: "gray", rejected: "red" }[song.workflowStage] ?? "gray";
  return `
    <tr class="row-clickable" data-song-row="${escapeHtml(song.id)}" tabindex="0">
      <td><div class="entity-primary"><span class="entity-avatar song-avatar">♪</span><div class="entity-primary-copy"><strong>${escapeHtml(song.title)}</strong><small>${escapeHtml(song.aliases?.join(", ") || song.id)}</small></div></div></td>
      <td><div class="entity-primary">${organization ? organizationAvatar(organization, "entity-avatar") : ""}<div class="entity-primary-copy"><strong>${escapeHtml(organization?.name ?? "알 수 없음")}</strong><small>${escapeHtml(organization?.abbreviation ?? song.organizationId)}</small></div></div></td>
      <td><span class="pill ${scopeColor}">${escapeHtml(SCOPE_LABELS[song.scopeStatus])}</span></td>
      <td><span class="pill ${stageColor}">${escapeHtml(STAGE_LABELS[song.workflowStage])}</span></td>
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
    const text = normalizeSearch(`${song.title} ${(song.aliases ?? []).join(" ")} ${organization?.name ?? ""} ${song.id}`);
    const matches = (!query || text.includes(query))
      && (filters.songOrganization === "all" || song.organizationId === filters.songOrganization)
      && (filters.songScope === "all" || song.scopeStatus === filters.songScope)
      && (filters.songStage === "all" || song.workflowStage === filters.songStage);
    row.hidden = !matches;
    if (matches) visible += 1;
  });
  const result = document.querySelector("#song-result-count");
  const empty = document.querySelector("#song-empty-row");
  if (result) result.textContent = `${visible}곡 표시`;
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
  const activeJob = database.jobs.find((job) => job.songId === value.id && ACTIVE_JOB_STATUSES.has(job.status));
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
      <header class="form-section-header"><div><h3>관리 상태</h3><p>조사 대상 분류와 편집 진행 상태는 서로 독립적이에요.</p></div></header>
      <div class="form-grid three">
        <label class="field"><span>발견 주체</span><select name="discoveredBy"><option value="user" ${value.discoveredBy === "user" ? "selected" : ""}>사용자 목록</option><option value="ai" ${value.discoveredBy === "ai" ? "selected" : ""}>AI 추가 발견</option></select></label>
        <label class="field"><span>조사 범위</span><select name="scopeStatus">${selectOptions(SCOPE_LABELS, value.scopeStatus)}</select></label>
        <label class="field"><span>진행 상태</span><select name="workflowStage">${selectOptions(STAGE_LABELS, value.workflowStage)}</select></label>
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
      <label class="field"><span>공개 본문</span><textarea id="description-input" name="descriptionText" rows="14" maxlength="60000" placeholder="사용자가 직접 작성하는 이야기">${escapeHtml(value.descriptionText)}</textarea><p class="field-help">예: 흥미로운 이야기.[* 원문 출처: https://example.com]</p></label>
    </section>
    ${song ? researchSection(value, activeJob) : ""}
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

function researchSection(song, activeJob) {
  const statusText = activeJob?.status === "running" ? "조사 중" : activeJob?.status === "queued" ? "대기 중" : "AI 조사 요청";
  return `
    <section class="form-section">
      <header class="form-section-header"><div><h3>AI 조사 메모</h3><p>조사 결과는 사용자 본문을 자동으로 바꾸지 않아요.</p></div><button type="button" class="button button-secondary" data-request-research ${activeJob ? "disabled" : ""}>${icons.spark}${statusText}</button></header>
      ${song.researchText?.trim() ? `<div class="research-card"><div class="research-card-header"><strong>최근 조사 결과</strong><span class="pill purple">참고 전용</span></div><pre>${escapeHtml(song.researchText)}</pre></div>` : `<p class="field-help">아직 도착한 조사 메모가 없어요.</p>`}
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

function showDrawer() {
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
  drawerLayer.hidden = true;
  document.body.style.overflow = "";
  drawerBody.innerHTML = "";
  drawerState = null;
  drawerOpener?.focus?.();
  drawerOpener = null;
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
    } else {
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

async function requestResearch() {
  if (drawerState?.type !== "song" || drawerState.mode !== "edit" || busy) return;
  if (drawerState.dirty) {
    toast("AI 조사를 요청하기 전에 변경 내용을 먼저 저장해 주세요.", "error");
    return;
  }
  const id = drawerState.id;
  setBusy(true, "조사 요청 중");
  try {
    const result = await api(`/api/songs/${encodeURIComponent(id)}?action=request-research`, {
      method: "POST",
      body: { expectedRevision: drawerState.revision },
    });
    await loadState({ render: false });
    openSongDrawer(id);
    toast(result.created ? "Naru/Codex 조사 작업을 만들었어요." : "이미 대기 중인 조사 작업이 있어요.");
  } catch (error) {
    showError(error);
  } finally {
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
  const editOrganizationButton = target.closest("[data-edit-organization]");
  const editSongButton = target.closest("[data-edit-song]");
  const deleteOrganizationButton = target.closest("[data-delete-organization]");
  const deleteSongButton = target.closest("[data-delete-song]");
  const organizationRow = target.closest("[data-organization-row]");
  const songRow = target.closest("[data-song-row]");
  const linkedOrganization = target.closest("[data-view-songs-organization]");
  const goView = target.closest("[data-go-view]");

  if (createOrganizationButton) openOrganizationDrawer();
  else if (createSongButton) openSongDrawer();
  else if (editOrganizationButton) openOrganizationDrawer(editOrganizationButton.dataset.editOrganization);
  else if (editSongButton) openSongDrawer(editSongButton.dataset.editSong);
  else if (deleteOrganizationButton) deleteOrganization(deleteOrganizationButton.dataset.deleteOrganization);
  else if (deleteSongButton) deleteSong(deleteSongButton.dataset.deleteSong);
  else if (target.closest("[data-open-import]")) openImportDialog();
  else if (target.closest("[data-reload-page]")) location.reload();
  else if (linkedOrganization) {
    filters.songOrganization = linkedOrganization.dataset.viewSongsOrganization;
    setView("songs");
  } else if (goView) setView(goView.dataset.goView);
  else if (organizationRow && !target.closest("button, a, input, select")) openOrganizationDrawer(organizationRow.dataset.organizationRow);
  else if (songRow && !target.closest("button, a, input, select")) openSongDrawer(songRow.dataset.songRow);
});

viewRoot.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const organizationRow = event.target.closest("[data-organization-row]");
  const songRow = event.target.closest("[data-song-row]");
  if (organizationRow) {
    event.preventDefault();
    openOrganizationDrawer(organizationRow.dataset.organizationRow);
  } else if (songRow) {
    event.preventDefault();
    openSongDrawer(songRow.dataset.songRow);
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
});

viewRoot.addEventListener("change", (event) => {
  if (event.target.id === "organization-type-filter") {
    filters.organizationType = event.target.value;
    applyOrganizationFilters();
  }
  if (event.target.id === "song-organization-filter") filters.songOrganization = event.target.value;
  if (event.target.id === "song-scope-filter") filters.songScope = event.target.value;
  if (event.target.id === "song-stage-filter") filters.songStage = event.target.value;
  if (["song-organization-filter", "song-scope-filter", "song-stage-filter"].includes(event.target.id)) applySongFilters();
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
});

entityForm.addEventListener("change", () => {
  if (!drawerState || busy) return;
  drawerState.dirty = true;
  if (drawerState.type === "organization") updateOrganizationPreview();
});

drawerBody.addEventListener("click", (event) => {
  if (event.target.closest("[data-insert-note]")) {
    const input = document.querySelector("#description-input");
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = input.value.slice(start, end);
    input.setRangeText(`[* ${selected || "원문 출처: https://"}]`, start, end, "end");
    input.focus();
    drawerState.dirty = true;
  }
  if (event.target.closest("[data-request-research]")) requestResearch();
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
});
cancelEntityButton.addEventListener("click", attemptCloseDrawer);
drawerClose.addEventListener("click", attemptCloseDrawer);
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

try {
  await loadState();
} catch (error) {
  showError(error);
  syncState.lastChild.textContent = "연결 실패";
  viewRoot.innerHTML = `<div class="empty-table"><span class="empty-table-icon">!</span><strong>Admin 데이터를 불러오지 못했어요</strong><p>${escapeHtml(error.message)}</p><button type="button" class="button button-primary" data-reload-page>다시 시도</button></div>`;
}
