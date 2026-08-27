const loginView = document.querySelector("#login-view");
const appView = document.querySelector("#app-view");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const batchSelect = document.querySelector("#batch-select");
const organizationControl = document.querySelector("#organization-control");
const organizationSelect = document.querySelector("#organization-select");
const batchSummary = document.querySelector("#batch-summary");
const filterRow = document.querySelector("#filter-row");
const candidateList = document.querySelector("#candidate-list");
const reviewPane = document.querySelector("#review-pane");
const searchInput = document.querySelector("#search-input");
const saveIndicator = document.querySelector("#save-indicator");
const toastRegion = document.querySelector("#toast-region");
const outputDialog = document.querySelector("#output-dialog");
const outputTitle = document.querySelector("#output-title");
const outputContent = document.querySelector("#output-content");
const publishBatchButton = document.querySelector("#publish-batch-button");
const sidebarFooterCopy = document.querySelector("#sidebar-footer-copy");

let state = null;
let selectedBatchId = null;
let selectedCandidateId = null;
let selectedOrganizationId = "all";
let currentDraft = null;
let currentNotes = "";
let currentTab = "draft";
let activeFilter = "all";
let activeVideoId = null;
let dirty = false;
let busy = false;

const fieldLabels = {
  title: "제목",
  aliases: "별칭",
  symbolicLines: "상징 문구",
  teamId: "팀",
  originalSongId: "원곡",
  secondaryOriginalSongIds: "보조 원곡",
  sourceCheerSongId: "직접 차용 응원가",
  originType: "원곡 관계",
  originNote: "원곡 관계 설명",
  year: "확정 도입 연도",
  timelineYear: "기준 연도",
  yearStatus: "연도 상태",
  yearLabel: "연도 표시",
  chronologyNote: "연도 근거",
  description: "설명",
  usageContext: "사용 맥락",
  sources: "출처",
};

const researchLabels = {
  relationship: "관계",
  sourceWork: "원곡·기반 작품",
  sourceArtist: "원작자·가수",
  sourceYear: "원곡 연도",
  underlyingWork: "기반 원곡",
  underlyingArtist: "기반 원곡 가수",
  underlyingWorkYear: "기반 원곡 연도",
  lyricSource: "가사 출처",
  creditedComposer: "표기 작곡자",
  introductionYear: "확정 도입 연도",
  reportedIntroductionYear: "비공식·보고 연도",
  earliestDocumentedYear: "최초 확인 연도",
  displayLabel: "표시 문구",
  confidence: "신뢰도",
  notes: "조사 메모",
  conflictingClaims: "상충 주장",
  periods: "시기별 기록",
  exactDebutDate: "정확한 공개일",
  introductionPeriod: "도입 시기",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeExternalUrl(value) {
  try {
    const url = new URL(String(value));
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function isEqual(left, right) {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

function candidateStatus(item) {
  return item.decision?.decision || (item.canonical ? "approved" : "pending");
}

function inventoryItemStatus(item) {
  return item.alreadyApproved ? "published" : item.decision?.decision || "pending";
}

function deepItemStatus(item) {
  if (item.decision?.isStale) return "stale";
  return item.decision?.decision || "pending";
}

function statusLabel(status) {
  return {
    approved: "승인",
    rejected: "반려",
    pending: "미검수",
    "research-approved": "다음 조사 승인",
    "changes-requested": "수정 요청",
    hold: "보류",
    excluded: "제외",
    published: "정본 등록",
    stale: "자료 변경됨",
  }[status] || "미검수";
}

function showLogin() {
  loginView.hidden = false;
  appView.hidden = true;
  document.querySelector("#pin")?.focus();
}

function showApp() {
  loginView.hidden = true;
  appView.hidden = false;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { error: await response.text() };

  if (response.status === 401 && path !== "/api/login") showLogin();
  if (!response.ok) {
    const error = new Error(payload.error || `요청 실패 (${response.status})`);
    error.details = payload.details || (payload.output ? [payload.output] : undefined);
    throw error;
  }
  return payload;
}

function toast(message, type = "success") {
  const element = document.createElement("div");
  element.className = `toast ${type === "error" ? "error" : ""}`;
  element.textContent = message;
  toastRegion.append(element);
  window.setTimeout(() => element.remove(), 4200);
}

function showOutput(title, content) {
  outputTitle.textContent = title;
  outputContent.textContent = content || "출력 내용이 없습니다.";
  if (typeof outputDialog.showModal === "function") outputDialog.showModal();
}

function showError(error) {
  toast(error.message || "작업을 완료하지 못했습니다.", "error");
  if (Array.isArray(error.details) && error.details.length > 0) {
    showOutput("확인이 필요한 항목", error.details.map((detail) => `• ${detail}`).join("\n"));
  }
}

function setBusy(nextBusy, label = "") {
  busy = nextBusy;
  document.querySelectorAll("button").forEach((button) => {
    if (!button.closest("#login-view") && !button.closest("dialog")) button.disabled = nextBusy;
  });
  saveIndicator.textContent = nextBusy ? label || "처리 중…" : dirty ? "저장하지 않은 변경 있음" : "모든 변경 저장됨";
}

function setDirty(nextDirty) {
  dirty = nextDirty;
  saveIndicator.classList.toggle("dirty", nextDirty);
  if (!busy) saveIndicator.textContent = nextDirty ? "저장하지 않은 변경 있음" : "모든 변경 저장됨";
}

function currentBatch() {
  return state?.batches.find(({ batchId }) => batchId === selectedBatchId) || null;
}

function batchItems(batch = currentBatch()) {
  if (!batch) return [];
  if (batch.kind === "inventory") return batch.inventoryItems;
  if (batch.kind === "deep") return batch.deepItems;
  return batch.candidates;
}

function itemIdentifier(item, batch = currentBatch()) {
  if (batch?.kind === "inventory" || batch?.kind === "deep") return item.itemId;
  return item.candidate.id;
}

function currentItem() {
  const batch = currentBatch();
  return batchItems(batch).find((item) => itemIdentifier(item, batch) === selectedCandidateId) || null;
}

function chooseInitialSelection() {
  if (!state?.batches.length) {
    selectedBatchId = null;
    selectedCandidateId = null;
    return;
  }
  if (!state.batches.some(({ batchId }) => batchId === selectedBatchId)) {
    selectedBatchId = state.batches[0].batchId;
  }
  const batch = currentBatch();
  if (!batchItems(batch).some((item) => itemIdentifier(item, batch) === selectedCandidateId)) {
    selectedCandidateId = batchItems(batch)[0] ? itemIdentifier(batchItems(batch)[0], batch) : null;
  }
  if (batch?.kind !== "inventory") selectedOrganizationId = "all";
}

async function loadState({ preserveDraft = false } = {}) {
  const nextState = await api("/api/state");
  state = nextState;
  chooseInitialSelection();
  if (!preserveDraft) resetEditorFromState();
  renderShell();
}

function resetEditorFromState() {
  const item = currentItem();
  currentDraft = item && currentBatch()?.kind === "detailed" ? clone(item.draft) : null;
  currentNotes = item?.decision?.notes || "";
  activeVideoId = null;
  setDirty(false);
}

function renderShell() {
  showApp();
  renderBatchSelector();
  renderSidebar();
  renderReviewPane();
}

function renderBatchSelector() {
  batchSelect.innerHTML = state.batches
    .map((batch) => {
      const prefix = batch.kind === "inventory" ? "목록 검수" : batch.kind === "deep" ? "심층 검수" : "정본 검수";
      const name = batch.displayName || batch.batchId;
      return `<option value="${escapeHtml(batch.batchId)}" ${batch.batchId === selectedBatchId ? "selected" : ""}>${prefix} · ${escapeHtml(name)}</option>`;
    })
    .join("");
}

function renderSidebar() {
  const batch = currentBatch();
  if (!batch) {
    batchSummary.innerHTML = "";
    candidateList.innerHTML = '<p class="field-hint">검수 가능한 조사 배치가 없습니다.</p>';
    return;
  }

  if (batch.kind === "inventory") return renderInventorySidebar(batch);
  if (batch.kind === "deep") return renderDeepSidebar(batch);
  return renderDetailedSidebar(batch);
}

function renderFilterButtons(filters) {
  filterRow.innerHTML = filters
    .map(({ value, label }) => `<button class="filter-button ${activeFilter === value ? "active" : ""}" type="button" data-filter="${escapeHtml(value)}">${escapeHtml(label)}</button>`)
    .join("");
}

function renderDetailedSidebar(batch) {
  organizationControl.hidden = true;
  batchSummary.classList.remove("inventory", "deep");
  publishBatchButton.hidden = false;
  sidebarFooterCopy.innerHTML = '승인된 초안만 <code>data/cheer-songs.json</code>에 반영합니다.';
  renderFilterButtons([
    { value: "all", label: "전체" },
    { value: "pending", label: "대기" },
    { value: "approved", label: "승인" },
    { value: "rejected", label: "반려" },
  ]);

  const counts = batch.candidates.reduce(
    (result, item) => ({ ...result, [candidateStatus(item)]: result[candidateStatus(item)] + 1 }),
    { pending: 0, approved: 0, rejected: 0 },
  );
  batchSummary.innerHTML = `
    <div class="summary-item"><strong>${counts.pending}</strong><span>대기</span></div>
    <div class="summary-item"><strong>${counts.approved}</strong><span>승인</span></div>
    <div class="summary-item"><strong>${counts.rejected}</strong><span>반려</span></div>
  `;

  const query = searchInput.value.trim().toLocaleLowerCase("ko");
  const visible = batch.candidates.filter((item) => {
    const status = candidateStatus(item);
    if (activeFilter !== "all" && status !== activeFilter) return false;
    const haystack = `${item.candidate.resolvedTitle || ""} ${item.candidate.teamName || ""} ${(item.candidate.aliases || []).join(" ")}`.toLocaleLowerCase("ko");
    return !query || haystack.includes(query);
  });

  candidateList.innerHTML = visible.length
    ? visible
        .map((item) => {
          const status = candidateStatus(item);
          const title = item.candidate.resolvedTitle || item.candidate.requestedLabels?.[0] || item.candidate.id;
          return `
            <button class="candidate-item ${item.candidate.id === selectedCandidateId ? "active" : ""}" type="button" data-candidate-id="${escapeHtml(item.candidate.id)}">
              <span class="candidate-title">${escapeHtml(title)}</span>
              <span class="status-dot ${escapeHtml(status)}" title="${escapeHtml(statusLabel(status))}"></span>
              <span class="candidate-team">${escapeHtml(item.candidate.teamName || "팀 미확인")}${item.canonical ? " · 사이트 등록" : ""}</span>
            </button>`;
        })
        .join("")
    : '<p class="field-hint">조건에 맞는 곡이 없습니다.</p>';
}

function renderInventorySidebar(batch) {
  organizationControl.hidden = false;
  batchSummary.classList.remove("deep");
  batchSummary.classList.add("inventory");
  publishBatchButton.hidden = true;
  sidebarFooterCopy.innerHTML = '결정은 <code>inventory-decisions.json</code>에 저장되며 정본에는 아직 반영되지 않습니다.';
  renderFilterButtons([
    { value: "all", label: "전체" },
    { value: "pending", label: "미검수" },
    { value: "research-approved", label: "승인" },
    { value: "hold", label: "보류" },
    { value: "excluded", label: "제외" },
    { value: "uncertain", label: "재확인" },
    { value: "published", label: "정본" },
  ]);

  organizationSelect.innerHTML = [
    `<option value="all" ${selectedOrganizationId === "all" ? "selected" : ""}>전체 조직 · ${batch.inventoryItems.length}곡</option>`,
    ...batch.organizations.map((organization) => {
      const count = organization.currentCount + organization.uncertainCount;
      return `<option value="${escapeHtml(organization.id)}" ${selectedOrganizationId === organization.id ? "selected" : ""}>${escapeHtml(organization.name)} · ${count}곡</option>`;
    }),
  ].join("");

  const counts = batch.inventoryItems.reduce((result, item) => {
    const status = inventoryItemStatus(item);
    result[status] = (result[status] || 0) + 1;
    return result;
  }, { pending: 0, "research-approved": 0, hold: 0, excluded: 0, published: 0 });
  batchSummary.innerHTML = `
    <div class="summary-item"><strong>${counts.pending}</strong><span>미검수</span></div>
    <div class="summary-item"><strong>${counts["research-approved"]}</strong><span>조사 승인</span></div>
    <div class="summary-item"><strong>${counts.hold}</strong><span>보류</span></div>
    <div class="summary-item"><strong>${counts.excluded}</strong><span>제외</span></div>
  `;

  const query = searchInput.value.trim().toLocaleLowerCase("ko");
  const visible = batch.inventoryItems.filter((item) => {
    const status = inventoryItemStatus(item);
    if (activeFilter === "uncertain" && item.listStatus !== "uncertain") return false;
    if (activeFilter !== "all" && activeFilter !== "uncertain" && status !== activeFilter) return false;
    if (selectedOrganizationId !== "all" && item.organizationId !== selectedOrganizationId) return false;
    const haystack = `${item.title} ${item.decision?.resolvedTitle || ""} ${item.organizationName}`.toLocaleLowerCase("ko");
    return !query || haystack.includes(query);
  });

  candidateList.innerHTML = visible.length
    ? visible.map((item) => {
        const status = inventoryItemStatus(item);
        const resolvedTitle = item.decision?.resolvedTitle || item.title;
        const originalTitleNote = resolvedTitle !== item.title ? ` · 원목록 ${item.title}` : "";
        const listLabel = item.listStatus === "uncertain" ? "재확인" : "현행 목록";
        return `
          <button class="candidate-item ${item.itemId === selectedCandidateId ? "active" : ""}" type="button" data-item-id="${escapeHtml(item.itemId)}">
            <span class="candidate-title">${escapeHtml(resolvedTitle)}</span>
            <span class="status-dot ${escapeHtml(status)}" title="${escapeHtml(statusLabel(status))}"></span>
            <span class="candidate-team">${escapeHtml(item.organizationName)} · ${listLabel}${item.alreadyApproved ? " · 정본 등록" : ""}${escapeHtml(originalTitleNote)}</span>
          </button>`;
      }).join("")
    : '<p class="field-hint">조건에 맞는 곡이 없습니다.</p>';
}

function renderDeepSidebar(batch) {
  organizationControl.hidden = false;
  batchSummary.classList.remove("inventory");
  batchSummary.classList.add("deep");
  publishBatchButton.hidden = true;
  sidebarFooterCopy.innerHTML = '심층 검수 결과는 <code>research/deep/decisions.json</code>에 저장됩니다.';
  renderFilterButtons([
    { value: "all", label: "전체" },
    { value: "pending", label: "미검수" },
    { value: "approved", label: "승인" },
    { value: "changes-requested", label: "수정" },
    { value: "hold", label: "보류" },
    { value: "stale", label: "변경됨" },
  ]);

  organizationSelect.innerHTML = [
    `<option value="all" ${selectedOrganizationId === "all" ? "selected" : ""}>전체 조직 · ${batch.deepItems.length}곡</option>`,
    ...batch.organizations.map((organization) =>
      `<option value="${escapeHtml(organization.id)}" ${selectedOrganizationId === organization.id ? "selected" : ""}>${escapeHtml(organization.name)} · ${organization.itemCount}곡</option>`,
    ),
  ].join("");

  const counts = batch.deepItems.reduce((result, item) => {
    const status = deepItemStatus(item);
    result[status] = (result[status] || 0) + 1;
    return result;
  }, { pending: 0, approved: 0, "changes-requested": 0, hold: 0, stale: 0 });
  batchSummary.innerHTML = `
    <div class="summary-item"><strong>${counts.pending}</strong><span>미검수</span></div>
    <div class="summary-item"><strong>${counts.approved}</strong><span>승인</span></div>
    <div class="summary-item"><strong>${counts["changes-requested"]}</strong><span>수정</span></div>
    <div class="summary-item"><strong>${counts.hold}</strong><span>보류</span></div>
    ${counts.stale ? `<div class="summary-item"><strong>${counts.stale}</strong><span>변경됨</span></div>` : ""}
  `;

  const query = searchInput.value.trim().toLocaleLowerCase("ko");
  const visible = batch.deepItems.filter((item) => {
    const status = deepItemStatus(item);
    if (activeFilter !== "all" && status !== activeFilter) return false;
    if (selectedOrganizationId !== "all" && item.organization.id !== selectedOrganizationId) return false;
    const haystack = [
      item.song.title,
      ...(item.song.aliases || []),
      item.organization.name,
      item.song.summary,
      item.song.currentStatus,
    ].join(" ").toLocaleLowerCase("ko");
    return !query || haystack.includes(query);
  });

  candidateList.innerHTML = visible.length
    ? visible.map((item) => {
        const status = deepItemStatus(item);
        const countsCopy = `주장 ${(item.song.claims || []).length} · 근거 ${item.evidence.length} · 영상 ${item.youtubeSamples.length}`;
        return `
          <button class="candidate-item ${item.itemId === selectedCandidateId ? "active" : ""}" type="button" data-deep-id="${escapeHtml(item.itemId)}">
            <span class="candidate-title">${escapeHtml(item.song.title)}</span>
            <span class="status-dot ${escapeHtml(status)}" title="${escapeHtml(statusLabel(status))}"></span>
            <span class="candidate-team">${escapeHtml(item.organization.name)} · ${countsCopy}${item.canonicalMatches.length ? " · 사이트 등록" : ""}</span>
          </button>`;
      }).join("")
    : '<p class="field-hint">조건에 맞는 심층 조사 곡이 없습니다.</p>';
}

function validationErrors(draft) {
  if (!draft) return ["정본 초안이 없습니다."];
  const errors = [];
  const required = ["title", "teamId", "originalSongId", "originNote", "yearLabel", "chronologyNote", "description", "usageContext"];
  for (const field of required) {
    if (!String(draft[field] || "").trim()) errors.push(`${fieldLabels[field]} 값을 입력하세요.`);
  }
  if (!Array.isArray(draft.symbolicLines) || draft.symbolicLines.length !== 2 || draft.symbolicLines.some((line) => !String(line).trim())) {
    errors.push("상징 문구 두 줄을 모두 입력하세요.");
  }
  if (!Number.isInteger(draft.timelineYear)) errors.push("기준 연도를 입력하세요.");
  if (draft.yearStatus === "confirmed" && (!Number.isInteger(draft.year) || draft.year !== draft.timelineYear)) {
    errors.push("확정 연도는 도입 연도와 기준 연도가 같아야 합니다.");
  }
  if (!Array.isArray(draft.sources) || draft.sources.length === 0) errors.push("출처를 하나 이상 입력하세요.");
  for (const [index, source] of (draft.sources || []).entries()) {
    if (!String(source.label || "").trim() || safeExternalUrl(source.url) === "#") {
      errors.push(`출처 ${index + 1}의 이름과 URL을 확인하세요.`);
    }
  }
  return errors;
}

function renderValidationBanner() {
  const banner = document.querySelector("#validation-banner");
  if (!banner) return;
  const errors = validationErrors(currentDraft);
  banner.classList.toggle("ok", errors.length === 0);
  banner.innerHTML = errors.length === 0
    ? "<span><strong>게시 준비 완료</strong><br />필수 정본 항목이 모두 입력되었습니다.</span>"
    : `<span><strong>승인 전 ${errors.length}개 항목 확인 필요</strong><br />${escapeHtml(errors.slice(0, 2).join(" · "))}${errors.length > 2 ? " 외" : ""}</span>`;
}

function renderReviewPane() {
  const item = currentItem();
  if (!item) {
    reviewPane.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">♪</div>
        <h2>검수할 곡을 선택하세요</h2>
        <p>왼쪽 목록에서 조사 후보를 선택하면 근거와 정본 초안을 함께 볼 수 있습니다.</p>
      </div>`;
    return;
  }
  if (currentBatch()?.kind === "inventory") {
    renderInventoryReview(item);
    return;
  }
  if (currentBatch()?.kind === "deep") {
    renderDeepReview(item);
    return;
  }
  if (!currentDraft) return;

  const status = candidateStatus(item);
  const title = item.candidate.resolvedTitle || item.candidate.requestedLabels?.[0] || item.candidate.id;
  const isPublishedDraft = item.canonical && isEqual(item.canonical, currentDraft);
  reviewPane.innerHTML = `
    <header class="review-header">
      <div>
        <p class="eyebrow">${escapeHtml(item.candidate.teamName || "TEAM UNKNOWN")}</p>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(item.candidate.id)} · 근거 ${item.evidence.length}건</p>
      </div>
      <span class="status-badge ${escapeHtml(status)} ${isPublishedDraft ? "published" : ""}">${escapeHtml(statusLabel(status))}</span>
    </header>

    <div id="validation-banner" class="validation-banner"></div>

    <div class="tab-list" role="tablist" aria-label="검수 보기">
      ${tabButton("draft", "정본 편집")}
      ${tabButton("research", "조사 요약")}
      ${tabButton("evidence", `근거 ${item.evidence.length}`)}
      ${tabButton("diff", "변경 비교")}
    </div>

    <section id="tab-content">${renderCurrentTab(item)}</section>

    <div class="review-notes field">
      <label for="review-notes">검수 메모</label>
      <textarea id="review-notes" placeholder="승인·반려 판단이나 다음에 확인할 내용을 남기세요.">${escapeHtml(currentNotes)}</textarea>
    </div>

    <div class="review-actions">
      <div class="review-actions-group">
        <button id="reject-button" class="button button-danger" type="button">반려 저장</button>
        <button id="save-draft-button" class="button button-secondary" type="button">초안 저장</button>
      </div>
      <div class="review-actions-group">
        <button id="approve-button" class="button button-secondary" type="button">승인만 기록</button>
        <button id="approve-publish-button" class="button button-primary" type="button">승인 및 사이트 반영</button>
      </div>
    </div>`;

  renderValidationBanner();
  attachReviewEvents();
}

function renderInventoryReview(item) {
  const batch = currentBatch();
  const organization = batch.organizations.find(({ id }) => id === item.organizationId);
  const status = inventoryItemStatus(item);
  const resolvedTitle = item.decision?.resolvedTitle || item.title;
  const organizationItems = batch.inventoryItems.filter((entry) => entry.organizationId === item.organizationId);
  const isUncertain = item.listStatus === "uncertain";
  const sources = organization?.sources || [];

  reviewPane.innerHTML = `
    <header class="review-header">
      <div>
        <p class="eyebrow">${escapeHtml(item.organizationName)} · 목록 검수</p>
        <h2>${escapeHtml(resolvedTitle)}</h2>
        <p>${isUncertain ? "현재 사용 여부 재확인 목록" : "현행 사용 목록"} · ${escapeHtml(item.organizationType === "kbo" ? "KBO" : "대학")}</p>
      </div>
      <span class="status-badge ${escapeHtml(status)}">${escapeHtml(statusLabel(status))}</span>
    </header>

    <div class="inventory-guide">
      <strong>이 화면에서 할 일</strong>
      <span>이 곡을 계속 조사할 가치가 있으면 <b>다음 조사 승인</b>, 판단할 근거가 부족하면 <b>보류</b>, 응원가가 아니거나 중복·제외 대상이면 <b>제외</b>를 누르세요.</span>
    </div>

    <div class="validation-banner ${item.alreadyApproved || !isUncertain ? "ok" : ""}">
      ${item.alreadyApproved
        ? "<span><strong>이미 사이트 정본에 등록된 곡</strong><br />이 곡은 기존 상세 검수를 통과했으므로 목록 단계에서 다시 결정할 필요가 없습니다.</span>"
        : isUncertain
          ? "<span><strong>재확인 필요</strong><br />현재 사용 여부, 정확한 곡명 또는 학교 고유곡 여부가 아직 불확실합니다.</span>"
          : "<span><strong>현행 목록에서 확인됨</strong><br />원곡·도입 연도·곡별 영상 근거를 조사할지 결정하면 됩니다.</span>"}
    </div>

    <section class="panel">
      <div class="form-section">
        <div class="form-section-head">
          <div><h3>목록 항목</h3><p>수집된 제목이 부정확하면 여기서 바로잡아 다음 조사에 전달할 수 있습니다.</p></div>
        </div>
        <div class="field-grid">
          <div class="field field-full">
            <label for="inventory-resolved-title">검수 후 사용할 곡명</label>
            <input id="inventory-resolved-title" value="${escapeHtml(resolvedTitle)}" ${item.alreadyApproved ? "disabled" : ""} />
            ${resolvedTitle !== item.title ? `<p class="field-hint">원래 수집 제목: ${escapeHtml(item.title)}</p>` : ""}
          </div>
          <div class="field field-full">
            <div class="inventory-meta-grid">
              <div class="inventory-meta"><span>조직</span><strong>${escapeHtml(item.organizationName)}</strong></div>
              <div class="inventory-meta"><span>수집 판정</span><strong>${isUncertain ? "재확인" : "현행 사용"}</strong></div>
              <div class="inventory-meta"><span>목록 내 곡 수</span><strong>${organizationItems.length}곡</strong></div>
            </div>
          </div>
          ${item.canonicalMatches.length ? `
            <div class="field field-full">
              <p class="inventory-existing"><strong>연결된 사이트 정본</strong><br />${item.canonicalMatches.map((match) => `${escapeHtml(match.title)} · ${escapeHtml(match.id)}`).join("<br />")}</p>
            </div>` : ""}
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-head">
          <div><h3>조직 목록 출처</h3><p>이 단계의 출처는 개별 곡의 원곡·연도 증명이 아니라 현재 목록을 수집한 근거입니다.</p></div>
        </div>
        ${sources.length
          ? `<ul class="inventory-source-list">${sources.map((url) => `<li><a href="${escapeHtml(safeExternalUrl(url))}" target="_blank" rel="noreferrer">${escapeHtml(url)} ↗</a></li>`).join("")}</ul>`
          : '<p class="field-hint">이 조직은 상세 조사 문서에만 근거가 정리되어 있습니다.</p>'}
      </div>

      ${organization?.detailExcerpt ? `
        <div class="form-section">
          <div class="form-section-head"><div><h3>수집 문서 발췌</h3><p>${escapeHtml(organization.detailRef || "상세 문서")}</p></div></div>
          <pre class="markdown-excerpt">${escapeHtml(organization.detailExcerpt)}</pre>
        </div>` : ""}

      <div class="form-section">
        <div class="form-section-head"><div><h3>${escapeHtml(item.organizationName)}의 함께 수집된 곡</h3><p>비슷한 제목이나 중복 후보를 판단할 때 참고하세요.</p></div></div>
        <div class="title-context">
          ${organizationItems.map((entry) => `<span class="title-chip ${entry.itemId === item.itemId ? "current" : ""}">${escapeHtml(entry.title)}</span>`).join("")}
        </div>
      </div>

      ${batch.discrepancyNotes.length ? `
        <div class="form-section">
          <div class="form-section-head"><div><h3>배치 전체 주의사항</h3></div></div>
          <ul>${batch.discrepancyNotes.map((note) => `<li class="field-hint">${escapeHtml(note)}</li>`).join("")}</ul>
        </div>` : ""}
    </section>

    <div class="review-notes field">
      <label for="inventory-review-notes">검수 메모</label>
      <textarea id="inventory-review-notes" placeholder="제목 수정 이유, 보류 이유, 중복 대상 등을 남기세요." ${item.alreadyApproved ? "disabled" : ""}>${escapeHtml(currentNotes)}</textarea>
    </div>

    ${item.alreadyApproved
      ? '<div class="review-actions"><span class="field-hint">이미 정본에 등록되어 목록 검수를 건너뜁니다.</span></div>'
      : `<div class="review-actions">
          <div class="review-actions-group">
            <button id="inventory-exclude-button" class="button button-danger" type="button">제외</button>
            <button id="inventory-hold-button" class="button button-secondary" type="button">보류</button>
            ${item.decision ? '<button id="inventory-reset-button" class="button button-quiet" type="button">결정 취소</button>' : ""}
          </div>
          <div class="review-actions-group">
            <button id="inventory-approve-button" class="button button-primary" type="button">다음 조사 승인</button>
          </div>
        </div>`}
  `;
  attachInventoryReviewEvents(item);
}

function attachInventoryReviewEvents(item) {
  const titleInput = document.querySelector("#inventory-resolved-title");
  const notesInput = document.querySelector("#inventory-review-notes");
  const markDirty = () => {
    currentNotes = notesInput?.value || "";
    setDirty(true);
  };
  titleInput?.addEventListener("input", markDirty);
  notesInput?.addEventListener("input", markDirty);
  document.querySelector("#inventory-approve-button")?.addEventListener("click", () => saveInventoryDecision("research-approved", item));
  document.querySelector("#inventory-hold-button")?.addEventListener("click", () => saveInventoryDecision("hold", item));
  document.querySelector("#inventory-exclude-button")?.addEventListener("click", () => saveInventoryDecision("excluded", item));
  document.querySelector("#inventory-reset-button")?.addEventListener("click", () => saveInventoryDecision("pending", item));
}

const deepAssessmentLabels = {
  verified: "검증됨",
  reported: "자료상 보고",
  anecdotal: "일화",
  contested: "상충",
  inferred: "추론",
};

const deepConfidenceLabels = {
  high: "높음",
  medium: "중간",
  low: "낮음",
};

const commentStatusLabels = {
  available: "공개 댓글 확인",
  "available-empty": "공개 댓글 0개",
  unavailable: "댓글 확인 불가",
};

function renderDeepBadge(value, labels, className = "") {
  if (!value) return "";
  return `<span class="deep-badge ${escapeHtml(className)} ${escapeHtml(value)}">${escapeHtml(labels[value] || value)}</span>`;
}

function renderDeepReferences(item, refs) {
  const records = new Map([
    ...item.evidence.map((record) => [record.id, { ...record, recordKind: "evidence" }]),
    ...item.youtubeSamples.map((record) => [record.id, { ...record, recordKind: "youtube" }]),
  ]);
  const uniqueRefs = [...new Set(refs || [])];
  if (!uniqueRefs.length) return '<p class="deep-empty">연결된 근거 ID가 없습니다.</p>';
  return `<div class="deep-reference-list">${uniqueRefs.map((ref) => {
    const record = records.get(ref);
    if (!record) return `<span class="deep-reference missing" title="배치에서 해당 ID를 찾지 못했습니다.">${escapeHtml(ref)}</span>`;
    const label = record.title || record.publisher || ref;
    const url = safeExternalUrl(record.url);
    const prefix = record.recordKind === "youtube" ? "영상" : record.type || "출처";
    return url === "#"
      ? `<span class="deep-reference"><small>${escapeHtml(prefix)}</small>${escapeHtml(label)}</span>`
      : `<a class="deep-reference" href="${escapeHtml(url)}" target="_blank" rel="noreferrer"><small>${escapeHtml(prefix)}</small>${escapeHtml(label)} ↗</a>`;
  }).join("")}</div>`;
}

function renderDeepReview(item) {
  if (!["claims", "sources", "videos", "notes"].includes(currentTab)) currentTab = "claims";
  const status = deepItemStatus(item);
  const song = item.song;
  const unresolvedCount = (song.unresolved || []).length;
  const sampleCount = item.youtubeSamples.length;
  const commentCount = item.youtubeSamples.filter(({ commentsStatus }) => commentsStatus === "available").length;
  const aliases = song.aliases || [];

  reviewPane.innerHTML = `
    <header class="review-header">
      <div>
        <p class="eyebrow">${escapeHtml(item.organization.name)} · 심층 검수</p>
        <h2>${escapeHtml(song.title)}</h2>
        <p>${escapeHtml(song.id)} · ${escapeHtml(item.sourceBatchId)} · ${escapeHtml(item.checkedAt || "확인일 미기록")}</p>
      </div>
      <span class="status-badge ${escapeHtml(status)}">${escapeHtml(statusLabel(status))}</span>
    </header>

    <div class="deep-stat-grid">
      <div class="deep-stat"><strong>${(song.claims || []).length}</strong><span>검증 주장</span></div>
      <div class="deep-stat"><strong>${item.evidence.length}</strong><span>문서 근거</span></div>
      <div class="deep-stat"><strong>${sampleCount}</strong><span>YouTube</span></div>
      <div class="deep-stat"><strong>${commentCount}</strong><span>댓글 확인 영상</span></div>
      <div class="deep-stat"><strong>${unresolvedCount}</strong><span>미해결</span></div>
    </div>

    <div class="inventory-guide">
      <strong>심층 조사 검수</strong>
      <span>주장과 연결 출처, 영상 설명·댓글 요약을 대조해 판단하세요. 여기서의 승인은 조사 내용 승인 기록이며, 사이트 정본 반영은 별도 편집 단계에서 진행합니다.</span>
    </div>

    <div class="validation-banner ${sampleCount >= 5 && !item.decision?.isStale ? "ok" : ""}">
      ${item.decision?.isStale
        ? "<span><strong>승인 이후 조사 파일이 바뀌었습니다.</strong><br />변경된 자료를 다시 확인한 뒤 결정을 갱신하세요.</span>"
        : sampleCount < 5
          ? `<span><strong>YouTube 표본 부족</strong><br />현재 ${sampleCount}개로, 심층 조사 기준인 곡당 5개를 채우지 못했습니다.</span>`
          : `<span><strong>수집 기준 충족</strong><br />영상 ${sampleCount}개와 문서 근거 ${item.evidence.length}건이 연결되어 있습니다. 미해결 항목 ${unresolvedCount}개는 승인 판단에 함께 반영하세요.</span>`}
    </div>

    ${aliases.length ? `<div class="title-context deep-aliases"><span class="section-label">별칭</span>${aliases.map((alias) => `<span class="title-chip">${escapeHtml(alias)}</span>`).join("")}</div>` : ""}
    ${item.canonicalMatches.length ? `<p class="inventory-existing deep-canonical"><strong>연결된 사이트 정본</strong><br />${item.canonicalMatches.map((match) => `${escapeHtml(match.title)} · ${escapeHtml(match.id)}`).join("<br />")}</p>` : ""}

    <div class="tab-list" role="tablist" aria-label="심층 조사 보기">
      ${tabButton("claims", `주장 ${(song.claims || []).length}`)}
      ${tabButton("sources", `문서 근거 ${item.evidence.length}`)}
      ${tabButton("videos", `YouTube ${sampleCount}`)}
      ${tabButton("notes", `일화·미해결 ${unresolvedCount}`)}
    </div>

    <section id="tab-content">${renderDeepCurrentTab(item)}</section>

    <div class="review-notes field">
      <label for="deep-review-notes">검수 메모</label>
      <textarea id="deep-review-notes" placeholder="수정할 주장, 부족한 출처, 승인 판단 근거를 남기세요.">${escapeHtml(currentNotes)}</textarea>
    </div>

    <div class="review-actions">
      <div class="review-actions-group">
        <button id="deep-changes-button" class="button button-danger" type="button">수정 요청</button>
        <button id="deep-hold-button" class="button button-secondary" type="button">보류</button>
        ${item.decision ? '<button id="deep-reset-button" class="button button-quiet" type="button">결정 취소</button>' : ""}
      </div>
      <div class="review-actions-group">
        <button id="deep-approve-button" class="button button-primary" type="button">심층 조사 승인</button>
      </div>
    </div>`;

  attachDeepReviewEvents(item);
}

function renderDeepCurrentTab(item) {
  if (currentTab === "sources") return renderDeepSources(item);
  if (currentTab === "videos") return renderDeepVideos(item);
  if (currentTab === "notes") return renderDeepNotes(item);
  return renderDeepClaims(item);
}

function renderDeepClaims(item) {
  const song = item.song;
  return `
    <section class="panel deep-panel">
      <div class="form-section">
        <div class="form-section-head"><div><h3>조사 요약</h3><p>수집 세션이 곡의 계보와 현재성을 종합한 설명입니다.</p></div></div>
        <p class="deep-summary">${escapeHtml(song.summary || "요약이 없습니다.")}</p>
        <dl class="definition-list deep-meta-list">
          <dt>현행 상태</dt><dd>${escapeHtml(song.currentStatus || "기록 없음")}</dd>
          <dt>사용 맥락</dt><dd>${(song.usageContexts || []).length ? `<ul>${song.usageContexts.map((context) => `<li>${escapeHtml(context)}</li>`).join("")}</ul>` : "기록 없음"}</dd>
        </dl>
      </div>
      <div class="form-section">
        <div class="form-section-head"><div><h3>필드별 주장</h3><p>상충값은 합치지 않고 각각의 판정·신뢰도·연결 근거를 그대로 보여줍니다.</p></div></div>
        <div class="deep-claim-list">
          ${(song.claims || []).length
            ? song.claims.map((claim, index) => renderDeepClaim(item, claim, index)).join("")
            : '<div class="no-diff">기록된 주장이 없습니다.</div>'}
        </div>
      </div>
    </section>`;
}

function renderDeepClaim(item, claim, index) {
  return `
    <article class="deep-claim">
      <header>
        <div><span class="deep-sequence">${index + 1}</span><code>${escapeHtml(claim.field || "field")}</code></div>
        <div class="deep-badges">
          ${renderDeepBadge(claim.assessment, deepAssessmentLabels, "assessment")}
          ${renderDeepBadge(claim.confidence, deepConfidenceLabels, "confidence-level")}
        </div>
      </header>
      <p class="deep-claim-value">${escapeHtml(prettyValue(claim.value))}</p>
      ${claim.notes ? `<p class="deep-claim-notes"><strong>판단 메모</strong> ${escapeHtml(claim.notes)}</p>` : ""}
      <div class="deep-linked-evidence"><span class="section-label">이 주장에 연결된 근거</span>${renderDeepReferences(item, claim.evidenceRefs)}</div>
    </article>`;
}

function renderDeepSources(item) {
  return `
    <section class="evidence-section">
      <div class="evidence-toolbar"><h3>곡에 연결된 문서 근거</h3><span class="evidence-count">총 ${item.evidence.length}건</span></div>
      ${item.evidence.length
        ? item.evidence.map((record) => renderDeepSourceCard(record)).join("")
        : '<div class="no-diff">이 곡에 연결된 문서 근거가 없습니다.</div>'}
    </section>`;
}

function renderDeepSourceCard(record) {
  const url = safeExternalUrl(record.url);
  return `
    <article class="evidence-card deep-source-card">
      <div class="evidence-card-head">
        <div>
          <span class="evidence-kind">${escapeHtml(record.type || "source")}</span>
          <h4>${escapeHtml(record.title || record.id)}</h4>
          <p>${escapeHtml(record.publisher || "발행처 미기록")} · 발행 ${escapeHtml(record.publishedAt || "미기록")} · 확인 ${escapeHtml(record.accessedAt || "미기록")}</p>
        </div>
        ${url === "#" ? `<code>${escapeHtml(record.url || record.id)}</code>` : `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">원문 열기 ↗</a>`}
      </div>
      <p class="deep-source-summary">${escapeHtml(record.summary || "출처 요약이 없습니다.")}</p>
      ${(record.supports || []).length ? `<div class="deep-supports"><span class="section-label">뒷받침하는 항목</span>${record.supports.map((support) => `<code>${escapeHtml(support)}</code>`).join("")}</div>` : ""}
    </article>`;
}

function renderDeepVideos(item) {
  const player = activeVideoId && /^[A-Za-z0-9_-]{11}$/.test(activeVideoId)
    ? `<div class="video-player"><iframe src="https://www.youtube-nocookie.com/embed/${escapeHtml(activeVideoId)}" title="YouTube 근거 영상" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
    : "";
  return `
    <section class="evidence-section">
      <div class="evidence-toolbar"><h3>YouTube 교차 확인</h3><span class="evidence-count">총 ${item.youtubeSamples.length}개</span></div>
      ${player}
      ${item.youtubeSamples.length
        ? item.youtubeSamples.map((sample, index) => renderDeepVideoCard(sample, index)).join("")
        : '<div class="no-diff">연결된 YouTube 표본이 없습니다.</div>'}
    </section>`;
}

function renderDeepVideoCard(sample, index) {
  const comments = Array.isArray(sample.commentSummary)
    ? sample.commentSummary
    : sample.commentSummary ? [sample.commentSummary] : [];
  return `
    <article class="evidence-card deep-video-card">
      <div class="evidence-card-head">
        <div>
          <span class="evidence-kind">YOUTUBE ${index + 1}</span>
          <h4>${escapeHtml(sample.title || sample.id)}</h4>
          <p>${escapeHtml(sample.channel || "채널 미기록")} · 게시 ${escapeHtml(sample.publishedAt || "미기록")} · 확인 ${escapeHtml(sample.accessedAt || "미기록")}</p>
        </div>
        <a href="${escapeHtml(safeExternalUrl(sample.url))}" target="_blank" rel="noreferrer">YouTube 열기 ↗</a>
      </div>
      <div class="youtube-summary">
        <p><strong>영상 설명 요약</strong><br />${escapeHtml(sample.descriptionSummary || "요약 없음")}</p>
        <div><strong>댓글 확인</strong> ${renderDeepBadge(sample.commentsStatus, commentStatusLabels, "comment-status")}</div>
        ${comments.length ? `<ul>${comments.map((comment) => `<li>${escapeHtml(comment)}</li>`).join("")}</ul>` : '<p class="deep-empty">저장된 댓글 요약이 없습니다.</p>'}
        ${sample.videoId ? `<button class="video-button play-video-button" type="button" data-video-id="${escapeHtml(sample.videoId)}">이 화면에서 영상 보기 ▶</button>` : ""}
      </div>
      ${(sample.supports || []).length ? `<div class="deep-supports"><span class="section-label">확인 항목</span>${sample.supports.map((support) => `<code>${escapeHtml(support)}</code>`).join("")}</div>` : ""}
    </article>`;
}

function renderDeepNotes(item) {
  const song = item.song;
  const lyrics = song.lyrics || {};
  return `
    <div class="research-grid deep-notes-grid">
      <article class="research-card research-card-wide">
        <h3>일화·여담</h3>
        ${(song.trivia || []).length
          ? `<div class="deep-trivia-list">${song.trivia.map((trivia) => `
              <section class="deep-trivia">
                <div class="deep-badges">${renderDeepBadge(trivia.assessment, deepAssessmentLabels, "assessment")}${renderDeepBadge(trivia.confidence, deepConfidenceLabels, "confidence-level")}</div>
                <p>${escapeHtml(trivia.summary || "요약 없음")}</p>
                ${renderDeepReferences(item, trivia.evidenceRefs)}
              </section>`).join("")}</div>`
          : '<p class="field-hint">기록된 여담이 없습니다.</p>'}
      </article>
      <article class="research-card">
        <h3>미해결 항목</h3>
        ${(song.unresolved || []).length
          ? `<ul>${song.unresolved.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ul>`
          : '<p class="field-hint">기록된 미해결 항목이 없습니다.</p>'}
      </article>
      <article class="research-card">
        <h3>가사·권리 메타데이터</h3>
        <dl class="definition-list deep-meta-list">
          <dt>전문 저장</dt><dd>${lyrics.fullTextStored ? "저장됨" : "저장하지 않음"}</dd>
          <dt>권리 상태</dt><dd>${escapeHtml(lyrics.rightsStatus || "미기록")}</dd>
          <dt>구조·주제</dt><dd>${escapeHtml(lyrics.structureSummary || "미기록")}</dd>
          ${lyrics.shortExcerpt ? `<dt>짧은 인용</dt><dd>${escapeHtml(lyrics.shortExcerpt)}</dd>` : ""}
        </dl>
        ${(lyrics.sourceUrls || []).length ? `<ul class="inventory-source-list deep-lyrics-links">${lyrics.sourceUrls.map((url) => `<li><a href="${escapeHtml(safeExternalUrl(url))}" target="_blank" rel="noreferrer">${escapeHtml(url)} ↗</a></li>`).join("")}</ul>` : ""}
      </article>
      <article class="research-card research-card-wide">
        <h3>배치 권리 원칙</h3>
        <p>${escapeHtml(item.rightsNote || "기록 없음")}</p>
      </article>
      <article class="research-card research-card-wide">
        <h3>수집 범위</h3>
        ${renderDefinitionObject(item.batchCoverage)}
        <p class="field-hint">이 수치는 ${escapeHtml(item.sourceBatchId)} 배치 전체 기준입니다.</p>
      </article>
    </div>`;
}

function attachDeepReviewEvents(item) {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      currentNotes = document.querySelector("#deep-review-notes")?.value || currentNotes;
      currentTab = button.dataset.tab;
      renderReviewPane();
    });
  });
  document.querySelector("#deep-review-notes")?.addEventListener("input", (event) => {
    currentNotes = event.currentTarget.value;
    setDirty(true);
  });
  document.querySelectorAll(".play-video-button").forEach((button) => {
    button.addEventListener("click", () => {
      currentNotes = document.querySelector("#deep-review-notes")?.value || currentNotes;
      activeVideoId = button.dataset.videoId;
      renderReviewPane();
      document.querySelector(".video-player")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
  document.querySelector("#deep-changes-button")?.addEventListener("click", () => saveDeepDecision("changes-requested", item));
  document.querySelector("#deep-hold-button")?.addEventListener("click", () => saveDeepDecision("hold", item));
  document.querySelector("#deep-reset-button")?.addEventListener("click", () => saveDeepDecision("pending", item));
  document.querySelector("#deep-approve-button")?.addEventListener("click", () => saveDeepDecision("approved", item));
}

function tabButton(id, label) {
  return `<button class="tab-button ${currentTab === id ? "active" : ""}" type="button" role="tab" data-tab="${id}" aria-selected="${currentTab === id}">${escapeHtml(label)}</button>`;
}

function renderCurrentTab(item) {
  if (currentTab === "research") return renderResearch(item);
  if (currentTab === "evidence") return renderEvidence(item);
  if (currentTab === "diff") return renderDiff(item);
  return renderDraftForm(item);
}

function option(value, label, selectedValue) {
  return `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function renderDraftForm(item) {
  const teams = state.catalogs.teams;
  const originals = state.catalogs.originals;
  const cheerSongs = state.catalogs.cheerSongs.filter(({ id }) => id !== item.candidate.id);
  const sources = Array.isArray(currentDraft.sources) ? currentDraft.sources : [];

  return `
    <form id="canonical-form" class="panel" novalidate>
      <section class="form-section">
        <div class="form-section-head">
          <div><h3>표시 정보</h3><p>사이트 카드와 상세 화면에 보이는 이름과 상징 문구입니다.</p></div>
        </div>
        <div class="field-grid">
          <div class="field">
            <label for="field-title">정식 제목</label>
            <input id="field-title" value="${escapeHtml(currentDraft.title)}" />
          </div>
          <div class="field">
            <label for="field-aliases">별칭 · 한 줄에 하나</label>
            <textarea id="field-aliases">${escapeHtml((currentDraft.aliases || []).join("\n"))}</textarea>
          </div>
          <div class="field">
            <label for="field-symbolic-1">상징 문구 첫 줄</label>
            <input id="field-symbolic-1" value="${escapeHtml(currentDraft.symbolicLines?.[0] || "")}" />
          </div>
          <div class="field">
            <label for="field-symbolic-2">상징 문구 둘째 줄</label>
            <input id="field-symbolic-2" value="${escapeHtml(currentDraft.symbolicLines?.[1] || "")}" />
            <p class="field-hint">슬래시도 입력한 모양 그대로 저장됩니다.</p>
          </div>
        </div>
      </section>

      <section class="form-section">
        <div class="form-section-head">
          <div><h3>팀과 원곡 계보</h3><p>정본에 이미 등록된 팀과 원곡을 연결합니다.</p></div>
        </div>
        <div class="field-grid">
          <div class="field">
            <label for="field-team">팀</label>
            <select id="field-team">
              ${option("", "팀을 선택하세요", currentDraft.teamId)}
              ${teams.map((team) => option(team.id, `${team.name} (${team.id})`, currentDraft.teamId)).join("")}
            </select>
          </div>
          <div class="field">
            <label for="field-original">기반 원곡</label>
            <select id="field-original">
              ${option("", "원곡을 선택하세요", currentDraft.originalSongId)}
              ${originals.map((song) => option(song.id, `${song.title} — ${song.artist}`, currentDraft.originalSongId)).join("")}
            </select>
            <p class="field-hint">목록에 없다면 먼저 <code>data/original-songs.json</code>에 원곡을 등록해야 합니다.</p>
          </div>
          <div class="field">
            <label for="field-origin-type">관계 유형</label>
            <select id="field-origin-type">
              ${option("adaptation", "개사·차용", currentDraft.originType)}
              ${option("arrangement", "편곡", currentDraft.originType)}
              ${option("combined-adaptation", "복합 차용", currentDraft.originType)}
              ${option("commissioned-original", "의뢰 제작곡", currentDraft.originType)}
            </select>
          </div>
          <div class="field">
            <label for="field-source-cheer">직접 차용한 다른 응원가 · 선택</label>
            <select id="field-source-cheer">
              ${option("", "직접 차용 응원가 없음", currentDraft.sourceCheerSongId || "")}
              ${cheerSongs.map((song) => option(song.id, song.title, currentDraft.sourceCheerSongId || "")).join("")}
            </select>
          </div>
          <div class="field field-full">
            <label for="field-secondary-originals">보조 원곡 ID · 한 줄에 하나</label>
            <textarea id="field-secondary-originals">${escapeHtml((currentDraft.secondaryOriginalSongIds || []).join("\n"))}</textarea>
          </div>
          <div class="field field-full">
            <label for="field-origin-note">원곡 관계 설명</label>
            <textarea id="field-origin-note">${escapeHtml(currentDraft.originNote)}</textarea>
          </div>
        </div>
      </section>

      <section class="form-section">
        <div class="form-section-head">
          <div><h3>도입 시점</h3><p>정확한 연도와 비공식·최초 확인 연도를 구분합니다.</p></div>
        </div>
        <div class="field-grid field-grid-three">
          <div class="field">
            <label for="field-year-status">연도 상태</label>
            <select id="field-year-status">
              ${option("confirmed", "공식·확정", currentDraft.yearStatus)}
              ${option("earliest-documented", "최초 확인", currentDraft.yearStatus)}
              ${option("reported", "비공식·보고", currentDraft.yearStatus)}
            </select>
          </div>
          <div class="field">
            <label for="field-year">확정 도입 연도</label>
            <input id="field-year" type="number" min="1800" max="2100" value="${currentDraft.year ?? ""}" ${currentDraft.yearStatus !== "confirmed" ? "disabled" : ""} />
          </div>
          <div class="field">
            <label for="field-timeline-year">정렬용 기준 연도</label>
            <input id="field-timeline-year" type="number" min="1800" max="2100" value="${currentDraft.timelineYear ?? ""}" />
          </div>
          <div class="field field-full">
            <label for="field-year-label">사이트 표시 문구</label>
            <input id="field-year-label" value="${escapeHtml(currentDraft.yearLabel)}" />
          </div>
          <div class="field field-full">
            <label for="field-chronology-note">연도 판단 근거와 불확실성</label>
            <textarea id="field-chronology-note">${escapeHtml(currentDraft.chronologyNote)}</textarea>
          </div>
        </div>
      </section>

      <section class="form-section">
        <div class="form-section-head">
          <div><h3>설명과 사용 맥락</h3><p>조사 결과를 사이트 독자가 이해하기 쉬운 문장으로 다듬습니다.</p></div>
        </div>
        <div class="field-grid">
          <div class="field">
            <label for="field-description">곡 설명</label>
            <textarea id="field-description">${escapeHtml(currentDraft.description)}</textarea>
          </div>
          <div class="field">
            <label for="field-usage">사용 맥락</label>
            <textarea id="field-usage">${escapeHtml(currentDraft.usageContext)}</textarea>
          </div>
        </div>
      </section>

      <section class="form-section">
        <div class="form-section-head">
          <div><h3>정본 출처</h3><p>사이트에 함께 남길 핵심 출처만 선택합니다. 조사 근거 탭에서 바로 추가할 수 있습니다.</p></div>
          <button id="add-source-button" class="button button-secondary" type="button">출처 추가</button>
        </div>
        <div id="source-list" class="source-list">
          ${sources.length ? sources.map(renderSourceRow).join("") : '<p class="field-hint">아직 선택한 정본 출처가 없습니다.</p>'}
        </div>
      </section>
    </form>`;
}

function renderSourceRow(source, index) {
  return `
    <div class="source-row" data-source-index="${index}">
      <input class="source-label" aria-label="출처 이름" placeholder="출처 이름" value="${escapeHtml(source.label)}" />
      <input class="source-url" aria-label="출처 URL" placeholder="https://…" value="${escapeHtml(source.url)}" />
      <select class="source-scope" aria-label="출처 범위">
        ${option("", "범위 선택", source.scope || "")}
        ${option("title", "제목", source.scope || "")}
        ${option("origin", "원곡", source.scope || "")}
        ${option("chronology", "연도", source.scope || "")}
        ${option("usage", "사용 맥락", source.scope || "")}
      </select>
      <button class="icon-button remove-source-button" type="button" aria-label="출처 삭제">×</button>
    </div>`;
}

function prettyValue(value) {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.map((item) => (typeof item === "object" ? JSON.stringify(item, null, 2) : item)).join("\n");
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function renderDefinitionObject(value) {
  if (!value || typeof value !== "object") return '<p class="field-hint">조사 내용이 없습니다.</p>';
  return `<dl class="definition-list">${Object.entries(value)
    .map(([key, item]) => `
      <dt>${escapeHtml(researchLabels[key] || key)}</dt>
      <dd>${key === "confidence" ? `<span class="confidence">${escapeHtml(prettyValue(item))}</span>` : `<span class="diff-value">${escapeHtml(prettyValue(item))}</span>`}</dd>`)
    .join("")}</dl>`;
}

function renderResearch(item) {
  const candidate = item.candidate;
  return `
    <div class="research-grid">
      <article class="research-card research-card-wide">
        <h3>조사 요약</h3>
        <p>${escapeHtml(candidate.description || "설명이 없습니다.")}</p>
        <p><strong>사용 맥락</strong><br />${escapeHtml(candidate.usageContext || "기록 없음")}</p>
      </article>
      <article class="research-card">
        <h3>원곡 계보</h3>
        ${renderDefinitionObject(candidate.origin)}
      </article>
      <article class="research-card">
        <h3>도입 시점</h3>
        ${renderDefinitionObject(candidate.chronology)}
      </article>
      <article class="research-card">
        <h3>필드 신뢰도</h3>
        ${renderDefinitionObject(candidate.fieldConfidence)}
      </article>
      <article class="research-card">
        <h3>미해결 질문</h3>
        ${(candidate.openQuestions || []).length
          ? `<ul>${candidate.openQuestions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ul>`
          : '<p class="field-hint">기록된 미해결 질문이 없습니다.</p>'}
      </article>
    </div>`;
}

function evidenceLink(evidence, index) {
  if (!evidence.url) return "";
  return `<a href="${escapeHtml(safeExternalUrl(evidence.url))}" target="_blank" rel="noreferrer">원문 열기 ↗</a>
    <button class="video-button add-evidence-source" type="button" data-evidence-index="${index}" data-source-index="root">정본 출처에 추가</button>`;
}

function renderEvidence(item) {
  const player = activeVideoId && /^[A-Za-z0-9_-]{11}$/.test(activeVideoId)
    ? `<div class="video-player"><iframe src="https://www.youtube-nocookie.com/embed/${escapeHtml(activeVideoId)}" title="YouTube 근거 영상" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
    : "";
  return `
    <section class="evidence-section">
      <div class="evidence-toolbar">
        <h3>연결된 조사 근거</h3>
        <span class="evidence-count">총 ${item.evidence.length}건</span>
      </div>
      ${player}
      ${item.evidence.length
        ? item.evidence.map((evidence, index) => renderEvidenceCard(evidence, index)).join("")
        : '<div class="no-diff">이 후보에 연결된 근거가 없습니다.</div>'}
    </section>`;
}

function renderEvidenceCard(evidence, index) {
  const observations = evidence.observations || [];
  const sourceLinks = (evidence.sources || []).map((source, sourceIndex) => `
    <li>
      <a href="${escapeHtml(safeExternalUrl(source.url))}" target="_blank" rel="noreferrer">${escapeHtml(source.title || source.url)}</a>
      ${source.observation ? ` — ${escapeHtml(source.observation)}` : ""}
      <button class="video-button add-evidence-source" type="button" data-evidence-index="${index}" data-source-index="${sourceIndex}">정본 출처에 추가</button>
    </li>`).join("");
  const youtube = evidence.youtube;
  return `
    <article class="evidence-card">
      <div class="evidence-card-head">
        <div>
          <span class="evidence-kind">${escapeHtml(evidence.kind || evidence.sourceClass || "source")}</span>
          <h4>${escapeHtml(evidence.title || evidence.id)}</h4>
          <p>${escapeHtml(evidence.publisher || "발행처 미기록")} · ${escapeHtml(evidence.checkedAt || "확인일 미기록")}</p>
        </div>
        <div>${evidenceLink(evidence, index)}</div>
      </div>
      ${observations.length ? `<ul>${observations.map((observation) => `<li>${escapeHtml(observation)}</li>`).join("")}</ul>` : ""}
      ${sourceLinks ? `<ul>${sourceLinks}</ul>` : ""}
      ${youtube ? `
        <div class="youtube-summary">
          <p><strong>영상 설명</strong> ${escapeHtml(youtube.descriptionSummary || "요약 없음")}</p>
          <p><strong>댓글 교차 확인</strong> ${escapeHtml(youtube.commentSummary || "요약 없음")}</p>
          ${youtube.videoId ? `<button class="video-button play-video-button" type="button" data-video-id="${escapeHtml(youtube.videoId)}">이 화면에서 영상 보기 ▶</button>` : ""}
        </div>` : ""}
    </article>`;
}

function renderDiff(item) {
  const previous = item.canonical || {};
  const keys = Object.keys(currentDraft || {}).filter((key) => !isEqual(previous[key], currentDraft[key]));
  if (keys.length === 0) return '<div class="no-diff">현재 사이트 데이터와 동일합니다.</div>';
  return `
    <div class="diff-list">
      ${keys.map((key) => `
        <article class="diff-item">
          <strong>${escapeHtml(fieldLabels[key] || key)}</strong>
          <div><span class="section-label">현재 사이트</span><div class="diff-value">${escapeHtml(prettyValue(previous[key]))}</div></div>
          <div><span class="section-label">검수 초안</span><div class="diff-value next">${escapeHtml(prettyValue(currentDraft[key]))}</div></div>
        </article>`).join("")}
    </div>`;
}

function numberOrNull(element) {
  const value = element?.value.trim();
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function splitLines(value) {
  return [...new Set(String(value || "").split(/\n|,/).map((item) => item.trim()).filter(Boolean))];
}

function captureForm() {
  const form = document.querySelector("#canonical-form");
  if (!form || !currentDraft) {
    const notes = document.querySelector("#review-notes");
    if (notes) currentNotes = notes.value;
    return currentDraft;
  }
  const sourceCheerSongId = document.querySelector("#field-source-cheer").value;
  const yearStatus = document.querySelector("#field-year-status").value;
  const sources = [...document.querySelectorAll(".source-row")].map((row) => {
    const source = {
      label: row.querySelector(".source-label").value.trim(),
      url: row.querySelector(".source-url").value.trim(),
    };
    const scope = row.querySelector(".source-scope").value;
    if (scope) source.scope = scope;
    return source;
  });

  currentDraft = {
    ...currentDraft,
    id: selectedCandidateId,
    title: document.querySelector("#field-title").value.trim(),
    aliases: splitLines(document.querySelector("#field-aliases").value),
    symbolicLines: [
      document.querySelector("#field-symbolic-1").value.trim(),
      document.querySelector("#field-symbolic-2").value.trim(),
    ],
    teamId: document.querySelector("#field-team").value,
    originalSongId: document.querySelector("#field-original").value,
    originType: document.querySelector("#field-origin-type").value,
    originNote: document.querySelector("#field-origin-note").value.trim(),
    yearStatus,
    year: yearStatus === "confirmed" ? numberOrNull(document.querySelector("#field-year")) : null,
    timelineYear: numberOrNull(document.querySelector("#field-timeline-year")),
    yearLabel: document.querySelector("#field-year-label").value.trim(),
    chronologyNote: document.querySelector("#field-chronology-note").value.trim(),
    description: document.querySelector("#field-description").value.trim(),
    usageContext: document.querySelector("#field-usage").value.trim(),
    status: "verified",
    sources,
    secondaryOriginalSongIds: splitLines(document.querySelector("#field-secondary-originals").value),
  };
  if (sourceCheerSongId) currentDraft.sourceCheerSongId = sourceCheerSongId;
  else delete currentDraft.sourceCheerSongId;
  if (currentDraft.secondaryOriginalSongIds.length === 0) delete currentDraft.secondaryOriginalSongIds;

  const notes = document.querySelector("#review-notes");
  if (notes) currentNotes = notes.value;
  return currentDraft;
}

function attachReviewEvents() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      captureForm();
      currentTab = button.dataset.tab;
      renderReviewPane();
    });
  });

  document.querySelector("#canonical-form")?.addEventListener("input", () => {
    setDirty(true);
    captureForm();
    renderValidationBanner();
  });
  document.querySelector("#review-notes")?.addEventListener("input", (event) => {
    currentNotes = event.currentTarget.value;
    setDirty(true);
  });
  document.querySelector("#field-year-status")?.addEventListener("change", (event) => {
    captureForm();
    const yearInput = document.querySelector("#field-year");
    yearInput.disabled = event.currentTarget.value !== "confirmed";
    if (event.currentTarget.value !== "confirmed") yearInput.value = "";
    setDirty(true);
    captureForm();
    renderValidationBanner();
  });

  document.querySelector("#add-source-button")?.addEventListener("click", () => {
    captureForm();
    currentDraft.sources = [...(currentDraft.sources || []), { label: "", url: "" }];
    setDirty(true);
    renderReviewPane();
  });
  document.querySelectorAll(".remove-source-button").forEach((button) => {
    button.addEventListener("click", () => {
      captureForm();
      const index = Number.parseInt(button.closest(".source-row").dataset.sourceIndex, 10);
      currentDraft.sources.splice(index, 1);
      setDirty(true);
      renderReviewPane();
    });
  });
  document.querySelectorAll(".play-video-button").forEach((button) => {
    button.addEventListener("click", () => {
      activeVideoId = button.dataset.videoId;
      renderReviewPane();
      document.querySelector(".video-player")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
  document.querySelectorAll(".add-evidence-source").forEach((button) => {
    button.addEventListener("click", () => addEvidenceSource(button));
  });

  document.querySelector("#save-draft-button")?.addEventListener("click", () => saveCurrentDecision("pending"));
  document.querySelector("#reject-button")?.addEventListener("click", () => saveCurrentDecision("rejected"));
  document.querySelector("#approve-button")?.addEventListener("click", () => saveCurrentDecision("approved"));
  document.querySelector("#approve-publish-button")?.addEventListener("click", approveAndPublishCurrent);
}

function addEvidenceSource(button) {
  const item = currentItem();
  const evidence = item?.evidence[Number.parseInt(button.dataset.evidenceIndex, 10)];
  if (!evidence) return;
  const sourceIndex = button.dataset.sourceIndex;
  const raw = sourceIndex === "root" ? {
    label: evidence.title || evidence.publisher || "조사 근거",
    url: evidence.url,
    scope: evidence.kind === "youtube" ? "usage" : undefined,
  } : {
    label: evidence.sources?.[Number.parseInt(sourceIndex, 10)]?.title || evidence.title || "조사 근거",
    url: evidence.sources?.[Number.parseInt(sourceIndex, 10)]?.url,
  };
  if (!raw.url) return;
  captureForm();
  if ((currentDraft.sources || []).some(({ url }) => url === raw.url)) {
    toast("이미 정본 출처에 추가된 주소입니다.");
    return;
  }
  currentDraft.sources = [...(currentDraft.sources || []), raw];
  currentTab = "draft";
  setDirty(true);
  renderReviewPane();
  toast("조사 근거를 정본 출처에 추가했습니다.");
}

function nextPendingInventoryItemId(item) {
  const batch = currentBatch();
  if (!batch || batch.kind !== "inventory") return null;
  const sameOrganization = batch.inventoryItems.filter(
    (entry) => entry.organizationId === item.organizationId && !entry.alreadyApproved,
  );
  const currentIndex = sameOrganization.findIndex((entry) => entry.itemId === item.itemId);
  const ordered = [
    ...sameOrganization.slice(currentIndex + 1),
    ...sameOrganization.slice(0, currentIndex),
  ];
  return ordered.find((entry) => inventoryItemStatus(entry) === "pending")?.itemId || null;
}

async function saveInventoryDecision(decision, item) {
  if (busy) return;
  const resolvedTitle = document.querySelector("#inventory-resolved-title")?.value.trim() || item.title;
  currentNotes = document.querySelector("#inventory-review-notes")?.value || "";
  if (decision !== "pending" && !resolvedTitle) {
    toast("검수 후 사용할 곡명을 입력하세요.", "error");
    return;
  }
  const nextItemId = decision === "pending" ? null : nextPendingInventoryItemId(item);
  setBusy(true, "목록 검수 결정 저장 중…");
  try {
    await api("/api/inventory/decision", {
      method: "POST",
      body: {
        batchId: selectedBatchId,
        organizationId: item.organizationId,
        title: item.title,
        resolvedTitle,
        decision,
        notes: currentNotes,
      },
    });
    const message = {
      "research-approved": "다음 심층 조사 대상으로 승인했습니다.",
      hold: "보류로 저장했습니다.",
      excluded: "제외 대상으로 저장했습니다.",
      pending: "검수 결정을 취소했습니다.",
    }[decision];
    toast(message);
    await loadState();
    if (nextItemId && batchItems().some((entry) => entry.itemId === nextItemId)) {
      selectedCandidateId = nextItemId;
      resetEditorFromState();
      renderSidebar();
      renderReviewPane();
    }
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
}

function nextPendingDeepItemId(item) {
  const batch = currentBatch();
  if (!batch || batch.kind !== "deep") return null;
  const sameOrganization = batch.deepItems.filter(
    (entry) => entry.organization.id === item.organization.id,
  );
  const currentIndex = sameOrganization.findIndex((entry) => entry.itemId === item.itemId);
  const ordered = [
    ...sameOrganization.slice(currentIndex + 1),
    ...sameOrganization.slice(0, currentIndex),
  ];
  return ordered.find((entry) => ["pending", "stale"].includes(deepItemStatus(entry)))?.itemId || null;
}

async function saveDeepDecision(decision, item) {
  if (busy) return;
  currentNotes = document.querySelector("#deep-review-notes")?.value || "";
  if (decision === "changes-requested" && !currentNotes.trim()) {
    toast("수정할 내용을 검수 메모에 먼저 남겨주세요.", "error");
    return;
  }
  const nextItemId = decision === "pending" ? null : nextPendingDeepItemId(item);
  setBusy(true, "심층 검수 결정 저장 중…");
  try {
    await api("/api/deep/decision", {
      method: "POST",
      body: {
        sourceBatchId: item.sourceBatchId,
        songId: item.song.id,
        decision,
        notes: currentNotes,
      },
    });
    const message = {
      approved: "심층 조사 내용을 승인했습니다.",
      "changes-requested": "수정 요청과 메모를 저장했습니다.",
      hold: "심층 검수를 보류했습니다.",
      pending: "심층 검수 결정을 취소했습니다.",
    }[decision];
    toast(message);
    await loadState();
    if (nextItemId && batchItems().some((entry) => entry.itemId === nextItemId)) {
      selectedCandidateId = nextItemId;
      currentTab = "claims";
      resetEditorFromState();
      renderSidebar();
      renderReviewPane();
    }
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
}

async function saveCurrentDecision(decision) {
  if (busy) return;
  captureForm();
  setBusy(true, decision === "approved" ? "승인 저장 중…" : "초안 저장 중…");
  try {
    await api("/api/decision", {
      method: "POST",
      body: { batchId: selectedBatchId, candidateId: selectedCandidateId, draft: currentDraft, decision, notes: currentNotes },
    });
    toast(decision === "approved" ? "승인을 기록했습니다." : decision === "rejected" ? "반려 내용을 저장했습니다." : "초안을 저장하고 검수 대기로 전환했습니다.");
    await loadState();
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
}

async function approveAndPublishCurrent() {
  if (busy) return;
  captureForm();
  setBusy(true, "승인 내용 반영 중…");
  try {
    await api("/api/decision", {
      method: "POST",
      body: { batchId: selectedBatchId, candidateId: selectedCandidateId, draft: currentDraft, decision: "approved", notes: currentNotes },
    });
    const result = await api("/api/publish", {
      method: "POST",
      body: { batchId: selectedBatchId, candidateIds: [selectedCandidateId] },
    });
    toast("승인 내용을 정본 데이터에 반영했습니다.");
    if (result.validationOutput) showOutput("사이트 반영 완료", result.validationOutput);
    await loadState();
  } catch (error) {
    showError(error);
    await loadState();
  } finally {
    setBusy(false);
  }
}

async function publishBatch() {
  if (busy) return;
  captureForm();
  if (dirty && !window.confirm("저장하지 않은 현재 편집 내용은 일괄 반영에 포함되지 않습니다. 계속할까요?")) return;
  setBusy(true, "승인 항목 일괄 반영 중…");
  try {
    const result = await api("/api/publish", {
      method: "POST",
      body: { batchId: selectedBatchId },
    });
    toast(`${result.publishedIds.length}곡을 정본 데이터에 반영했습니다.`);
    showOutput("일괄 반영 완료", `${result.publishedIds.join("\n")}\n\n${result.validationOutput || ""}`);
    await loadState();
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
}

async function runFullCheck() {
  if (busy) return;
  setBusy(true, "데이터·타입·빌드 검사 중…");
  try {
    const result = await api("/api/check", { method: "POST", body: {} });
    toast("전체 검사를 통과했습니다.");
    showOutput("전체 검사 통과", result.output);
  } catch (error) {
    showError(error);
    if (error.details?.length) showOutput("전체 검사 실패", error.details.join("\n"));
  } finally {
    setBusy(false);
  }
}

function confirmDiscardChanges() {
  return !dirty || window.confirm("저장하지 않은 편집 내용을 버리고 이동할까요?");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  const submitButton = loginForm.querySelector("button");
  submitButton.disabled = true;
  try {
    await api("/api/login", { method: "POST", body: { pin: new FormData(loginForm).get("pin") } });
    loginForm.reset();
    await loadState();
  } catch (error) {
    loginError.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

batchSelect.addEventListener("change", () => {
  if (!confirmDiscardChanges()) {
    batchSelect.value = selectedBatchId;
    return;
  }
  selectedBatchId = batchSelect.value;
  selectedOrganizationId = "all";
  activeFilter = "all";
  const batch = currentBatch();
  selectedCandidateId = batchItems(batch)[0] ? itemIdentifier(batchItems(batch)[0], batch) : null;
  currentTab = batch?.kind === "deep" ? "claims" : "draft";
  resetEditorFromState();
  renderShell();
});

candidateList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-candidate-id], [data-item-id], [data-deep-id]");
  const itemId = button?.dataset.candidateId || button?.dataset.itemId || button?.dataset.deepId;
  if (!button || itemId === selectedCandidateId || !confirmDiscardChanges()) return;
  selectedCandidateId = itemId;
  currentTab = currentBatch()?.kind === "deep" ? "claims" : "draft";
  resetEditorFromState();
  renderSidebar();
  renderReviewPane();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

filterRow.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  renderSidebar();
});

organizationSelect.addEventListener("change", () => {
  if (!confirmDiscardChanges()) {
    organizationSelect.value = selectedOrganizationId;
    return;
  }
  selectedOrganizationId = organizationSelect.value;
  const batch = currentBatch();
  const first = batch?.kind === "deep"
    ? batch.deepItems.find(
        (item) => selectedOrganizationId === "all" || item.organization.id === selectedOrganizationId,
      )
    : batch?.inventoryItems.find(
        (item) => selectedOrganizationId === "all" || item.organizationId === selectedOrganizationId,
      );
  selectedCandidateId = first?.itemId || null;
  currentTab = batch?.kind === "deep" ? "claims" : "draft";
  resetEditorFromState();
  renderSidebar();
  renderReviewPane();
});

searchInput.addEventListener("input", renderSidebar);
publishBatchButton.addEventListener("click", publishBatch);
document.querySelector("#check-button").addEventListener("click", runFullCheck);
document.querySelector("#refresh-button").addEventListener("click", async () => {
  if (!confirmDiscardChanges()) return;
  setBusy(true, "새로고침 중…");
  try {
    await loadState();
    toast("파일에서 최신 내용을 불러왔습니다.");
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
});
document.querySelector("#logout-button").addEventListener("click", async () => {
  if (!confirmDiscardChanges()) return;
  await api("/api/logout", { method: "POST", body: {} });
  state = null;
  showLogin();
});

window.addEventListener("beforeunload", (event) => {
  if (!dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

window.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "s" && appView.hidden === false && currentBatch()?.kind === "detailed") {
    event.preventDefault();
    saveCurrentDecision("pending");
  }
});

async function bootstrap() {
  try {
    const session = await api("/api/session");
    if (!session.authenticated) return showLogin();
    await loadState();
  } catch (error) {
    showLogin();
    loginError.textContent = error.message;
  }
}

bootstrap();
