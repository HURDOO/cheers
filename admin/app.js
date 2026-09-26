import { buildPriorityItems, priorityGroups, prioritySummary } from "./priority.js";
import { descriptionPreview, lyricsPreview, readSongDraft, canRestoreSongDraft, draftText } from "./song-editor.js";
import { extractYouTubeVideoId, youtubeStartSeconds } from "../shared/youtube.mjs";
import {
  WORK_MODES,
  buildPolishPrompt,
  formatTimestamp,
  parsePolishResponse,
  parseTimestamp,
  pickPolishExemplars,
  songReadiness,
  videoUrlWithStart,
  workQueue,
  workSummary,
} from "./workbench.js";

const viewRoot = document.querySelector("#view-root");
const pageBreadcrumb = document.querySelector("#page-breadcrumb");
const syncState = document.querySelector("#sync-state");
const refreshButton = document.querySelector("#refresh-button");
const navigation = document.querySelector(".main-nav");
const organizationCount = document.querySelector("#nav-organization-count");
const songCount = document.querySelector("#nav-song-count");
const originalCount = document.querySelector("#nav-original-count");
const priorityCount = document.querySelector("#nav-priority-count");
const workbenchCount = document.querySelector("#nav-workbench-count");
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
const saveNextSongButton = document.querySelector("#save-next-song-button");
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
  priorities: "작업 순서",
  workbench: "작업 모드",
  organizations: "대학·구단",
  songs: "응원가",
  originals: "원곡 순서",
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
const DESCRIPTION_STATUS_LABELS = {
  draft: "초안 · 사이트에 숨김",
  polished: "다듬기 완료 · 사이트에 표시",
};
const PUBLICATION_LABELS = {
  unpublished: "미공개",
  current: "사이트 반영됨",
  changes_pending: "재공개 필요",
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
const VIDEO_LABELS = ["대표 영상", "추가 영상 1", "추가 영상 2", "추가 영상 3", "추가 영상 4"];
const ACTIVE_JOB_STATUSES = new Set(["queued", "running"]);
const SONG_TITLE_COLUMN_WIDTH_KEY = "cheers-admin-song-title-column-width";
const SONG_TITLE_COLUMN_MIN_WIDTH = 220;
const SONG_TITLE_COLUMN_MAX_WIDTH = 560;
const SONG_TITLE_COLUMN_DEFAULT_WIDTH = 340;

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
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h3Zm2 0h4a2 2 0 0 1 2 2v6h3V4h-9v4Zm4 2H5v10h9V10Z" /></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13.6 5.6 5 5a2 2 0 0 1 0 2.8l-5 5-1.4-1.4 4-4H5v-2h11.2l-4-4 1.4-1.4Z" /></svg>',
};

let database = { organizations: [], songs: [], originalSongs: [], jobs: [], reels: [], priorityPlan: null, publication: null, reelTools: { ready: false } };
let currentView = validView(location.hash.slice(1)) ?? "overview";
let busy = false;
let originalOrderIds = [];
let originalOrderSavedIds = [];
let originalOrderRevision = null;
let draggedOriginalId = null;
let drawerState = null;
let drawerOpener = null;
let reelPollInProgress = false;
let draftTimer;
const videoTimers = new WeakMap();
const videoRequests = new Set();
const selectedSongIds = new Set();
let songTitleColumnWidth = readSongTitleColumnWidth();
const filters = {
  organizationSearch: "",
  organizationType: "all",
  songSearch: "",
  songOrganization: "all",
  songScope: "all",
  songStage: "all",
  songJobStatus: "all",
  prioritySide: "all",
  priorityGroup: "all",
  priorityStatus: "remaining",
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

function clampSongTitleColumnWidth(value) {
  const width = Number(value);
  if (!Number.isFinite(width)) return SONG_TITLE_COLUMN_DEFAULT_WIDTH;
  return Math.min(SONG_TITLE_COLUMN_MAX_WIDTH, Math.max(SONG_TITLE_COLUMN_MIN_WIDTH, Math.round(width)));
}

function readSongTitleColumnWidth() {
  try {
    const storedWidth = window.localStorage.getItem(SONG_TITLE_COLUMN_WIDTH_KEY);
    return storedWidth ? clampSongTitleColumnWidth(storedWidth) : SONG_TITLE_COLUMN_DEFAULT_WIDTH;
  } catch {
    return SONG_TITLE_COLUMN_DEFAULT_WIDTH;
  }
}

function applySongTitleColumnWidth(value, { persist = false } = {}) {
  songTitleColumnWidth = clampSongTitleColumnWidth(value);
  const table = document.querySelector(".song-data-table");
  const column = table?.querySelector(".song-title-column");
  const handle = table?.querySelector("[data-song-title-resizer]");
  if (table) table.style.setProperty("--song-title-column-width", `${songTitleColumnWidth}px`);
  if (column) column.style.width = `${songTitleColumnWidth}px`;
  if (handle) handle.setAttribute("aria-valuenow", String(songTitleColumnWidth));
  if (persist) {
    try {
      window.localStorage.setItem(SONG_TITLE_COLUMN_WIDTH_KEY, String(songTitleColumnWidth));
    } catch {
      // 브라우저가 로컬 저장소를 막아도 현재 화면의 열 조절은 유지한다.
    }
  }
}

function attachSongTitleColumnResizer() {
  const handle = document.querySelector("[data-song-title-resizer]");
  if (!handle) return;

  let startX = 0;
  let startWidth = songTitleColumnWidth;
  let resizing = false;

  const finishResize = () => {
    if (!resizing) return;
    resizing = false;
    document.body.classList.remove("is-resizing-column");
    applySongTitleColumnWidth(songTitleColumnWidth, { persist: true });
  };

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    resizing = true;
    startX = event.clientX;
    startWidth = songTitleColumnWidth;
    document.body.classList.add("is-resizing-column");
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener("pointermove", (event) => {
    if (!resizing) return;
    applySongTitleColumnWidth(startWidth + event.clientX - startX);
  });
  handle.addEventListener("pointerup", finishResize);
  handle.addEventListener("lostpointercapture", finishResize);
  handle.addEventListener("dblclick", () => {
    applySongTitleColumnWidth(SONG_TITLE_COLUMN_DEFAULT_WIDTH, { persist: true });
  });
  handle.addEventListener("keydown", (event) => {
    if (!new Set(["ArrowLeft", "ArrowRight", "Home"]).has(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 40 : 16;
    const width = event.key === "Home"
      ? SONG_TITLE_COLUMN_DEFAULT_WIDTH
      : songTitleColumnWidth + (event.key === "ArrowRight" ? step : -step);
    applySongTitleColumnWidth(width, { persist: true });
  });

  applySongTitleColumnWidth(songTitleColumnWidth);
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
  saveNextSongButton.disabled = nextBusy || !drawerState?.nextSongId;
  entityForm.inert = nextBusy;
}

function toast(message, type = "success") {
  const element = document.createElement("div");
  element.className = `toast ${type === "error" ? "is-error" : ""}`;
  element.textContent = message;
  toastRegion.append(element);
  window.setTimeout(() => element.remove(), 4200);
}

async function copyText(value) {
  const text = String(value ?? "");
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // 창에 초점이 없거나 권한이 막히면 아래 방식으로 다시 시도한다.
    }
  }
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("클립보드에 복사하지 못했습니다.");
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
    if (!originalOrderDirty()) {
      originalOrderIds = database.originalSongs.map(({ id }) => id);
      originalOrderSavedIds = [...originalOrderIds];
      originalOrderRevision = database.originalOrderRevision;
    }
    const currentSongIds = new Set(database.songs.map(({ id }) => id));
    for (const id of selectedSongIds) if (!currentSongIds.has(id)) selectedSongIds.delete(id);
    if (filters.songOrganization !== "all"
      && !database.organizations.some(({ id }) => id === filters.songOrganization)) {
      filters.songOrganization = "all";
    }
    organizationCount.textContent = database.organizations.length;
    songCount.textContent = database.songs.length;
    originalCount.textContent = database.originalSongs.length;
    priorityCount.textContent = prioritySummary(buildPriorityItems(database)).remaining;
    workbenchCount.textContent = workSummary(database).publish;
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
  else if (currentView === "priorities") renderPrioritiesView();
  else if (currentView === "workbench") renderWorkbenchView();
  else if (currentView === "songs") renderSongsView();
  else if (currentView === "originals") renderOriginalOrderView();
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

function originalOrderDirty() {
  return originalOrderIds.length !== originalOrderSavedIds.length
    || originalOrderIds.some((id, index) => id !== originalOrderSavedIds[index]);
}

function originalOrderLinkedSong(song) {
  const organization = organizationById(song.organizationId);
  const status = song.publication?.status ?? "unpublished";
  const label = { current: "공개", changes_pending: "재공개 필요", unpublished: "미공개" }[status] ?? "미공개";
  const tone = status === "current" ? "green" : status === "changes_pending" ? "orange" : "gray";
  return `<button type="button" class="original-order-linked-song" data-edit-song="${escapeHtml(song.id)}">
    <strong>${escapeHtml(song.title)}</strong>
    <span>${escapeHtml(organization?.name ?? song.organizationId)}</span>
    <em class="pill ${tone}">${label}</em>
  </button>`;
}

function renderOriginalOrderView({ focusId = null, focusControl = "" } = {}) {
  const byId = new Map(database.originalSongs.map((song) => [song.id, song]));
  const linkedByOriginal = new Map(database.originalSongs.map(({ id }) => [id, { primary: [], secondary: [] }]));
  for (const song of database.songs) {
    for (const relationship of song.relationships ?? []) {
      const linked = linkedByOriginal.get(relationship.targetId);
      if (relationship.type === "original-song" && linked) linked.primary.push(song);
      if (relationship.type === "secondary-original-song" && linked) linked.secondary.push(song);
    }
  }
  const dirty = originalOrderDirty();
  viewRoot.innerHTML = `
    ${pageHeader("원곡 순서", "메인페이지 ‘원곡별’ 목록의 위에서 아래 순서입니다. 변경 후 저장하면 로컬 사이트에 반영되며, 운영 사이트에는 다음 배포 때 반영됩니다.", `
      <button type="button" class="button button-secondary" data-reset-original-order ${dirty ? "" : "disabled"}>변경 취소</button>
      <button type="button" class="button button-primary" data-save-original-order ${dirty ? "" : "disabled"}>순서 저장</button>`)}
    <p class="original-order-help">행을 드래그하거나 화살표·위치 번호로 옮길 수 있어요. 대표 원곡으로 연결된 공개 응원가만 메인페이지의 해당 원곡 아래에 표시됩니다.</p>
    <p class="original-order-status" role="status">${dirty ? "저장하지 않은 순서 변경이 있어요." : "현재 저장된 순서입니다."}</p>
    <ol class="original-order-list">
      ${originalOrderIds.map((id, index) => {
        const song = byId.get(id);
        if (!song) return "";
        const linked = linkedByOriginal.get(id);
        const count = linked.primary.filter((item) => ["current", "changes_pending"].includes(item.publication?.status)).length;
        return `<li class="original-order-item" draggable="true" data-original-id="${escapeHtml(id)}">
          <span class="original-order-grip" aria-hidden="true">⋮⋮</span>
          <span class="original-order-index">${String(index + 1).padStart(2, "0")}</span>
          <span class="original-order-copy"><strong>${escapeHtml(song.title)}</strong><small>${escapeHtml(song.artist)} · ${escapeHtml(id)}</small></span>
          <span class="pill ${count ? "green" : "gray"}">${count ? `공개 ${count}곡` : "미노출"}</span>
          <label class="original-order-position"><span class="sr-only">${escapeHtml(song.title)} 이동 위치</span><input type="number" min="1" max="${originalOrderIds.length}" value="${index + 1}" data-original-position="${escapeHtml(id)}" aria-label="${escapeHtml(song.title)} 이동 위치" /></label>
          <div class="original-order-arrows">
            <button type="button" data-move-original="up" data-original-id="${escapeHtml(id)}" aria-label="${escapeHtml(song.title)} 위로 이동" ${index === 0 ? "disabled" : ""}>↑</button>
            <button type="button" data-move-original="down" data-original-id="${escapeHtml(id)}" aria-label="${escapeHtml(song.title)} 아래로 이동" ${index === originalOrderIds.length - 1 ? "disabled" : ""}>↓</button>
          </div>
          <div class="original-order-connections">
            <span class="original-order-connection-heading">대표 원곡 연결 · 응원가 ${linked.primary.length}곡</span>
            <div class="original-order-song-list">${linked.primary.length ? linked.primary.map(originalOrderLinkedSong).join("") : '<span class="original-order-no-songs">등록된 응원가 없음</span>'}</div>
            ${linked.secondary.length ? `<span class="original-order-connection-heading">보조 원곡 연결 · 응원가 ${linked.secondary.length}곡</span>
              <div class="original-order-song-list">${linked.secondary.map(originalOrderLinkedSong).join("")}</div>` : ""}
          </div>
        </li>`;
      }).join("")}
    </ol>`;
  if (focusId) {
    const row = [...viewRoot.querySelectorAll("[data-original-id]")].find((item) => item.matches(".original-order-item") && item.dataset.originalId === focusId);
    const control = row?.querySelector(focusControl || "[data-original-position]");
    (control?.disabled ? row.querySelector("[data-original-position]") : control)?.focus({ preventScroll: true });
  }
}

function moveOriginalSongTo(id, destinationIndex, focusControl = "") {
  if (busy) return;
  const currentIndex = originalOrderIds.indexOf(id);
  if (currentIndex < 0 || !Number.isInteger(destinationIndex)) return;
  const nextIndex = Math.max(0, Math.min(originalOrderIds.length - 1, destinationIndex));
  if (currentIndex === nextIndex) return;
  originalOrderIds.splice(currentIndex, 1);
  originalOrderIds.splice(nextIndex, 0, id);
  renderOriginalOrderView({ focusId: id, focusControl });
}

async function saveOriginalOrder() {
  if (busy || !originalOrderDirty()) return;
  setBusy(true, "순서 저장 중");
  try {
    const result = await api("/api/original-songs/order", {
      method: "PUT",
      body: { ids: originalOrderIds, expectedRevision: originalOrderRevision },
    });
    originalOrderSavedIds = [...originalOrderIds];
    originalOrderRevision = result.revision;
    await loadState();
    toast("원곡 순서를 저장했어요.");
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
}

function renderOverview() {
  const published = database.publication?.songCount ?? 0;
  const activeJobs = database.jobs.filter((job) => ACTIVE_JOB_STATUSES.has(job.status)).length;
  const edited = database.songs.filter((song) => song.persisted).length;
  const priorityItems = buildPriorityItems(database);
  const priorityState = prioritySummary(priorityItems);
  const nextPriority = priorityItems.find(({ action }) => !["complete", "waiting"].includes(action));
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
    <section class="priority-dashboard-card">
      <div class="priority-dashboard-copy">
        <span class="priority-dashboard-eyebrow">2026 고연전 · NEXT</span>
        <strong>${nextPriority ? `${nextPriority.code} · ${escapeHtml(nextPriority.title)}` : "우선순위 작업 완료"}</strong>
        <p>${nextPriority ? `${escapeHtml(nextPriority.chatgptTask)} → ${escapeHtml(nextPriority.userTask)}` : "현재 우선순위 큐에 남은 작업이 없습니다."}</p>
      </div>
      <div class="priority-dashboard-meta">
        <span><strong>${priorityState.remaining}</strong>남은 작업</span>
        <span><strong>${priorityState.finalReview}</strong>사용자 확인</span>
        <button type="button" class="button button-primary" data-go-view="priorities">작업 순서 보기${icons.arrow}</button>
      </div>
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

function filteredPriorityItems(items) {
  return items.filter((item) => {
    const sideMatches = filters.prioritySide === "all" || item.sideKeys.includes(filters.prioritySide);
    const groupMatches = filters.priorityGroup === "all" || item.groupKey === filters.priorityGroup;
    const statusMatches = filters.priorityStatus === "all"
      || (filters.priorityStatus === "remaining" && item.action !== "complete")
      || (filters.priorityStatus === "chatgpt" && ["final_review", "editorial_review", "collect", "add_missing", "check_lineage"].includes(item.action))
      || (filters.priorityStatus === "user" && ["final_review", "publish"].includes(item.action))
      || (filters.priorityStatus === "waiting" && item.action === "waiting")
      || (filters.priorityStatus === "complete" && item.action === "complete");
    return sideMatches && groupMatches && statusMatches;
  });
}

function renderPrioritiesView() {
  const allItems = buildPriorityItems(database);
  const summary = prioritySummary(allItems);
  const items = filteredPriorityItems(allItems);
  const nextItem = items.find(({ action }) => !["complete", "waiting"].includes(action));
  const groupOptions = priorityGroups.map((group) => (
    `<option value="${escapeHtml(group.key)}" ${filters.priorityGroup === group.key ? "selected" : ""}>${escapeHtml(group.code)} · ${escapeHtml(group.label)}</option>`
  )).join("");

  viewRoot.innerHTML = `
    ${pageHeader(
      "고연전 작업 순서",
      "행사 중요도와 현재 작업 상태를 함께 계산해, 지금 ChatGPT와 처리할 일부터 보여줘요.",
      `<button type="button" class="button button-primary" data-copy-priority-next ${nextItem ? "" : "disabled"}>${icons.copy}다음 요청 복사</button>`,
    )}
    <section class="priority-hero">
      <div class="priority-hero-copy">
        <span class="priority-dashboard-eyebrow">${escapeHtml(database.priorityPlan?.label ?? "2026 정기 고연전")}</span>
        <h2>필수 암기부터 공개하고, 곡마다 같은 검수 루프를 반복합니다.</h2>
        <p>등급은 P0 필수 암기 → P1 라이벌전 → P2 추억곡 → P3 원곡 계보 → P4 야구장 연결 → P5 양교 추가곡 순입니다. 같은 등급에서는 최종 확인만 남은 곡을 먼저 배치했어요.</p>
      </div>
      <ol class="priority-workflow" aria-label="권장 작업 흐름">
        <li><span>1</span><div><strong>ChatGPT 작업</strong><small>요청문을 복사해 조사·편집·QA 진행</small></div></li>
        <li><span>2</span><div><strong>사용자 확인</strong><small>영상, 가사, 상징문구, 불확실성 검토</small></div></li>
        <li><span>3</span><div><strong>로컬 공개</strong><small>승인 뒤 공개·재공개로 테스트 사이트 반영</small></div></li>
      </ol>
    </section>
    <section class="priority-metric-grid" aria-label="고연전 작업 현황">
      ${priorityMetric("남은 작업", summary.remaining, "전체 우선순위 큐")}
      ${priorityMetric("사용자 최종 확인", summary.finalReview, "곧 공개할 수 있는 항목")}
      ${priorityMetric("ChatGPT와 진행", summary.aiReady, "조사·편집·QA·계보 보강")}
      ${priorityMetric("Admin 미등록", summary.missing, "먼저 새 레코드가 필요한 곡")}
      ${priorityMetric("완료", summary.complete, "현재 공개본과 일치")}
    </section>
    <section class="data-card priority-data-card">
      <div class="table-toolbar priority-toolbar">
        <div class="toolbar-group">
          <select id="priority-side-filter" class="filter-select" aria-label="학교 필터">
            <option value="all">양교·연결곡 전체</option>
            <option value="yonsei" ${filters.prioritySide === "yonsei" ? "selected" : ""}>연세 기준</option>
            <option value="korea" ${filters.prioritySide === "korea" ? "selected" : ""}>고려 기준</option>
          </select>
          <select id="priority-group-filter" class="filter-select" aria-label="우선순위 그룹 필터"><option value="all">모든 우선순위</option>${groupOptions}</select>
          <select id="priority-status-filter" class="filter-select" aria-label="담당 작업 필터">
            <option value="remaining" ${filters.priorityStatus === "remaining" ? "selected" : ""}>남은 작업</option>
            <option value="chatgpt" ${filters.priorityStatus === "chatgpt" ? "selected" : ""}>ChatGPT 작업</option>
            <option value="user" ${filters.priorityStatus === "user" ? "selected" : ""}>내가 확인할 작업</option>
            <option value="waiting" ${filters.priorityStatus === "waiting" ? "selected" : ""}>AI 진행 중</option>
            <option value="complete" ${filters.priorityStatus === "complete" ? "selected" : ""}>완료</option>
            <option value="all" ${filters.priorityStatus === "all" ? "selected" : ""}>완료 포함 전체</option>
          </select>
        </div>
        <span class="table-result">${items.length}개 표시 · 전체 ${allItems.length}개</span>
      </div>
      <ol class="priority-list">
        ${items.map((item) => priorityItemCard(item)).join("") || `<li>${emptySmall("조건에 맞는 작업이 없어요")}</li>`}
      </ol>
    </section>`;
}

function priorityMetric(label, value, detail) {
  return `<article class="priority-metric"><span>${escapeHtml(label)}</span><strong>${Number(value).toLocaleString("ko-KR")}</strong><small>${escapeHtml(detail)}</small></article>`;
}

function priorityItemCard(item) {
  const detail = item.kind === "lineage"
    ? `${item.organizationName} · ${item.entityId}`
    : `${item.organizationName || item.organizationId || "소속 확인 필요"} · ${item.entityId}`;
  const editAction = item.kind === "song" && item.exists
    ? `<button type="button" class="button button-secondary" data-edit-song="${escapeHtml(item.entityId)}">편집 열기</button>`
    : item.kind === "song"
      ? `<button type="button" class="button button-secondary" data-create-priority-song="${escapeHtml(item.key)}">빈 레코드 추가</button>`
      : item.relatedSongIds?.[0]
        ? `<button type="button" class="button button-secondary" data-edit-song="${escapeHtml(item.relatedSongIds[0])}">연결곡 열기</button>`
        : "";
  const publishAction = item.action === "publish"
    ? `<button type="button" class="button button-primary" data-publish-song="${escapeHtml(item.entityId)}">${item.song?.publication?.status === "changes_pending" ? "재공개" : "공개"}</button>`
    : "";
  const promptAction = item.action === "complete"
    ? ""
    : `<button type="button" class="button button-ghost priority-copy-button" data-copy-priority-prompt="${escapeHtml(item.key)}">${icons.copy}ChatGPT 요청 복사</button>`;
  return `
    <li class="priority-item ${item.action === "complete" ? "is-complete" : ""}" data-priority-item="${escapeHtml(item.key)}">
      <div class="priority-rank"><strong>${item.rank}</strong><span>${escapeHtml(item.code)}</span></div>
      <div class="priority-item-main">
        <div class="priority-item-heading">
          <div class="priority-item-title">
            <div class="priority-item-pills"><span class="pill priority-code">${escapeHtml(item.groupLabel)}</span>${item.sideLabels.map((label) => `<span class="pill gray">${escapeHtml(label)}</span>`).join("")}<span class="pill ${escapeHtml(item.tone)}">${escapeHtml(item.actionLabel)}</span></div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(detail)}</p>
          </div>
          <div class="priority-item-actions">${promptAction}${editAction}${publishAction}</div>
        </div>
        <div class="priority-task-grid">
          <article><span class="priority-task-owner is-ai">ChatGPT</span><p>${escapeHtml(item.chatgptTask)}</p></article>
          <article><span class="priority-task-owner is-user">나</span><p>${escapeHtml(item.userTask)}</p></article>
        </div>
        ${item.gaps.length ? `<div class="priority-gaps"><span>확인 항목</span>${item.gaps.map((gap) => `<small>${escapeHtml(gap)}</small>`).join("")}</div>` : ""}
      </div>
    </li>`;
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
      "검수를 마친 revision을 공개하면 로컬 사이트용 릴리스와 카탈로그가 함께 갱신돼요.",
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
        <table class="data-table song-data-table" style="--song-title-column-width:${songTitleColumnWidth}px">
          <colgroup><col class="song-select-column"><col class="song-title-column"><col class="song-organization-column"><col class="song-scope-column"><col class="song-stage-column"><col class="song-publication-column"><col class="song-job-column"><col class="song-video-column"><col class="song-updated-column"><col class="song-actions-column"></colgroup>
          <thead><tr><th><input id="song-select-visible" class="selection-checkbox" type="checkbox" aria-label="현재 표시된 응원가 모두 선택" /></th><th class="song-title-header"><span>응원가</span><button type="button" class="column-resizer" data-song-title-resizer aria-label="응원가 제목 열 너비 조절" aria-valuemin="${SONG_TITLE_COLUMN_MIN_WIDTH}" aria-valuemax="${SONG_TITLE_COLUMN_MAX_WIDTH}" aria-valuenow="${songTitleColumnWidth}" title="드래그해 제목 열 너비 조절 · 더블클릭해 초기화"></button></th><th>대학·구단</th><th>조사 범위</th><th>작업 라벨</th><th>사이트 공개</th><th>AI 작업</th><th>영상</th><th>최근 수정</th><th><span class="sr-only">작업</span></th></tr></thead>
          <tbody id="song-table-body">
            ${database.songs.map((song) => songRow(song)).join("")}
            <tr id="song-empty-row" hidden><td colspan="10"><div class="empty-table"><span class="empty-table-icon">♪</span><strong>조건에 맞는 응원가가 없어요</strong><p>필터를 바꾸거나 새 응원가를 추가해 보세요.</p></div></td></tr>
          </tbody>
        </table>
      </div>
    </section>`;
  applySongFilters();
  attachSongTitleColumnResizer();
}

function songRow(song) {
  const organization = organizationById(song.organizationId);
  const scopeColor = { target: "blue", deferred: "gray", discovered_pending: "purple", rejected: "red" }[song.scopeStatus];
  const latestJob = latestJobForSong(song.id);
  const jobStatus = latestJob?.status ?? "none";
  const jobColor = { queued: "orange", running: "blue", completed: "green", stale: "red", none: "gray" }[jobStatus];
  const publication = publicationCell(song);
  return `
    <tr class="row-clickable ${selectedSongIds.has(song.id) ? "is-selected" : ""}" data-song-row="${escapeHtml(song.id)}" tabindex="0">
      <td><input class="selection-checkbox" data-select-song="${escapeHtml(song.id)}" type="checkbox" aria-label="${escapeHtml(song.title)} 선택" ${selectedSongIds.has(song.id) ? "checked" : ""} /></td>
      <td><div class="entity-primary song-title-primary"><div class="entity-primary-copy"><strong>${escapeHtml(song.title)}</strong><small>${escapeHtml(song.aliases?.join(", ") || song.id)}</small></div></div></td>
      <td><div class="entity-primary">${organization ? organizationAvatar(organization, "entity-avatar") : ""}<div class="entity-primary-copy"><strong>${escapeHtml(organization?.name ?? "알 수 없음")}</strong><small>${escapeHtml(organization?.abbreviation ?? song.organizationId)}</small></div></div></td>
      <td><span class="pill ${scopeColor}">${escapeHtml(SCOPE_LABELS[song.scopeStatus])}</span></td>
      <td><select class="inline-stage-select" data-inline-song-stage="${escapeHtml(song.id)}" aria-label="${escapeHtml(song.title)} 작업 라벨">${selectOptions(STAGE_LABELS, song.workflowStage)}</select></td>
      <td>${publication}</td>
      <td><span class="pill ${jobColor}">${escapeHtml(JOB_STATUS_LABELS[jobStatus])}</span></td>
      <td>${song.videos?.length ? `<strong>${song.videos.length}개</strong>` : "미등록"}</td>
      <td><div class="stage-cell"><span>${escapeHtml(formatDate(song.updatedAt))}</span><small>rev ${song.revision}</small></div></td>
      <td><div class="row-actions"><button type="button" class="table-action" data-edit-song="${escapeHtml(song.id)}" aria-label="${escapeHtml(song.title)} 수정">${icons.edit}</button><button type="button" class="table-action is-danger" data-delete-song="${escapeHtml(song.id)}" aria-label="${escapeHtml(song.title)} 삭제">${icons.trash}</button></div></td>
    </tr>`;
}

function publicationCell(song) {
  const status = song.publication?.status ?? "unpublished";
  const color = { unpublished: "gray", current: "green", changes_pending: "orange" }[status] ?? "gray";
  const action = status === "changes_pending"
    ? `<button type="button" class="publication-action" data-publish-song="${escapeHtml(song.id)}">재공개</button>`
    : "";
  return `<div class="publication-cell"><span class="pill ${color}">${escapeHtml(PUBLICATION_LABELS[status] ?? status)}</span>${action}</div>`;
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

async function publishSongIds(ids, { confirm = true, reopenDrawer = false } = {}) {
  const songs = ids.map(songById).filter(Boolean);
  if (songs.length === 0 || busy) return false;
  if (confirm) {
    const confirmed = await askConfirm({
      title: songs.length === 1 ? `${songs[0].title}을 사이트에 공개할까요?` : `${songs.length}곡을 사이트에 공개할까요?`,
      message: "현재 revision으로 불변 릴리스를 만들고 로컬 테스트 사이트의 공개 카탈로그를 갱신합니다. 운영 배포는 실행하지 않습니다.",
      confirmLabel: songs.some((song) => song.publication?.status === "changes_pending") ? "수정본 공개" : "사이트에 공개",
      danger: false,
    });
    if (!confirmed) return false;
  }
  setBusy(true, "사이트 데이터 반영 중");
  try {
    const result = await api("/api/songs/bulk?action=publish", {
      method: "POST",
      body: { items: songs.map(({ id, revision }) => ({ id, expectedRevision: revision })) },
    });
    await loadState({ render: !reopenDrawer });
    if (reopenDrawer && songs.length === 1) openSongDrawer(songs[0].id);
    toast(`${songs.length}곡을 로컬 사이트에 반영했어요. · ${result.release.releaseId}`);
    return true;
  } catch (error) {
    showError(error);
    return false;
  } finally {
    setBusy(false);
  }
}

async function unpublishSongIds(ids, { reopenDrawer = false } = {}) {
  const songs = ids.map(songById).filter(Boolean);
  if (songs.length === 0 || busy) return false;
  const confirmed = await askConfirm({
    title: songs.length === 1 ? `${songs[0].title}의 공개를 내릴까요?` : `${songs.length}곡의 공개를 내릴까요?`,
    message: "새 로컬 릴리스에서 선택한 곡을 제외합니다. 이전 릴리스 파일은 기록으로 남고 운영 배포는 실행하지 않습니다.",
    confirmLabel: "공개 내리기",
    danger: true,
  });
  if (!confirmed) return false;
  setBusy(true, "공개 내리는 중");
  try {
    const result = await api("/api/songs/bulk?action=unpublish", {
      method: "POST",
      body: { items: songs.map(({ id, revision }) => ({ id, expectedRevision: revision })) },
    });
    await loadState({ render: !reopenDrawer });
    if (reopenDrawer && songs.length === 1) openSongDrawer(songs[0].id);
    toast(`${songs.length}곡을 로컬 사이트에서 내렸어요. · ${result.release.releaseId}`);
    return true;
  } catch (error) {
    showError(error);
    return false;
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

function openSongDrawer(id = null, defaultOrganizationId = null, seed = null) {
  const song = id ? songById(id) : null;
  const organizationId = song?.organizationId ?? defaultOrganizationId ?? (filters.songOrganization !== "all" ? filters.songOrganization : database.organizations[0]?.id);
  drawerOpener = document.activeElement;
  drawerState = {
    type: "song",
    mode: song ? "edit" : "create",
    id,
    dirty: false,
    revision: song?.revision ?? null,
    initialWorkflowStage: song?.workflowStage ?? null,
    draftKey: `cheers-song-draft:${song?.id ?? seed?.id ?? `new-${organizationId}`}`,
    nextSongId: nextEditableSongId(id),
  };
  drawerEyebrow.textContent = song ? "CHEER SONG ROW" : "NEW CHEER SONG";
  drawerTitle.textContent = song ? song.title : "응원가 추가";
  drawerSubtitle.textContent = song ? `${song.id} · revision ${song.revision}` : "새 응원가 행을 만들어요";
  deleteEntityButton.hidden = !song;
  drawerBody.innerHTML = songForm(song, organizationId, seed);
  setupSongEditor(song ? "description" : "settings");
  showDrawer();
  offerSongDraft();
}

function songForm(song, organizationId, seed = null) {
  const existing = Boolean(song && drawerState?.mode !== "create");
  const value = song ?? {
    id: seed?.id ?? "",
    organizationId,
    discoveredBy: "user",
    scopeStatus: "target",
    workflowStage: "listed",
    title: seed?.title ?? "",
    aliases: [],
    symbolicLines: ["", ""],
    descriptionText: "",
    descriptionStatus: "draft",
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
        <label class="field field-wide"><span>데이터 ID <small>생성 후 변경할 수 없음</small></span><input name="id" value="${escapeHtml(value.id)}" ${existing ? "readonly" : 'placeholder="비워두면 자동 생성" pattern="[a-z0-9]+(?:-[a-z0-9]+)*"'} /></label>
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
    ${existing ? publicationSection(value) : ""}
    <section class="form-section">
      <header class="form-section-header"><div><h3>원곡·응원가 관계</h3><p>ID 기준으로 원곡 계보를 연결해요. 비워둘 수 있어요.</p></div></header>
      <div class="form-grid">
        <label class="field field-wide"><span>대표 원곡 ID</span><input name="originalSongId" value="${escapeHtml(relationship("original-song")[0] ?? "")}" placeholder="original-song-id" /></label>
        <label class="field"><span>보조 원곡 ID <small>쉼표로 구분</small></span><input name="secondaryOriginalSongIds" value="${escapeHtml(relationship("secondary-original-song").join(", "))}" /></label>
        <label class="field"><span>원본 응원가 ID</span><input name="sourceCheerSongId" value="${escapeHtml(relationship("source-cheer-song")[0] ?? "")}" /></label>
      </div>
    </section>
    <section class="form-section" data-song-panel="description">
      <header class="form-section-header"><div><h3>소개·사용 맥락·TMI</h3><p>출처 없이 작성할 수 있고, 필요할 때만 <code>[* 주석]</code>을 넣어요.</p></div><button type="button" class="button button-ghost" data-insert-note>[* 주석] 넣기</button></header>
      <label class="field description-status-field"><span>본문 상태 <small>초안은 곡을 공개해도 사이트에 본문이 보이지 않아요</small></span><select name="descriptionStatus">${selectOptions(DESCRIPTION_STATUS_LABELS, value.descriptionStatus ?? "draft")}</select></label>
      <label class="field"><span>공개 본문</span><textarea id="description-input" name="descriptionText" rows="14" maxlength="60000" placeholder="AI 초안을 검수하고 자유롭게 고치는 공간">${escapeHtml(value.descriptionText)}</textarea><p class="field-help">예: 흥미로운 이야기.[* 원문 출처: https://example.com]</p></label>
    </section>
    ${existing ? researchSection(value, latestJob) : ""}
    <section class="form-section" data-song-panel="lyrics">
      <header class="form-section-header"><div><h3>가사</h3><p>한 줄씩 입력해요. 공개 화면에서는 처음 두 줄만 먼저 보여요.</p></div></header>
      <label class="field"><span>전체 가사</span><textarea name="lyrics" rows="9">${escapeHtml(value.lyrics?.lines?.join("\n") ?? "")}</textarea></label>
    </section>
    <section class="form-section">
      <header class="form-section-header"><div><h3>간단 정보</h3><p>세 항목까지 표시해요. 첫 라벨은 사용 시작으로 고정돼요.</p></div></header>
      <div class="fact-editor-grid">${Array.from({ length: 3 }, (_, index) => factRow(value.quickFacts?.[index], index)).join("")}</div>
    </section>
    <section class="form-section" data-song-panel="videos">
      <header class="form-section-header"><div><h3>대표 영상</h3><p>떼창과 분위기가 잘 드러나는 영상 하나를 골라 주세요. 추가 영상은 선택이에요.</p></div></header>
      <div class="video-editor-list">${Array.from({ length: Math.max(1, ...(value.videos ?? []).map((video) => video.rank)) }, (_, index) => videoSlot(value.videos?.find((video) => video.rank === index + 1), index)).join("")}</div>
      <button type="button" class="button button-secondary add-song-video" data-add-song-video>추가 영상 넣기</button>
    </section>`;
}

function publicationSection(song) {
  const status = song.publication?.status ?? "unpublished";
  const isPublic = status !== "unpublished";
  const statusCopy = {
    unpublished: "아직 로컬 사이트 카탈로그에 포함되지 않았어요.",
    current: "현재 편집 내용과 로컬 사이트에 반영된 내용이 같아요.",
    changes_pending: "공개한 뒤 수정된 내용이 있어요. 사이트에는 이전 공개본이 유지되고 있어요.",
  }[status];
  const publishLabel = status === "changes_pending" ? "수정본 재공개" : "사이트에 공개";
  return `
    <section class="form-section publication-panel">
      <header class="form-section-header">
        <div><h3>사이트 공개</h3><p>${escapeHtml(statusCopy)}</p></div>
        <span class="pill ${{ unpublished: "gray", current: "green", changes_pending: "orange" }[status]}">${escapeHtml(PUBLICATION_LABELS[status])}</span>
      </header>
      <div class="publication-panel-actions">
        ${status !== "current" ? `<button type="button" class="button button-primary" data-publish-drawer-song>${icons.upload}${escapeHtml(publishLabel)}</button>` : ""}
        ${isPublic ? `<button type="button" class="button button-secondary" data-unpublish-drawer-song>공개 내리기</button>` : ""}
        <small>이 동작은 로컬 릴리스와 사이트 데이터만 갱신하며 운영 배포는 실행하지 않아요.</small>
      </div>
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
    <details class="video-editor-slot" data-video-slot="${rank}" data-source-id="${escapeHtml(extractYouTubeVideoId(video.sourceUrl) ?? "")}" ${rank === 1 ? "open" : ""}>
      <summary><span class="video-slot-title"><span class="video-rank">${rank}</span>${escapeHtml(VIDEO_LABELS[index])}</span><span class="video-slot-status">${video.videoId ? "영상 입력됨" : "비어 있음"}</span></summary>
      <div class="video-slot-fields">
        <label class="field field-wide"><span>YouTube URL</span><input data-video-field="sourceUrl" value="${escapeHtml(video.sourceUrl ?? "")}" placeholder="YouTube 링크를 붙여 넣으면 정보를 불러와요" /></label>
        <div class="field-wide video-lookup-row"><span data-video-message role="status"></span><button type="button" class="button button-ghost" data-fetch-video>정보 불러오기</button></div>
        <div class="field-wide" data-video-preview></div>
        <label class="field"><span>영상 제목</span><input data-video-field="title" value="${escapeHtml(video.title ?? "")}" /></label>
        <label class="field"><span>채널명</span><input data-video-field="channelName" value="${escapeHtml(video.channelName ?? "")}" /></label>
        <label class="field field-wide"><span>공개 출처 문구 <small>선택</small></span><input data-video-field="attributionText" value="${escapeHtml(video.attributionText ?? "")}" /></label>
      </div>
    </details>`;
}

function nextEditableSongId(id) {
  const ids = currentView === "priorities"
    ? filteredPriorityItems(buildPriorityItems(database)).filter((item) => item.kind === "song" && item.exists).map((item) => item.entityId)
    : [...viewRoot.querySelectorAll("[data-song-row]")].filter((row) => !row.hidden).map((row) => row.dataset.songRow);
  const unique = [...new Set(ids)];
  const index = unique.indexOf(id);
  return index >= 0 ? unique[index + 1] ?? null : null;
}

function setupSongEditor(tab) {
  const settings = document.createElement("div");
  settings.dataset.songPanel = "settings";
  [...drawerBody.children].filter((section) => !section.dataset.songPanel).forEach((section) => settings.append(section));
  drawerBody.append(settings);
  drawerBody.insertAdjacentHTML("afterbegin", `
    <div class="song-editor-tabs" role="tablist" aria-label="응원가 편집 항목">
      ${[["description", "설명"], ["lyrics", "가사"], ["videos", "영상"], ["settings", "기본·관리"]].map(([key, label]) => `<button type="button" id="song-tab-${key}" role="tab" data-song-tab="${key}" aria-controls="song-panel-${key}">${label}</button>`).join("")}
    </div>
    <div id="song-draft-notice" class="song-draft-notice" hidden></div>
    <p id="song-draft-status" class="song-draft-status" role="status">붙여 넣은 원고를 그대로 저장해요.</p>`);
  for (const panel of drawerBody.querySelectorAll("[data-song-panel]")) {
    panel.id = `song-panel-${panel.dataset.songPanel}`;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", `song-tab-${panel.dataset.songPanel}`);
  }
  for (const kind of ["description", "lyrics"]) {
    drawerBody.querySelector(`[data-song-panel="${kind}"]`).insertAdjacentHTML("beforeend", `<details class="editor-preview"><summary>공개 화면 미리보기</summary><div class="editor-reading" data-text-preview="${kind}"></div></details>`);
  }
  setSongTab(tab);
  updateSongPreviews();
  drawerBody.querySelectorAll("[data-video-slot]").forEach(updateVideoPreview);
  updateAddVideoButton();
}

function setSongTab(tab, focus = false) {
  if (!drawerBody.querySelector(`[data-song-tab="${tab}"]`)) return;
  drawerState.tab = tab;
  drawerBody.querySelectorAll("[data-song-tab]").forEach((button) => {
    const selected = button.dataset.songTab === tab;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (selected && focus) button.focus();
  });
  drawerBody.querySelectorAll("[data-song-panel]").forEach((panel) => { panel.hidden = panel.dataset.songPanel !== tab; });
  drawerBody.scrollTop = 0;
}

function updateSongPreviews() {
  const description = entityForm.elements.namedItem("descriptionText");
  const lyrics = entityForm.elements.namedItem("lyrics");
  if (description) drawerBody.querySelector('[data-text-preview="description"]').innerHTML = descriptionPreview(description.value);
  if (lyrics) drawerBody.querySelector('[data-text-preview="lyrics"]').innerHTML = lyricsPreview(lyrics.value);
}

function currentSongDraft() {
  try { return readSongDraft(window.localStorage, drawerState.draftKey); } catch { return null; }
}

function offerSongDraft() {
  const draft = currentSongDraft();
  if (!draft) return;
  drawerState.pendingDraft = draft;
  const restorable = canRestoreSongDraft(draft, drawerState.revision);
  const notice = drawerBody.querySelector("#song-draft-notice");
  notice.hidden = false;
  notice.innerHTML = `<div><strong>저장하지 않은 임시본이 있어요.</strong><p>${restorable ? "이 브라우저에서 작성하던 내용을 이어갈 수 있어요." : "그동안 저장된 곡이 변경됐어요. 이전 임시본에서 필요한 내용을 복사해 주세요."}</p></div><div class="draft-actions">${restorable ? '<button type="button" class="button button-secondary" data-restore-song-draft>이어서 편집</button>' : ""}<button type="button" class="button button-ghost" data-view-song-draft>임시본 보기</button><button type="button" class="button button-ghost" data-discard-song-draft>임시본 지우기</button></div><label class="field draft-source" hidden><span>이전 작업 내용</span><textarea rows="14" readonly>${escapeHtml(draftText(draft))}</textarea></label>`;
}

function persistSongDraft() {
  window.clearTimeout(draftTimer);
  if (drawerState?.type !== "song" || !drawerState.dirty || drawerState.pendingDraft) return false;
  const status = drawerBody.querySelector("#song-draft-status");
  try {
    window.localStorage.setItem(drawerState.draftKey, JSON.stringify({
      version: 1, revision: drawerState.revision, savedAt: new Date().toISOString(), tab: drawerState.tab, form: captureSong(),
    }));
    status.textContent = "이 브라우저에 임시 보관됨 · 곡에 반영하려면 저장해 주세요.";
    return true;
  } catch {
    status.textContent = "브라우저에 임시 보관하지 못했어요. 창을 닫기 전에 저장해 주세요.";
    return false;
  }
}

function clearSongDraft() {
  window.clearTimeout(draftTimer);
  try { window.localStorage.removeItem(drawerState.draftKey); } catch { /* Saving still works without local storage. */ }
  drawerState.pendingDraft = null;
  const notice = drawerBody.querySelector("#song-draft-notice");
  if (notice) notice.hidden = true;
}

function restoreSongDraft() {
  const draft = drawerState.pendingDraft;
  if (!canRestoreSongDraft(draft, drawerState.revision)) return;
  const song = songById(drawerState.id);
  drawerBody.innerHTML = songForm({ ...song, ...draft.form }, draft.form.organizationId);
  drawerState.pendingDraft = null;
  drawerState.dirty = true;
  setupSongEditor(draft.tab ?? "description");
  persistSongDraft();
}

function updateAddVideoButton() {
  const button = drawerBody.querySelector("[data-add-song-video]");
  if (button) button.hidden = drawerBody.querySelectorAll("[data-video-slot]").length >= 5;
}

function updateVideoPreview(slot) {
  const url = slot.querySelector('[data-video-field="sourceUrl"]').value.trim();
  const id = extractYouTubeVideoId(url);
  const preview = slot.querySelector("[data-video-preview]");
  slot.querySelector(".video-slot-status").textContent = id ? "영상 입력됨" : "비어 있음";
  if (!id) { preview.innerHTML = ""; return; }
  preview.innerHTML = `<div class="song-video-card"><button type="button" class="song-video-play" data-play-song-video aria-label="선택한 영상 재생"><img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="선택한 영상 썸네일" loading="lazy" /><span>▶ 재생</span></button><a href="https://www.youtube.com/watch?v=${id}&t=${youtubeStartSeconds(url)}s" target="_blank" rel="noreferrer">YouTube에서 확인 ↗</a></div>`;
}

function queueVideoMetadata(slot) {
  window.clearTimeout(videoTimers.get(slot));
  const sourceUrl = slot.querySelector('[data-video-field="sourceUrl"]').value.trim();
  const id = extractYouTubeVideoId(sourceUrl);
  // Invalidating the token also prevents an older request from filling a new URL.
  slot.requestToken = {};
  if (id && slot.dataset.sourceId && slot.dataset.sourceId !== id) {
    for (const name of ["title", "channelName", "attributionText"]) slot.querySelector(`[data-video-field="${name}"]`).value = "";
  }
  if (id) slot.dataset.sourceId = id;
  slot.dataset.lookupNeeded = id ? "true" : "false";
  slot.querySelector("[data-video-message]").textContent = sourceUrl && !id ? "YouTube 영상 주소를 확인해 주세요." : "";
  updateVideoPreview(slot);
  if (id) videoTimers.set(slot, window.setTimeout(() => lookupVideoMetadata(slot), 500));
}

function lookupVideoMetadata(slot) {
  window.clearTimeout(videoTimers.get(slot));
  if (!slot.isConnected || drawerState?.type !== "song") return Promise.resolve();
  const url = slot.querySelector('[data-video-field="sourceUrl"]').value.trim();
  const id = extractYouTubeVideoId(url);
  if (!id) return Promise.resolve();
  const session = drawerState;
  const token = {};
  slot.requestToken = token;
  slot.dataset.lookupNeeded = "false";
  const message = slot.querySelector("[data-video-message]");
  message.textContent = "영상 정보를 불러오는 중…";
  const fields = ["title", "channelName"].map((name) => ({ name, input: slot.querySelector(`[data-video-field="${name}"]`) }));
  const task = (async () => {
    try {
      const metadata = await api(`/api/youtube-metadata?url=${encodeURIComponent(url)}`);
      if (!slot.isConnected || drawerState !== session || slot.requestToken !== token) return;
      for (const { name, input } of fields) if (!input.value.trim()) input.value = metadata[name];
      message.textContent = "영상 정보를 불러왔어요. 제목과 채널명은 수정할 수 있어요.";
      drawerState.dirty = true;
      persistSongDraft();
    } catch (error) {
      if (slot.isConnected && drawerState === session && slot.requestToken === token) message.textContent = error.message;
    }
  })();
  videoRequests.add(task);
  task.finally(() => videoRequests.delete(task));
  return task;
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
  const isSong = drawerState?.type === "song";
  drawerLayer.classList.toggle("is-song-editor", isSong);
  saveNextSongButton.hidden = !isSong;
  saveNextSongButton.disabled = busy || !drawerState?.nextSongId;
  saveNextSongButton.title = drawerState?.nextSongId ? `다음: ${songById(drawerState.nextSongId)?.title ?? ""}` : "현재 목록의 마지막 곡이에요";
  saveEntityButton.textContent = isSong ? "저장하고 계속" : "저장";
  cancelEntityButton.textContent = isSong ? "닫기" : "취소";
  setDrawerExpanded(false);
  drawerLayer.hidden = false;
  document.body.style.overflow = "hidden";
  window.setTimeout(() => [...drawerBody.querySelectorAll("input:not([readonly]), select, textarea")].find((field) => field.getClientRects().length > 0)?.focus(), 30);
}

async function attemptCloseDrawer() {
  if (!drawerState || busy) return;
  if (drawerState.type === "song" && drawerState.dirty && persistSongDraft()) {
    closeDrawer();
    return;
  }
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
  window.clearTimeout(draftTimer);
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
    descriptionStatus: String(formData.get("descriptionStatus") ?? "draft"),
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

async function saveDrawerEntity({ next = false } = {}) {
  if (!drawerState || busy) return;
  const isSong = drawerState.type === "song";
  const nextSongId = drawerState.nextSongId;
  const tab = drawerState.tab;
  const expanded = drawerLayer.classList.contains("is-expanded");
  let savedSongId;
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
      for (const slot of drawerBody.querySelectorAll('[data-video-slot][data-lookup-needed="true"]')) lookupVideoMetadata(slot);
      await Promise.allSettled([...videoRequests]);
      const song = captureSong();
      let savedSong;
      if (drawerState.mode === "create") {
        const result = await api("/api/songs", { method: "POST", body: { song } });
        savedSong = result.song;
        toast("새 응원가를 추가했어요.");
      } else {
        const result = await api(`/api/songs/${encodeURIComponent(drawerState.id)}`, {
          method: "PUT",
          body: { song, expectedRevision: drawerState.revision },
        });
        savedSong = result.song;
        toast("응원가 정보를 저장했어요.");
      }
      savedSongId = savedSong.id;
      drawerState.revision = savedSong.revision;
      const newlyMarkedPublic = song.workflowStage === "published"
        && (drawerState.mode === "create" || drawerState.initialWorkflowStage !== "published");
      if (newlyMarkedPublic) {
        const result = await api("/api/songs/bulk?action=publish", {
          method: "POST",
          body: { items: [{ id: savedSong.id, expectedRevision: savedSong.revision }] },
        });
        toast(`로컬 사이트에도 반영했어요. · ${result.release.releaseId}`);
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
    if (isSong && !drawerState.pendingDraft) clearSongDraft();
    drawerState.dirty = false;
    if (isSong) {
      await loadState();
      openSongDrawer(next && nextSongId && songById(nextSongId) ? nextSongId : savedSongId);
      if (!next) setSongTab(tab);
      setDrawerExpanded(expanded);
      drawerBody.querySelector("#song-draft-status").textContent = next ? "다음 곡을 편집하고 있어요." : "저장 완료 · 계속 편집할 수 있어요.";
    } else {
      closeDrawer();
      await loadState();
    }
  } catch (error) {
    showError(error);
  } finally {
    saveEntityButton.textContent = drawerState?.type === "song" ? "저장하고 계속" : "저장";
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
  if (workflowStage === "published") {
    const published = await publishSongIds([id]);
    if (!published) select.value = song.workflowStage;
    return;
  }
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

// ─── 작업 모드: 같은 종류의 작업을 곡마다 이어서 처리한다 ───

const HINT_SOURCE_LABELS = { chapter: "챕터", description: "설명란", comment: "댓글" };
const YOUTUBE_EMBED_ORIGIN = "https://www.youtube-nocookie.com";
const workbench = {
  mode: "videos",
  songId: null,
  includeDone: false,
  candidates: new Map(),
  selection: null,
  starts: new Map(),
  playerTimes: new Map(),
  lyrics: null,
  polishSelected: null,
  polishText: "",
  polishParsed: null,
  publishSelected: new Set(),
  publishShowAll: false,
};

function workbenchDirty() {
  return Boolean(workbench.selection?.dirty || workbench.lyrics?.dirty);
}

async function confirmDiscardWorkbench() {
  if (!workbenchDirty()) return true;
  const confirmed = await askConfirm({
    title: "저장하지 않은 작업을 버릴까요?",
    message: "현재 곡에서 고른 영상이나 입력한 가사가 저장되지 않았어요.",
    confirmLabel: "버리고 이동",
    danger: false,
  });
  if (confirmed) {
    workbench.selection = null;
    workbench.lyrics = null;
  }
  return confirmed;
}

function currentWorkQueue() {
  const includeDone = workbench.includeDone && ["videos", "lyrics"].includes(workbench.mode);
  return workQueue(database, workbench.mode, { includeDone });
}

function currentWorkSong(queue) {
  const pinned = workbench.songId ? songById(workbench.songId) : null;
  if (pinned) return pinned;
  const first = queue[0] ?? null;
  workbench.songId = first?.id ?? null;
  return first;
}

function nextWorkSongId(queue, id) {
  const index = queue.findIndex((song) => song.id === id);
  return queue.slice(index + 1).concat(queue.slice(0, Math.max(0, index))).find((song) => song.id !== id)?.id ?? null;
}

function renderWorkbenchView() {
  const summary = workSummary(database);
  const queue = currentWorkQueue();
  const body = {
    videos: () => workSplitLayout(queue, renderVideoWorkPanel),
    lyrics: () => workSplitLayout(queue, renderLyricsWorkPanel),
    polish: () => renderPolishMode(queue),
    publish: () => renderPublishMode(),
  }[workbench.mode]();
  viewRoot.innerHTML = `
    ${pageHeader("작업 모드", "같은 종류의 작업을 곡마다 이어서 처리해요. 영상·가사가 채워진 곡부터 공개하고, 본문은 다듬은 뒤 재공개해요.")}
    <div class="work-mode-tabs" role="tablist" aria-label="작업 종류">
      ${Object.entries(WORK_MODES).map(([mode, label]) => `<button type="button" role="tab" class="work-mode-tab" aria-selected="${mode === workbench.mode}" data-work-mode="${mode}"><span>${escapeHtml(label)}</span><strong>${summary[mode]}</strong></button>`).join("")}
    </div>
    ${body}`;
  if (workbench.mode === "lyrics") updateWorkLyricsPreview();
}

function workSplitLayout(queue, renderPanel) {
  const song = currentWorkSong(queue);
  const doneLabel = workbench.mode === "videos" ? "영상 있는 곡도 보기" : "가사 있는 곡도 보기";
  return `
    <div class="work-layout">
      <aside class="work-queue data-card" aria-label="작업할 곡">
        <div class="work-queue-header">
          <strong>${queue.length}곡</strong>
          <label class="work-toggle"><input type="checkbox" data-work-include-done ${workbench.includeDone ? "checked" : ""} />${doneLabel}</label>
        </div>
        ${workbench.mode === "videos" ? `<button type="button" class="button button-secondary work-queue-bulk" data-collect-missing-candidates>후보 없는 곡 모두 수집</button>` : ""}
        <ol class="work-queue-list">
          ${queue.map((item) => workQueueItem(item, item.id === song?.id)).join("") || `<li>${emptySmall("남은 곡이 없어요")}</li>`}
        </ol>
      </aside>
      <section class="work-panel data-card">${song ? renderPanel(song) : emptySmall("작업할 곡을 골라 주세요")}</section>
    </div>`;
}

function workQueueItem(song, active) {
  const organization = organizationById(song.organizationId);
  let badge = "";
  if (workbench.mode === "videos") {
    const task = database.candidateTasks?.[song.id];
    const summary = database.videoCandidates?.[song.id];
    badge = ["queued", "running"].includes(task?.status)
      ? `<span class="pill orange">수집 중</span>`
      : summary ? `<span class="pill blue">후보 ${summary.count}</span>` : `<span class="pill gray">후보 없음</span>`;
  } else {
    badge = songReadiness(song).hasVideo ? `<span class="pill green">영상</span>` : `<span class="pill gray">영상 없음</span>`;
  }
  return `<li><button type="button" class="work-queue-item ${active ? "is-active" : ""}" data-work-song="${escapeHtml(song.id)}" ${active ? 'aria-current="true"' : ""}>
    <span><strong>${escapeHtml(song.title)}</strong><small>${escapeHtml(organization?.name ?? song.organizationId)}</small></span>${badge}
  </button></li>`;
}

function workPanelHeader(song, actions = "") {
  const organization = organizationById(song.organizationId);
  return `<header class="work-panel-header">
    <div><span class="work-panel-eyebrow">${escapeHtml(organization?.name ?? song.organizationId)}</span><h2>${escapeHtml(song.title)}</h2>${song.aliases?.length ? `<p>${escapeHtml(song.aliases.join(" · "))}</p>` : ""}</div>
    <div class="work-panel-actions">${actions}<button type="button" class="button button-ghost" data-edit-song="${escapeHtml(song.id)}">전체 편집</button></div>
  </header>`;
}

function workSaveButtons() {
  return `<button type="button" class="button button-secondary" data-work-save>저장</button><button type="button" class="button button-primary" data-work-save-next>저장 후 다음 곡</button>`;
}

// 영상 고르기

function ensureVideoSelection(song) {
  const current = workbench.selection;
  if (current?.songId === song.id && (current.dirty || current.revision === song.revision)) return current;
  workbench.starts.clear();
  workbench.playerTimes.clear();
  workbench.selection = {
    songId: song.id,
    revision: song.revision,
    dirty: false,
    items: (song.videos ?? []).map((video) => ({
      videoId: video.videoId,
      title: video.title,
      channelName: video.channelName,
      attributionText: video.attributionText ?? "",
      startSeconds: youtubeStartSeconds(video.sourceUrl),
    })),
  };
  return workbench.selection;
}

async function loadCandidates(songId, { force = false } = {}) {
  if (!force && workbench.candidates.has(songId)) return;
  workbench.candidates.set(songId, "loading");
  try {
    const result = await api(`/api/songs/${encodeURIComponent(songId)}/video-candidates`);
    workbench.candidates.set(songId, result.candidates);
  } catch (error) {
    workbench.candidates.delete(songId);
    showError(error);
    return;
  }
  if (currentView === "workbench" && workbench.mode === "videos" && workbench.songId === songId) renderWorkbenchView();
}

function renderVideoWorkPanel(song) {
  const selection = ensureVideoSelection(song);
  const task = database.candidateTasks?.[song.id];
  const collecting = ["queued", "running"].includes(task?.status);
  const summary = database.videoCandidates?.[song.id];
  const candidates = workbench.candidates.get(song.id);
  if (candidates === undefined && summary) loadCandidates(song.id);
  const collectLabel = collecting ? `수집 중 · ${task.phase}` : summary ? "후보 다시 수집" : "영상 후보 수집";
  const taskNote = task?.status === "failed" ? `<p class="work-error" role="alert">${escapeHtml(task.error ?? "수집에 실패했어요.")}</p>` : "";
  const items = candidates && candidates !== "loading" ? candidates.items ?? [] : [];
  const selectedIds = new Set(selection.items.map(({ videoId }) => videoId));
  const extraSelected = selection.items.filter(({ videoId }) => !items.some((item) => item.videoId === videoId));

  let grid;
  if (candidates === "loading") grid = `<p class="field-help">후보를 불러오는 중…</p>`;
  else if (!summary && !collecting) grid = emptySmall("아직 수집한 후보가 없어요. ‘영상 후보 수집’을 누르면 10개를 모아 와요.");
  else if (collecting && !items.length) grid = `<p class="field-help">YouTube에서 후보를 찾고 있어요. 곡당 15초 정도 걸려요.</p>`;
  else grid = `<div class="candidate-grid">${items.map((item) => candidateCard(item, selection, selectedIds)).join("")}${extraSelected.map((item) => candidateCard({ ...item, startHints: [], manual: true }, selection, selectedIds)).join("")}</div>`;

  return `
    ${workPanelHeader(song, `<button type="button" class="button button-secondary" data-collect-candidates="${escapeHtml(song.id)}" ${collecting ? "disabled" : ""}>${icons.search}${escapeHtml(collectLabel)}</button>`)}
    ${taskNote}
    <section class="work-selection" aria-label="선택한 영상">
      <div class="work-selection-header">
        <div><h3>선택한 영상 ${selection.items.length}/5</h3><p>1번이 대표 영상이에요. 시작 초는 사이트에서도 그 지점부터 재생돼요.</p></div>
        <div class="work-selection-actions">${selection.dirty ? `<span class="pill orange">저장 안 됨</span>` : ""}${workSaveButtons()}</div>
      </div>
      <ol class="work-selection-list">
        ${selection.items.map((item, index) => `<li>
          <span class="video-rank">${index + 1}</span>
          <img src="https://i.ytimg.com/vi/${escapeHtml(item.videoId)}/mqdefault.jpg" alt="" loading="lazy" />
          <span class="work-selection-copy"><strong>${escapeHtml(item.title || item.videoId)}</strong><small>${index === 0 ? "대표" : "추가"} · ${escapeHtml(formatTimestamp(item.startSeconds))}부터</small></span>
          <span class="work-selection-controls">
            <button type="button" class="clip-icon-button" data-move-selected="-1" data-selected-index="${index}" aria-label="위로" ${index === 0 ? "disabled" : ""}>↑</button>
            <button type="button" class="clip-icon-button" data-move-selected="1" data-selected-index="${index}" aria-label="아래로" ${index === selection.items.length - 1 ? "disabled" : ""}>↓</button>
            <button type="button" class="clip-icon-button is-danger" data-remove-selected="${index}" aria-label="선택 해제">×</button>
          </span>
        </li>`).join("") || `<li class="work-selection-empty">아래 후보에서 영상을 골라 주세요.</li>`}
      </ol>
      <div class="work-manual-url">
        <input id="work-manual-url" type="url" placeholder="직접 찾은 YouTube URL 추가 (t= 시작 초 포함 가능)" aria-label="직접 찾은 YouTube URL" />
        <button type="button" class="button button-secondary" data-add-manual-video ${selection.items.length >= 5 ? "disabled" : ""}>추가</button>
      </div>
    </section>
    ${candidates && candidates !== "loading" ? `<p class="field-help work-candidate-meta">${escapeHtml(formatDate(candidates.collectedAt))} 수집 · 검색어 ${escapeHtml(candidates.queries?.join(" / ") ?? "")}${candidates.errors?.length ? ` · 오류 ${candidates.errors.length}건` : ""}</p>` : ""}
    ${grid}`;
}

function candidateStart(item, selection) {
  const selected = selection.items.find(({ videoId }) => videoId === item.videoId);
  return workbench.starts.get(item.videoId) ?? selected?.startSeconds ?? item.startHints?.[0]?.seconds ?? 0;
}

function candidateCard(item, selection, selectedIds) {
  const id = escapeHtml(item.videoId);
  const start = candidateStart(item, selection);
  const rank = selection.items.findIndex(({ videoId }) => videoId === item.videoId) + 1;
  const selected = selectedIds.has(item.videoId);
  const meta = [
    item.channelName,
    item.durationSeconds ? formatTimestamp(item.durationSeconds) : "",
    Number.isFinite(item.viewCount) ? `조회 ${Number(item.viewCount).toLocaleString("ko-KR")}` : "",
    item.uploadDate ? `${item.uploadDate.slice(0, 4)}.${item.uploadDate.slice(4, 6)}.${item.uploadDate.slice(6)}` : "",
  ].filter(Boolean).join(" · ");
  const hints = item.startHints ?? [];
  return `<article class="candidate-card ${selected ? "is-selected" : ""}" data-candidate="${id}">
    <div class="candidate-player" data-candidate-player="${id}">
      <button type="button" class="song-video-play" data-candidate-play="${id}" aria-label="${escapeHtml(item.title)} ${escapeHtml(formatTimestamp(start))}부터 재생"><img src="https://i.ytimg.com/vi/${id}/mqdefault.jpg" alt="" loading="lazy" /><span>▶ ${escapeHtml(formatTimestamp(start))}부터</span></button>
    </div>
    <div class="candidate-body">
      <a class="candidate-title" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noreferrer">${escapeHtml(item.title || item.videoId)}</a>
      <p class="candidate-meta">${escapeHtml(meta)}</p>
      ${item.matchedBy?.length || item.manual ? `<div class="candidate-chips">${item.manual ? `<span class="pill purple">직접 추가</span>` : ""}${(item.matchedBy ?? []).map((label) => `<span class="pill gray">${escapeHtml(label)}</span>`).join("")}</div>` : ""}
      <div class="candidate-start">
        <label><span>시작</span><input data-candidate-start="${id}" value="${escapeHtml(formatTimestamp(start))}" inputmode="numeric" aria-label="${escapeHtml(item.title)} 시작 시각" /></label>
        ${[-5, -1, 1, 5].map((delta) => `<button type="button" class="candidate-nudge" data-nudge="${delta}" data-nudge-video="${id}">${delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}</button>`).join("")}
        <button type="button" class="candidate-nudge is-wide" data-capture-time="${id}">현재 위치</button>
      </div>
      ${hints.length ? `<div class="candidate-hints"><span>단서</span>${hints.map((hint) => `<button type="button" data-hint-video="${id}" data-hint-seconds="${hint.seconds}" title="${escapeHtml(hint.text)}">${escapeHtml(formatTimestamp(hint.seconds))} · ${escapeHtml(HINT_SOURCE_LABELS[hint.source] ?? hint.source)}${hint.votes > 1 ? ` ×${hint.votes}` : ""}</button>`).join("")}</div>` : `<p class="candidate-no-hint">시작 초 단서 없음 · 재생하며 직접 찾아 주세요</p>`}
      <div class="candidate-actions">
        ${selected
          ? `<span class="pill blue">${rank}번 ${rank === 1 ? "대표" : "추가"}</span><button type="button" class="button button-ghost" data-unselect-video="${id}">해제</button>`
          : `<button type="button" class="button button-primary" data-select-video="${id}" ${selection.items.length >= 5 ? "disabled" : ""}>${selection.items.length ? "추가 영상으로" : "대표 영상으로"}</button>`}
      </div>
    </div>
  </article>`;
}

function candidateItem(videoId) {
  const candidates = workbench.candidates.get(workbench.songId);
  return (candidates && candidates !== "loading" ? candidates.items ?? [] : []).find((item) => item.videoId === videoId)
    ?? workbench.selection?.items.find((item) => item.videoId === videoId)
    ?? null;
}

function setCandidateStart(videoId, seconds, { seek = false } = {}) {
  const value = Math.max(0, Math.floor(seconds));
  workbench.starts.set(videoId, value);
  const input = viewRoot.querySelector(`[data-candidate-start="${CSS.escape(videoId)}"]`);
  if (input) input.value = formatTimestamp(value);
  const selected = workbench.selection?.items.find((item) => item.videoId === videoId);
  if (selected && selected.startSeconds !== value) {
    selected.startSeconds = value;
    workbench.selection.dirty = true;
    renderWorkbenchSelectionOnly();
  }
  if (seek) seekCandidate(videoId, value);
}

// 선택 목록만 다시 그려 재생 중인 후보 플레이어를 유지한다.
function renderWorkbenchSelectionOnly() {
  const song = songById(workbench.songId);
  const current = viewRoot.querySelector(".work-selection");
  if (!song || !current) return;
  const template = document.createElement("div");
  template.innerHTML = renderVideoWorkPanel(song);
  current.replaceWith(template.querySelector(".work-selection"));
  for (const card of viewRoot.querySelectorAll("[data-candidate]")) {
    const fresh = template.querySelector(`[data-candidate="${CSS.escape(card.dataset.candidate)}"] .candidate-actions`);
    if (fresh) card.querySelector(".candidate-actions").replaceWith(fresh);
    card.classList.toggle("is-selected", workbench.selection.items.some(({ videoId }) => videoId === card.dataset.candidate));
  }
}

function candidateFrame(videoId) {
  return viewRoot.querySelector(`iframe[data-yt-video="${CSS.escape(videoId)}"]`);
}

function postToPlayer(frame, func, args = []) {
  frame?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args, id: frame.id, channel: "widget" }), YOUTUBE_EMBED_ORIGIN);
}

function playCandidate(videoId, startSeconds) {
  for (const frame of viewRoot.querySelectorAll("iframe[data-yt-video]")) {
    if (frame.dataset.ytVideo !== videoId) postToPlayer(frame, "pauseVideo");
  }
  const holder = viewRoot.querySelector(`[data-candidate-player="${CSS.escape(videoId)}"]`);
  if (!holder) return;
  const params = new URLSearchParams({ enablejsapi: "1", origin: location.origin, autoplay: "1", playsinline: "1", start: String(startSeconds) });
  holder.innerHTML = `<iframe id="wb-player-${escapeHtml(videoId)}" data-yt-video="${escapeHtml(videoId)}" class="song-video-player" src="${YOUTUBE_EMBED_ORIGIN}/embed/${escapeHtml(videoId)}?${params}" title="후보 영상 재생" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  const frame = holder.querySelector("iframe");
  const listen = () => frame.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: frame.id, channel: "widget" }), YOUTUBE_EMBED_ORIGIN);
  frame.addEventListener("load", () => {
    listen();
    window.setTimeout(listen, 800);
  });
  workbench.playerTimes.set(videoId, startSeconds);
}

function seekCandidate(videoId, seconds) {
  const frame = candidateFrame(videoId);
  if (!frame) {
    playCandidate(videoId, seconds);
    return;
  }
  postToPlayer(frame, "seekTo", [seconds, true]);
  postToPlayer(frame, "playVideo");
  workbench.playerTimes.set(videoId, seconds);
}

window.addEventListener("message", (event) => {
  if (!/^https:\/\/www\.youtube(?:-nocookie)?\.com$/u.test(event.origin)) return;
  const frame = [...document.querySelectorAll("iframe[data-yt-video]")].find((item) => item.contentWindow === event.source);
  if (!frame) return;
  let data;
  try {
    data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
  } catch {
    return;
  }
  const time = data?.info?.currentTime;
  if (typeof time === "number" && Number.isFinite(time)) workbench.playerTimes.set(frame.dataset.ytVideo, time);
});

function selectCandidate(videoId) {
  const selection = workbench.selection;
  const item = candidateItem(videoId);
  if (!selection || !item || selection.items.length >= 5 || selection.items.some((entry) => entry.videoId === videoId)) return;
  selection.items.push({
    videoId,
    title: item.title ?? "",
    channelName: item.channelName ?? "",
    attributionText: item.attributionText ?? "",
    startSeconds: candidateStart(item, selection),
  });
  selection.dirty = true;
  renderWorkbenchSelectionOnly();
}

function unselectCandidate(index) {
  const selection = workbench.selection;
  if (!selection?.items[index]) return;
  selection.items.splice(index, 1);
  selection.dirty = true;
  renderWorkbenchSelectionOnly();
}

async function addManualVideo() {
  const input = viewRoot.querySelector("#work-manual-url");
  const url = input?.value.trim() ?? "";
  const videoId = extractYouTubeVideoId(url);
  const selection = workbench.selection;
  if (!videoId) {
    toast("YouTube 영상 주소를 확인해 주세요.", "error");
    return;
  }
  if (!selection || selection.items.length >= 5) return;
  if (selection.items.some((item) => item.videoId === videoId)) {
    toast("이미 선택한 영상이에요.", "error");
    return;
  }
  let metadata = { title: "", channelName: "" };
  try {
    metadata = await api(`/api/youtube-metadata?url=${encodeURIComponent(url)}`);
  } catch {
    toast("영상 정보를 불러오지 못해 URL만 추가했어요. 제목은 전체 편집에서 입력할 수 있어요.", "error");
  }
  selection.items.push({ videoId, title: metadata.title, channelName: metadata.channelName, attributionText: "", startSeconds: youtubeStartSeconds(url) });
  selection.dirty = true;
  renderWorkbenchView();
}

async function collectCandidates(songIds) {
  if (busy || songIds.length === 0) return;
  setBusy(true, "후보 수집 요청 중");
  try {
    const result = await api("/api/video-candidates/collect", { method: "POST", body: { songIds } });
    for (const id of result.queued) workbench.candidates.delete(id);
    database.candidateTasks = result.tasks;
    toast(result.queued.length ? `${result.queued.length}곡의 영상 후보를 수집하고 있어요.` : "이미 수집 중인 곡이에요.");
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
    renderWorkbenchView();
  }
}

// 가사

function ensureLyricsDraft(song) {
  const current = workbench.lyrics;
  if (current?.songId === song.id && (current.dirty || current.revision === song.revision)) return current;
  workbench.lyrics = { songId: song.id, revision: song.revision, text: (song.lyrics?.lines ?? []).join("\n"), dirty: false };
  return workbench.lyrics;
}

function renderLyricsWorkPanel(song) {
  const draft = ensureLyricsDraft(song);
  const organization = organizationById(song.organizationId);
  const video = song.videos?.[0];
  const query = `${organization?.name ?? ""} ${song.title} 응원가 가사`;
  return `
    ${workPanelHeader(song)}
    <div class="work-lyrics-grid">
      <div class="work-lyrics-reference">
        ${video ? `<div class="song-video-card"><button type="button" class="song-video-play" data-lyrics-play="${escapeHtml(video.videoId)}" data-lyrics-start="${youtubeStartSeconds(video.sourceUrl)}" aria-label="대표 영상 재생"><img src="https://i.ytimg.com/vi/${escapeHtml(video.videoId)}/hqdefault.jpg" alt="" loading="lazy" /><span>▶ 대표 영상 재생</span></button></div>` : `<p class="field-help">대표 영상이 아직 없어요. ‘영상 고르기’에서 먼저 고르면 들으며 받아 적을 수 있어요.</p>`}
        <div class="work-search-links">
          <a class="button button-ghost" href="https://www.google.com/search?q=${encodeURIComponent(query)}" target="_blank" rel="noreferrer">Google에서 가사 찾기 ↗</a>
          <a class="button button-ghost" href="https://www.youtube.com/results?search_query=${encodeURIComponent(`${organization?.name ?? ""} ${song.title} 가사`)}" target="_blank" rel="noreferrer">YouTube 가사 영상 ↗</a>
        </div>
      </div>
      <div class="work-lyrics-editor">
        <label class="field"><span>전체 가사 <small>한 줄씩 · 공개 화면에서는 처음 두 줄을 먼저 보여요</small></span><textarea id="work-lyrics-input" rows="16">${escapeHtml(draft.text)}</textarea></label>
        <details class="editor-preview" open><summary>공개 화면 미리보기</summary><div class="editor-reading" id="work-lyrics-preview"></div></details>
      </div>
    </div>
    <footer class="work-panel-footer">${draft.dirty ? `<span class="pill orange">저장 안 됨</span>` : ""}${workSaveButtons()}</footer>`;
}

function updateWorkLyricsPreview() {
  const preview = viewRoot.querySelector("#work-lyrics-preview");
  if (preview) preview.innerHTML = lyricsPreview(workbench.lyrics?.text ?? "");
}

async function saveWorkSong({ next = false } = {}) {
  const song = songById(workbench.songId);
  if (!song || busy) return;
  const queueBefore = currentWorkQueue();
  let patch;
  if (workbench.mode === "videos") {
    const selection = ensureVideoSelection(song);
    patch = {
      videos: selection.items.map((item, index) => ({
        rank: index + 1,
        sourceUrl: videoUrlWithStart(item.videoId, item.startSeconds),
        title: item.title,
        channelName: item.channelName,
        attributionText: item.attributionText,
      })),
    };
  } else {
    patch = { lyrics: { lines: String(ensureLyricsDraft(song).text).replace(/\r\n/gu, "\n").split("\n") } };
  }
  setBusy(true, "저장 중");
  try {
    await api(`/api/songs/${encodeURIComponent(song.id)}`, { method: "PUT", body: { song: patch, expectedRevision: song.revision } });
    workbench.selection = null;
    workbench.lyrics = null;
    if (next) workbench.songId = nextWorkSongId(queueBefore, song.id);
    await loadState({ render: false });
    toast(next ? `${song.title}을 저장하고 다음 곡으로 넘어왔어요.` : `${song.title}을 저장했어요.`);
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
    renderWorkbenchView();
  }
}

// 다듬기

function renderPolishMode(queue) {
  if (!workbench.polishSelected) workbench.polishSelected = new Set(queue.slice(0, 5).map(({ id }) => id));
  for (const id of workbench.polishSelected) if (!queue.some((song) => song.id === id)) workbench.polishSelected.delete(id);
  const parsed = workbench.polishParsed;
  return `
    <div class="work-polish">
      <section class="data-card work-step">
        <header class="panel-header">
          <div><h2>1. 요청문 복사</h2><p>소재 노트가 있는 초안 곡을 골라 ChatGPT에 한 번에 보내요. 이미 공개한 본문 2개가 문체 예시로 함께 들어가요. 5곡 안팎을 권장해요.</p></div>
          <button type="button" class="button button-primary" data-copy-polish-prompt ${workbench.polishSelected.size ? "" : "disabled"}>${icons.copy}${workbench.polishSelected.size}곡 요청문 복사</button>
        </header>
        <ul class="polish-song-list">
          ${queue.map((song) => {
            const organization = organizationById(song.organizationId);
            return `<li><label><input type="checkbox" class="selection-checkbox" data-polish-select="${escapeHtml(song.id)}" ${workbench.polishSelected.has(song.id) ? "checked" : ""} /><span><strong>${escapeHtml(song.title)}</strong><small>${escapeHtml(organization?.name ?? song.organizationId)} · 소재 노트 ${String(song.researchText ?? "").trim().length.toLocaleString("ko-KR")}자 · 초안 ${String(song.descriptionText ?? "").trim().length.toLocaleString("ko-KR")}자</small></span></label><button type="button" class="button button-ghost" data-edit-song="${escapeHtml(song.id)}">직접 다듬기</button></li>`;
          }).join("") || `<li>${emptySmall("다듬을 초안이 없어요")}</li>`}
        </ul>
      </section>
      <section class="data-card work-step">
        <header class="panel-header"><div><h2>2. 답변 붙여 넣기</h2><p>ChatGPT 답변 전체를 붙여 넣으면 <code>===== 곡 ID =====</code> 기준으로 나눠요. 반영한 곡은 ‘다듬기 완료’가 되고, 이미 공개한 곡은 재공개하면 사이트에 본문이 나타나요.</p></div></header>
        <label class="field"><span class="sr-only">ChatGPT 답변</span><textarea id="polish-response" rows="10" placeholder="===== song-id =====&#10;공개 본문…&#10;===== END =====">${escapeHtml(workbench.polishText)}</textarea></label>
        <div class="work-step-actions"><button type="button" class="button button-secondary" data-parse-polish>결과 확인</button></div>
        ${parsed ? polishPreview(parsed) : ""}
      </section>
    </div>`;
}

function polishPreview(parsed) {
  const warnings = [
    parsed.unknownIds.length ? `알 수 없는 곡 ID: ${parsed.unknownIds.join(", ")}` : "",
    parsed.emptyIds.length ? `본문이 비어 있음: ${parsed.emptyIds.map((id) => songById(id)?.title ?? id).join(", ")}` : "",
    parsed.missingIds.length ? `답변에 없는 선택 곡: ${parsed.missingIds.map((id) => songById(id)?.title ?? id).join(", ")}` : "",
  ].filter(Boolean);
  return `
    <div class="polish-preview">
      ${warnings.map((warning) => `<p class="work-error">${escapeHtml(warning)}</p>`).join("")}
      ${parsed.items.map((item) => {
        const song = songById(item.id);
        return `<details class="polish-preview-item"><summary><strong>${escapeHtml(song?.title ?? item.id)}</strong><span>${item.descriptionText.length.toLocaleString("ko-KR")}자${song?.descriptionStatus === "polished" ? " · 기존 다듬은 본문 교체" : ""}</span></summary><div class="editor-reading">${descriptionPreview(item.descriptionText)}</div></details>`;
      }).join("")}
      <div class="work-step-actions"><button type="button" class="button button-primary" data-apply-polish ${parsed.items.length ? "" : "disabled"}>${parsed.items.length}곡 본문 반영</button></div>
    </div>`;
}

async function copyPolishPrompt() {
  const songs = [...workbench.polishSelected].map(songById).filter(Boolean);
  if (!songs.length) return;
  const prompt = buildPolishPrompt(songs, {
    organizations: database.organizations,
    exemplars: pickPolishExemplars(database.songs, new Set(songs.map(({ id }) => id))),
  });
  try {
    await copyText(prompt);
    toast(`${songs.length}곡 다듬기 요청문을 복사했어요. ChatGPT에 붙여 넣어 주세요.`);
  } catch (error) {
    showError(error);
  }
}

async function applyPolish() {
  const items = workbench.polishParsed?.items ?? [];
  if (!items.length || busy) return;
  setBusy(true, "본문 반영 중");
  try {
    const body = { items: items.map(({ id, descriptionText }) => ({ id, descriptionText, expectedRevision: songById(id).revision })) };
    await api("/api/songs/bulk?action=apply-polish", { method: "POST", body });
    workbench.polishText = "";
    workbench.polishParsed = null;
    workbench.polishSelected = null;
    await loadState({ render: false });
    toast(`${items.length}곡의 본문을 다듬기 완료로 반영했어요. 공개 중인 곡은 ‘공개 준비’에서 재공개해 주세요.`);
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
    renderWorkbenchView();
  }
}

// 공개 준비

function renderPublishMode() {
  const songs = workbench.publishShowAll
    ? database.songs.filter((song) => song.scopeStatus !== "rejected" && song.publication?.status !== "current")
    : workQueue(database, "publish");
  for (const id of workbench.publishSelected) if (!songs.some((song) => song.id === id)) workbench.publishSelected.delete(id);
  const check = (ok, yes, no) => `<span class="pill ${ok ? "green" : "gray"}">${escapeHtml(ok ? yes : no)}</span>`;
  return `
    <section class="data-card">
      <div class="table-toolbar">
        <div class="toolbar-group">
          <label class="work-toggle"><input type="checkbox" data-publish-show-all ${workbench.publishShowAll ? "checked" : ""} />영상·가사가 없는 곡도 보기</label>
          <span class="table-result">초안 본문은 곡을 공개해도 사이트에 표시되지 않아요.</span>
        </div>
        <button type="button" class="button button-primary" data-publish-selected ${workbench.publishSelected.size ? "" : "disabled"}>${icons.upload}${workbench.publishSelected.size}곡 공개</button>
      </div>
      <div class="table-scroll">
        <table class="data-table work-publish-table">
          <thead><tr><th><input type="checkbox" class="selection-checkbox" data-publish-select-all aria-label="모두 선택" ${songs.length && songs.every((song) => workbench.publishSelected.has(song.id)) ? "checked" : ""} /></th><th>응원가</th><th>영상</th><th>가사</th><th>본문</th><th>사이트 공개</th></tr></thead>
          <tbody>
            ${songs.map((song) => {
              const readiness = songReadiness(song);
              const organization = organizationById(song.organizationId);
              const description = !String(song.descriptionText ?? "").trim()
                ? `<span class="pill gray">비어 있음</span>`
                : readiness.polished ? `<span class="pill green">다듬음</span>` : `<span class="pill orange">초안 · 숨김</span>`;
              return `<tr>
                <td><input type="checkbox" class="selection-checkbox" data-publish-select="${escapeHtml(song.id)}" aria-label="${escapeHtml(song.title)} 선택" ${workbench.publishSelected.has(song.id) ? "checked" : ""} /></td>
                <td><button type="button" class="work-link-button" data-edit-song="${escapeHtml(song.id)}"><strong>${escapeHtml(song.title)}</strong><small>${escapeHtml(organization?.name ?? song.organizationId)}</small></button></td>
                <td>${check(readiness.hasVideo, `${song.videos.length}개`, "없음")}</td>
                <td>${check(readiness.hasLyrics, "있음", "없음")}</td>
                <td>${description}</td>
                <td>${publicationCell(song)}</td>
              </tr>`;
            }).join("") || `<tr><td colspan="6">${emptySmall("공개를 기다리는 곡이 없어요")}</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>`;
}

async function switchWorkbench({ mode = workbench.mode, songId = null }) {
  if (mode === workbench.mode && songId && songId === workbench.songId) return;
  if (!(await confirmDiscardWorkbench())) return;
  if (mode !== workbench.mode) workbench.includeDone = false;
  workbench.mode = mode;
  workbench.songId = songId;
  renderWorkbenchView();
  if (songId) viewRoot.querySelector(".work-panel")?.scrollIntoView({ block: "start", behavior: "smooth" });
}

function handleWorkbenchClick(target) {
  const modeButton = target.closest("[data-work-mode]");
  if (modeButton) {
    if (modeButton.dataset.workMode !== workbench.mode) switchWorkbench({ mode: modeButton.dataset.workMode });
    return true;
  }
  const songButton = target.closest("[data-work-song]");
  if (songButton) {
    switchWorkbench({ songId: songButton.dataset.workSong });
    return true;
  }
  if (target.closest("[data-work-save]")) { saveWorkSong(); return true; }
  if (target.closest("[data-work-save-next]")) { saveWorkSong({ next: true }); return true; }
  const collectButton = target.closest("[data-collect-candidates]");
  if (collectButton) { collectCandidates([collectButton.dataset.collectCandidates]); return true; }
  if (target.closest("[data-collect-missing-candidates]")) {
    const ids = currentWorkQueue().filter((song) => !database.videoCandidates?.[song.id]).map(({ id }) => id);
    if (ids.length) collectCandidates(ids);
    else toast("모든 곡에 후보가 이미 있어요.");
    return true;
  }
  const playButton = target.closest("[data-candidate-play]");
  if (playButton) {
    const videoId = playButton.dataset.candidatePlay;
    playCandidate(videoId, candidateStart(candidateItem(videoId) ?? { videoId }, workbench.selection));
    return true;
  }
  const lyricsPlay = target.closest("[data-lyrics-play]");
  if (lyricsPlay) {
    const params = new URLSearchParams({ autoplay: "1", playsinline: "1", start: lyricsPlay.dataset.lyricsStart });
    lyricsPlay.outerHTML = `<iframe class="song-video-player" src="${YOUTUBE_EMBED_ORIGIN}/embed/${escapeHtml(lyricsPlay.dataset.lyricsPlay)}?${params}" title="대표 영상 재생" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    return true;
  }
  const nudge = target.closest("[data-nudge]");
  if (nudge) {
    const videoId = nudge.dataset.nudgeVideo;
    const current = workbench.starts.get(videoId) ?? candidateStart(candidateItem(videoId) ?? { videoId }, workbench.selection);
    setCandidateStart(videoId, current + Number(nudge.dataset.nudge), { seek: true });
    return true;
  }
  const capture = target.closest("[data-capture-time]");
  if (capture) {
    const videoId = capture.dataset.captureTime;
    if (!candidateFrame(videoId)) toast("먼저 영상을 재생한 뒤 원하는 지점에서 눌러 주세요.", "error");
    else setCandidateStart(videoId, workbench.playerTimes.get(videoId) ?? 0);
    return true;
  }
  const hint = target.closest("[data-hint-video]");
  if (hint) { setCandidateStart(hint.dataset.hintVideo, Number(hint.dataset.hintSeconds), { seek: true }); return true; }
  const select = target.closest("[data-select-video]");
  if (select) { selectCandidate(select.dataset.selectVideo); return true; }
  const unselect = target.closest("[data-unselect-video]");
  if (unselect) {
    unselectCandidate(workbench.selection?.items.findIndex(({ videoId }) => videoId === unselect.dataset.unselectVideo) ?? -1);
    return true;
  }
  const remove = target.closest("[data-remove-selected]");
  if (remove) { unselectCandidate(Number(remove.dataset.removeSelected)); return true; }
  const move = target.closest("[data-move-selected]");
  if (move) {
    const items = workbench.selection?.items ?? [];
    const index = Number(move.dataset.selectedIndex);
    const nextIndex = index + Number(move.dataset.moveSelected);
    if (items[index] && items[nextIndex]) {
      [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
      workbench.selection.dirty = true;
      renderWorkbenchSelectionOnly();
    }
    return true;
  }
  if (target.closest("[data-add-manual-video]")) { addManualVideo(); return true; }
  if (target.closest("[data-copy-polish-prompt]")) { copyPolishPrompt(); return true; }
  if (target.closest("[data-parse-polish]")) {
    workbench.polishParsed = parsePolishResponse(workbench.polishText, {
      knownIds: database.songs.map(({ id }) => id),
      expectedIds: [...(workbench.polishSelected ?? [])],
    });
    renderWorkbenchView();
    return true;
  }
  if (target.closest("[data-apply-polish]")) { applyPolish(); return true; }
  if (target.closest("[data-publish-selected]")) {
    publishSongIds([...workbench.publishSelected]).then((published) => {
      if (published) workbench.publishSelected.clear();
      if (currentView === "workbench") renderWorkbenchView();
    });
    return true;
  }
  return false;
}

function handleWorkbenchChange(target) {
  if (target.matches("[data-work-include-done]")) {
    workbench.includeDone = target.checked;
    renderWorkbenchView();
    return true;
  }
  if (target.matches("[data-candidate-start]")) {
    const seconds = parseTimestamp(target.value);
    if (seconds === null) {
      toast("시작 시각은 2:40 또는 160처럼 입력해 주세요.", "error");
      target.value = formatTimestamp(workbench.starts.get(target.dataset.candidateStart) ?? 0);
    } else {
      setCandidateStart(target.dataset.candidateStart, seconds, { seek: Boolean(candidateFrame(target.dataset.candidateStart)) });
    }
    return true;
  }
  if (target.matches("[data-polish-select]")) {
    if (target.checked) workbench.polishSelected.add(target.dataset.polishSelect);
    else workbench.polishSelected.delete(target.dataset.polishSelect);
    renderWorkbenchView();
    return true;
  }
  if (target.matches("[data-publish-show-all]")) {
    workbench.publishShowAll = target.checked;
    renderWorkbenchView();
    return true;
  }
  if (target.matches("[data-publish-select]")) {
    if (target.checked) workbench.publishSelected.add(target.dataset.publishSelect);
    else workbench.publishSelected.delete(target.dataset.publishSelect);
    renderWorkbenchView();
    return true;
  }
  if (target.matches("[data-publish-select-all]")) {
    for (const input of viewRoot.querySelectorAll("[data-publish-select]")) {
      if (target.checked) workbench.publishSelected.add(input.dataset.publishSelect);
      else workbench.publishSelected.delete(input.dataset.publishSelect);
    }
    renderWorkbenchView();
    return true;
  }
  return false;
}

function handleWorkbenchInput(target) {
  if (target.id === "work-lyrics-input" && workbench.lyrics) {
    workbench.lyrics.text = target.value;
    if (!workbench.lyrics.dirty) {
      workbench.lyrics.dirty = true;
      viewRoot.querySelector(".work-panel-footer")?.insertAdjacentHTML("afterbegin", `<span class="pill orange">저장 안 됨</span>`);
    }
    updateWorkLyricsPreview();
    return true;
  }
  if (target.id === "polish-response") {
    workbench.polishText = target.value;
    return true;
  }
  return false;
}

navigation.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  if (currentView === "workbench" && button.dataset.view !== "workbench" && !(await confirmDiscardWorkbench())) return;
  setView(button.dataset.view);
});

viewRoot.addEventListener("click", (event) => {
  const target = event.target;
  if (currentView === "workbench" && handleWorkbenchClick(target)) return;
  const moveOriginalButton = target.closest("[data-move-original]");
  if (moveOriginalButton) {
    const id = moveOriginalButton.dataset.originalId;
    const currentIndex = originalOrderIds.indexOf(id);
    moveOriginalSongTo(id, currentIndex + (moveOriginalButton.dataset.moveOriginal === "up" ? -1 : 1), `[data-move-original="${moveOriginalButton.dataset.moveOriginal}"]`);
    return;
  }
  if (target.closest("[data-save-original-order]")) { saveOriginalOrder(); return; }
  if (target.closest("[data-reset-original-order]")) {
    originalOrderIds = [...originalOrderSavedIds];
    renderOriginalOrderView();
    return;
  }
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
  const publishSongButton = target.closest("[data-publish-song]");
  const priorityPromptButton = target.closest("[data-copy-priority-prompt]");
  const nextPriorityButton = target.closest("[data-copy-priority-next]");
  const createPrioritySongButton = target.closest("[data-create-priority-song]");

  if (priorityPromptButton || nextPriorityButton) {
    const items = filteredPriorityItems(buildPriorityItems(database));
    const item = priorityPromptButton
      ? buildPriorityItems(database).find(({ key }) => key === priorityPromptButton.dataset.copyPriorityPrompt)
      : items.find(({ action }) => !["complete", "waiting"].includes(action));
    if (item) copyText(item.prompt).then(() => toast(`${item.title} 작업 요청을 복사했어요.`)).catch(showError);
  }
  else if (createPrioritySongButton) {
    const item = buildPriorityItems(database).find(({ key }) => key === createPrioritySongButton.dataset.createPrioritySong);
    if (item) openSongDrawer(null, item.organizationId, { id: item.entityId, title: item.title });
  }
  else if (publishSongButton) publishSongIds([publishSongButton.dataset.publishSong]);
  else if (createOrganizationButton) openOrganizationDrawer();
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
  if (currentView === "workbench" && handleWorkbenchInput(event.target)) return;
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
  if (currentView === "workbench" && handleWorkbenchChange(event.target)) return;
  if (event.target.matches("[data-original-position]")) {
    const id = event.target.dataset.originalPosition;
    const position = event.target.valueAsNumber;
    if (Number.isInteger(position) && position >= 1 && position <= originalOrderIds.length) {
      moveOriginalSongTo(id, position - 1, "[data-original-position]");
    } else {
      renderOriginalOrderView({ focusId: id, focusControl: "[data-original-position]" });
    }
    return;
  }
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
  if (event.target.id === "priority-side-filter") filters.prioritySide = event.target.value;
  if (event.target.id === "priority-group-filter") filters.priorityGroup = event.target.value;
  if (event.target.id === "priority-status-filter") filters.priorityStatus = event.target.value;
  if (["priority-side-filter", "priority-group-filter", "priority-status-filter"].includes(event.target.id)) renderPrioritiesView();
  if (event.target.matches("[data-inline-song-stage]")) {
    updateSongStage(event.target.dataset.inlineSongStage, event.target.value, event.target);
  }
  if (event.target.id === "reel-status-filter") filters.reelStatus = event.target.value;
  if (event.target.id === "reel-render-filter") filters.reelRenderStatus = event.target.value;
  if (["reel-status-filter", "reel-render-filter"].includes(event.target.id)) applyReelFilters();
  if (event.target.id === "bulk-song-stage" && event.target.value) {
    const value = event.target.value;
    event.target.value = "";
    if (value === "published") publishSongIds([...selectedSongIds]);
    else bulkUpdateSongs({ workflowStage: value }, STAGE_LABELS[value]);
  }
  if (event.target.id === "bulk-song-scope" && event.target.value) {
    const value = event.target.value;
    event.target.value = "";
    bulkUpdateSongs({ scopeStatus: value }, SCOPE_LABELS[value]);
  }
});

viewRoot.addEventListener("dragstart", (event) => {
  const row = event.target.closest(".original-order-item");
  if (!row || busy) return;
  draggedOriginalId = row.dataset.originalId;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedOriginalId);
  row.classList.add("is-dragging");
});

viewRoot.addEventListener("dragover", (event) => {
  const row = event.target.closest(".original-order-item");
  if (!row || !draggedOriginalId || row.dataset.originalId === draggedOriginalId) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  viewRoot.querySelectorAll(".original-order-item").forEach((item) => item.classList.remove("is-drop-before", "is-drop-after"));
  row.classList.add(event.clientY < row.getBoundingClientRect().top + row.offsetHeight / 2 ? "is-drop-before" : "is-drop-after");
});

viewRoot.addEventListener("drop", (event) => {
  const row = event.target.closest(".original-order-item");
  if (!row || !draggedOriginalId) return;
  event.preventDefault();
  const sourceId = draggedOriginalId;
  const targetId = row.dataset.originalId;
  const after = row.classList.contains("is-drop-after");
  draggedOriginalId = null;
  const withoutSource = originalOrderIds.filter((id) => id !== sourceId);
  const targetIndex = withoutSource.indexOf(targetId);
  if (targetIndex >= 0) moveOriginalSongTo(sourceId, targetIndex + (after ? 1 : 0));
  else renderOriginalOrderView();
});

viewRoot.addEventListener("dragend", () => {
  draggedOriginalId = null;
  viewRoot.querySelectorAll(".original-order-item").forEach((item) => item.classList.remove("is-dragging", "is-drop-before", "is-drop-after"));
});

entityForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveDrawerEntity({ next: event.submitter === saveNextSongButton });
});

entityForm.addEventListener("invalid", (event) => {
  const panel = event.target.closest("[data-song-panel]");
  if (panel) setSongTab(panel.dataset.songPanel);
}, true);

drawerBody.addEventListener("keydown", (event) => {
  const tab = event.target.closest("[data-song-tab]");
  if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const tabs = [...drawerBody.querySelectorAll("[data-song-tab]")];
  const index = tabs.indexOf(tab);
  const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
  setSongTab(tabs[nextIndex].dataset.songTab, true);
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
  if (drawerState.type === "song") {
    if (event.target.matches('[data-video-field="sourceUrl"]')) queueVideoMetadata(event.target.closest("[data-video-slot]"));
    if (["descriptionText", "lyrics"].includes(event.target.name)) updateSongPreviews();
    window.clearTimeout(draftTimer);
    draftTimer = window.setTimeout(persistSongDraft, 250);
  }
});

entityForm.addEventListener("change", () => {
  if (!drawerState || busy) return;
  drawerState.dirty = true;
  if (drawerState.type === "organization") updateOrganizationPreview();
  if (drawerState.type === "reel") updateReelPreview();
  if (drawerState.type === "song") persistSongDraft();
});

drawerBody.addEventListener("click", (event) => {
  if (busy) return;
  const songTab = event.target.closest("[data-song-tab]");
  if (songTab) { setSongTab(songTab.dataset.songTab); return; }
  const note = event.target.closest("[data-preview-note]");
  if (note) {
    const body = note.nextElementSibling;
    body.hidden = !body.hidden;
    note.setAttribute("aria-expanded", String(!body.hidden));
    return;
  }
  if (event.target.closest("[data-restore-song-draft]")) { restoreSongDraft(); return; }
  if (event.target.closest("[data-view-song-draft]")) {
    drawerBody.querySelector(".draft-source").hidden = false;
    return;
  }
  if (event.target.closest("[data-discard-song-draft]")) { clearSongDraft(); persistSongDraft(); return; }
  if (event.target.closest("[data-add-song-video]")) {
    const list = drawerBody.querySelector(".video-editor-list");
    const count = list.children.length;
    if (count >= 5) return;
    list.insertAdjacentHTML("beforeend", videoSlot({}, count));
    list.lastElementChild.open = true;
    list.lastElementChild.querySelector("input").focus();
    updateAddVideoButton();
    return;
  }
  if (event.target.closest("[data-fetch-video]")) { lookupVideoMetadata(event.target.closest("[data-video-slot]")); return; }
  const playButton = event.target.closest("[data-play-song-video]");
  if (playButton) {
    const source = playButton.closest("[data-video-slot]").querySelector('[data-video-field="sourceUrl"]').value.trim();
    const id = extractYouTubeVideoId(source);
    if (id) playButton.outerHTML = `<iframe class="song-video-player" src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&start=${youtubeStartSeconds(source)}" title="선택한 영상 재생" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    return;
  }
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
    updateSongPreviews();
    persistSongDraft();
  }
  if (event.target.closest("[data-request-enrichment]")) requestEnrichment();
  if (event.target.closest("[data-publish-drawer-song]")) {
    if (drawerState?.dirty) toast("사이트에 공개하기 전에 변경 내용을 먼저 저장해 주세요.", "error");
    else publishSongIds([drawerState.id], { reopenDrawer: true });
  }
  if (event.target.closest("[data-unpublish-drawer-song]")) {
    if (drawerState?.dirty) toast("공개를 내리기 전에 변경 내용을 먼저 저장하거나 취소해 주세요.", "error");
    else unpublishSongIds([drawerState.id], { reopenDrawer: true });
  }
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
  if (originalOrderDirty()) {
    toast("원곡 순서 변경을 저장하거나 '변경 취소'를 눌러 주세요.", "error");
    return;
  }
  if (drawerState?.dirty) {
    toast("열려 있는 편집 내용을 저장하거나 닫은 뒤 새로고침해 주세요.", "error");
    return;
  }
  if (workbenchDirty()) {
    toast("작업 모드에서 저장하지 않은 내용을 먼저 저장해 주세요.", "error");
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
  if (!drawerState?.dirty && !originalOrderDirty() && !workbenchDirty()) return;
  if (drawerState?.dirty) persistSongDraft();
  event.preventDefault();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") persistSongDraft();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !drawerLayer.hidden && !confirmDialog.open && !importDialog.open) {
    event.preventDefault();
    attemptCloseDrawer();
  }
});

// 영상 후보 수집은 서버에서 한 곡씩 진행되므로, 작업 모드를 보는 동안 상태만 가볍게 갱신한다.
window.setInterval(async () => {
  const tasks = Object.entries(database.candidateTasks ?? {});
  if (!tasks.some(([, task]) => ["queued", "running"].includes(task.status)) || busy || reelPollInProgress) return;
  reelPollInProgress = true;
  try {
    const previous = new Map(tasks.map(([id, task]) => [id, task.status]));
    const next = await api("/api/state");
    database = { ...database, ...next };
    for (const [id, task] of Object.entries(database.candidateTasks ?? {})) {
      if (task.status === "completed" && previous.get(id) !== "completed") workbench.candidates.delete(id);
    }
    if (currentView === "workbench" && workbench.mode === "videos") {
      const currentStatus = database.candidateTasks?.[workbench.songId]?.status;
      const changedCurrent = previous.get(workbench.songId) !== currentStatus;
      const queueList = viewRoot.querySelector(".work-queue-list");
      const collectButton = viewRoot.querySelector("[data-collect-candidates]");
      if (changedCurrent) renderWorkbenchView();
      else if (currentStatus === "running" && collectButton) collectButton.lastChild.textContent = `수집 중 · ${database.candidateTasks[workbench.songId].phase}`;
      if (!changedCurrent && queueList) {
        const queue = currentWorkQueue();
        queueList.innerHTML = queue.map((item) => workQueueItem(item, item.id === workbench.songId)).join("");
      }
    }
  } catch (error) {
    showError(error);
  } finally {
    reelPollInProgress = false;
  }
}, 2500);

window.setInterval(async () => {
  const hasActiveRender = database.reels?.some((reel) => ["queued", "rendering"].includes(reel.render?.status));
  if (!hasActiveRender || busy || drawerState?.dirty || originalOrderDirty() || reelPollInProgress) return;
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
