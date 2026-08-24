import { linkifyHttpUrls, parseInlineNotes } from "/shared/inline-notes.mjs";

const organizationSelect = document.querySelector("#organization-select");
const bucketTabs = document.querySelector("#bucket-tabs");
const searchInput = document.querySelector("#search-input");
const songList = document.querySelector("#song-list");
const importForm = document.querySelector("#import-form");
const refreshButton = document.querySelector("#refresh-button");
const saveStatus = document.querySelector("#save-status");
const emptyState = document.querySelector("#empty-state");
const songForm = document.querySelector("#song-form");
const originBadge = document.querySelector("#origin-badge");
const stageBadge = document.querySelector("#stage-badge");
const publishedBadge = document.querySelector("#published-badge");
const editorHeading = document.querySelector("#editor-heading");
const editorSubtitle = document.querySelector("#editor-subtitle");
const titleInput = document.querySelector("#title-input");
const aliasesInput = document.querySelector("#aliases-input");
const scopeSelect = document.querySelector("#scope-select");
const descriptionInput = document.querySelector("#description-input");
const researchButton = document.querySelector("#research-button");
const researchPanel = document.querySelector("#research-panel");
const lyricsInput = document.querySelector("#lyrics-input");
const factsEditor = document.querySelector("#facts-editor");
const videosEditor = document.querySelector("#videos-editor");
const sitePreview = document.querySelector("#site-preview");
const toastRegion = document.querySelector("#toast-region");

const BUCKETS = [
  { value: "target", label: "조사 대상" },
  { value: "deferred", label: "나중에 조사" },
  { value: "discovered_pending", label: "AI 추가 발견" },
  { value: "rejected", label: "제외" },
];
const STAGE_LABELS = {
  listed: "목록 등록",
  researching: "AI 조사 중",
  research_ready: "조사 도착",
  editing: "사용자 편집",
  review_ready: "최종 확인 대기",
  approved: "승인",
  published: "공개",
};
const VIDEO_LABELS = [
  "공식 또는 가사 영상",
  "대표 현장 직캠",
  "추가 영상 1",
  "추가 영상 2",
  "추가 영상 3",
];

let state = null;
let selectedOrganizationId = null;
let activeBucket = "target";
let selectedSongId = null;
let currentSong = null;
let dirty = false;
let busy = false;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function organizationById(id) {
  return state?.organizations.find((organization) => organization.id === id) ?? null;
}

function setDirty(nextDirty) {
  dirty = nextDirty;
  saveStatus.textContent = busy ? saveStatus.textContent : nextDirty ? "저장하지 않은 변경 있음" : "모든 변경 저장됨";
  saveStatus.classList.toggle("is-dirty", nextDirty);
}

function setBusy(nextBusy, message = "처리 중…") {
  busy = nextBusy;
  document.querySelectorAll("button, select").forEach((element) => {
    element.disabled = nextBusy;
  });
  saveStatus.textContent = nextBusy ? message : dirty ? "저장하지 않은 변경 있음" : "모든 변경 저장됨";
}

function toast(message, type = "success") {
  const element = document.createElement("div");
  element.className = `toast ${type === "error" ? "toast-error" : ""}`;
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
  const payload = await response.json().catch(() => ({ error: "응답을 읽을 수 없습니다." }));
  if (!response.ok) {
    const error = new Error(payload.error ?? `요청 실패 (${response.status})`);
    error.details = payload.details;
    throw error;
  }
  return payload;
}

function showError(error) {
  const detail = Array.isArray(error.details) && error.details.length > 0
    ? ` ${error.details.map((item) => typeof item === "string" ? item : JSON.stringify(item)).join(" · ")}`
    : "";
  toast(`${error.message ?? "요청을 완료하지 못했습니다."}${detail}`, "error");
}

async function loadState({ keepSelection = true } = {}) {
  const previousSelection = keepSelection ? selectedSongId : null;
  state = await api("/api/state");
  if (!state.organizations.some(({ id }) => id === selectedOrganizationId)) {
    selectedOrganizationId = state.organizations.find((organization) => state.songs.some((song) => song.organizationId === organization.id))?.id
      ?? state.organizations[0]?.id
      ?? null;
  }
  selectedSongId = state.songs.some(({ id }) => id === previousSelection) ? previousSelection : null;
  renderShell();
  if (selectedSongId) selectSong(selectedSongId, { force: true });
  else showEmpty();
  setDirty(false);
}

function renderShell() {
  organizationSelect.innerHTML = state.organizations.map((organization) => {
    const count = state.songs.filter((song) => song.organizationId === organization.id).length;
    return `<option value="${escapeHtml(organization.id)}" ${organization.id === selectedOrganizationId ? "selected" : ""}>${escapeHtml(organization.name)} · ${count}곡</option>`;
  }).join("");
  renderBuckets();
  renderSongList();
}

function renderBuckets() {
  const songs = state.songs.filter((song) => song.organizationId === selectedOrganizationId);
  bucketTabs.innerHTML = BUCKETS.map((bucket) => {
    const count = songs.filter((song) => song.scopeStatus === bucket.value).length;
    return `<button type="button" role="tab" aria-selected="${bucket.value === activeBucket}" class="bucket-tab ${bucket.value === activeBucket ? "is-active" : ""}" data-bucket="${bucket.value}"><span>${bucket.label}</span><strong>${count}</strong></button>`;
  }).join("");
}

function renderSongList() {
  const query = searchInput.value.trim().toLocaleLowerCase("ko");
  const songs = state.songs.filter((song) => {
    if (song.organizationId !== selectedOrganizationId || song.scopeStatus !== activeBucket) return false;
    const haystack = `${song.title} ${(song.aliases ?? []).join(" ")}`.toLocaleLowerCase("ko");
    return !query || haystack.includes(query);
  });

  songList.innerHTML = songs.length > 0 ? songs.map((song) => `
    <button type="button" class="song-item ${song.id === selectedSongId ? "is-active" : ""}" data-song-id="${escapeHtml(song.id)}">
      <span class="song-item-title">${escapeHtml(song.title)}</span>
      <span class="song-item-meta">${song.discoveredBy === "ai" ? "AI 발견" : "사용자 목록"} · ${escapeHtml(STAGE_LABELS[song.workflowStage] ?? song.workflowStage)}</span>
      ${song.isPublished ? '<span class="published-dot" title="사이트 공개 중"></span>' : ""}
    </button>
  `).join("") : '<p class="list-empty">이 목록에 등록된 곡이 없습니다.</p>';
}

function showEmpty() {
  currentSong = null;
  emptyState.hidden = false;
  songForm.hidden = true;
}

function selectSong(id, { force = false } = {}) {
  if (!force && dirty && !window.confirm("저장하지 않은 변경을 버리고 다른 곡으로 이동할까요?")) return;
  const song = state.songs.find((item) => item.id === id);
  if (!song) return showEmpty();
  selectedSongId = id;
  currentSong = clone(song);
  emptyState.hidden = true;
  songForm.hidden = false;
  renderSongList();
  fillEditor();
  setDirty(false);
}

function fillEditor() {
  const organization = organizationById(currentSong.organizationId);
  originBadge.textContent = currentSong.discoveredBy === "ai" ? "AI 추가 발견" : "사용자 목록";
  originBadge.classList.toggle("badge-ai", currentSong.discoveredBy === "ai");
  stageBadge.textContent = STAGE_LABELS[currentSong.workflowStage] ?? currentSong.workflowStage;
  publishedBadge.hidden = !currentSong.isPublished;
  editorHeading.textContent = currentSong.title;
  editorSubtitle.textContent = `${organization?.name ?? currentSong.organizationId} · revision ${currentSong.revision}`;
  titleInput.value = currentSong.title;
  aliasesInput.value = (currentSong.aliases ?? []).join(", ");
  scopeSelect.value = currentSong.scopeStatus;
  descriptionInput.value = currentSong.descriptionText ?? "";
  lyricsInput.value = (currentSong.lyrics?.lines ?? []).join("\n");
  renderFactsEditor();
  renderVideosEditor();
  renderResearchPanel();
  renderPreview();
}

function renderResearchPanel() {
  const jobs = (state.jobs ?? []).filter((job) => job.songId === currentSong.id);
  const latestJob = jobs.sort((left, right) => right.createdAt.localeCompare(left.createdAt, "en"))[0];
  const activeJob = jobs.find((job) => ["queued", "running"].includes(job.status));
  researchButton.disabled = busy || Boolean(activeJob);
  researchButton.textContent = activeJob?.status === "running"
    ? "AI 조사 중"
    : activeJob?.status === "queued"
      ? "조사 대기 중"
      : "AI 조사 요청";

  if (currentSong.researchText?.trim()) {
    researchPanel.hidden = false;
    researchPanel.innerHTML = `
      <details>
        <summary><span>AI 조사 메모 도착</span><small>${escapeHtml(latestJob?.completedAt ? new Date(latestJob.completedAt).toLocaleString("ko-KR") : "")}</small></summary>
        <pre>${escapeHtml(currentSong.researchText)}</pre>
      </details>`;
  } else if (activeJob) {
    researchPanel.hidden = false;
    researchPanel.innerHTML = `
      <div class="research-waiting">
        <strong>${activeJob.status === "running" ? "Naru/Codex가 조사 중입니다." : "Naru에서 받을 조사 작업이 있습니다."}</strong>
        <code>node scripts/content-workflow-cli.mjs next</code>
      </div>`;
  } else {
    researchPanel.hidden = true;
    researchPanel.innerHTML = "";
  }
}

function renderFactsEditor() {
  const facts = currentSong.quickFacts ?? [];
  factsEditor.innerHTML = Array.from({ length: 3 }, (_, index) => {
    const fact = facts[index] ?? { label: index === 0 ? "사용 시작" : "", value: "" };
    return `
      <div class="fact-row" data-fact-index="${index}">
        <input aria-label="${index + 1}번째 간단 정보 라벨" data-fact-label value="${escapeHtml(index === 0 ? "사용 시작" : fact.label)}" ${index === 0 ? "readonly" : 'placeholder="라벨 미확정"'} maxlength="40" />
        <input aria-label="${index + 1}번째 간단 정보 값" data-fact-value value="${escapeHtml(fact.value)}" placeholder="값" maxlength="120" />
      </div>`;
  }).join("");
}

function renderVideosEditor() {
  videosEditor.innerHTML = VIDEO_LABELS.map((label, index) => {
    const rank = index + 1;
    const video = currentSong.videos?.find((item) => item.rank === rank) ?? {};
    return `
      <details class="video-slot" ${rank <= 2 ? "open" : ""} data-video-rank="${rank}">
        <summary><span><strong>${rank}</strong>${label}</span><small>${video.videoId ? "영상 입력됨" : "비어 있음"}</small></summary>
        <div class="video-fields">
          <label class="field field-wide"><span>YouTube URL</span><input data-video-field="sourceUrl" value="${escapeHtml(video.sourceUrl ?? "")}" placeholder="https://www.youtube.com/watch?v=..." /></label>
          <label class="field"><span>영상 제목</span><input data-video-field="title" value="${escapeHtml(video.title ?? "")}" /></label>
          <label class="field"><span>채널명</span><input data-video-field="channelName" value="${escapeHtml(video.channelName ?? "")}" /></label>
          <label class="field field-wide"><span>화면에 표시할 출처 문구 <small>선택</small></span><input data-video-field="attributionText" value="${escapeHtml(video.attributionText ?? "")}" /></label>
        </div>
      </details>`;
  }).join("");
}

function captureDraft() {
  const quickFacts = [...factsEditor.querySelectorAll(".fact-row")].map((row) => ({
    label: row.querySelector("[data-fact-label]").value.trim(),
    value: row.querySelector("[data-fact-value]").value.trim(),
  }));
  const videos = [...videosEditor.querySelectorAll(".video-slot")].map((slot) => {
    const value = (field) => slot.querySelector(`[data-video-field="${field}"]`).value.trim();
    return {
      rank: Number(slot.dataset.videoRank),
      sourceUrl: value("sourceUrl"),
      title: value("title"),
      channelName: value("channelName"),
      attributionText: value("attributionText"),
    };
  }).filter(({ sourceUrl }) => sourceUrl);

  return {
    title: titleInput.value.trim(),
    aliases: aliasesInput.value.split(/[,\n]/u).map((item) => item.trim()).filter(Boolean),
    scopeStatus: scopeSelect.value,
    workflowStage: currentSong.workflowStage,
    descriptionText: descriptionInput.value,
    lyrics: { lines: lyricsInput.value.replace(/\r\n/gu, "\n").split("\n") },
    quickFacts,
    videos,
  };
}

function extractVideoId(value) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./u, "");
    if (hostname === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] ?? null;
    if (["youtube.com", "m.youtube.com", "music.youtube.com"].includes(hostname)) {
      return url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})/u)?.[1] ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

function renderAnnotatedText(value) {
  let noteNumber = 0;
  const paragraphs = String(value ?? "").split(/\n{2,}/u);
  return paragraphs.map((paragraph) => {
    const content = parseInlineNotes(paragraph).map((token) => {
      if (token.type === "text") return escapeHtml(token.value).replaceAll("\n", "<br />");
      noteNumber += 1;
      const noteHtml = linkifyHttpUrls(token.value).map((part) => part.type === "link"
        ? `<a href="${escapeHtml(part.value)}" target="_blank" rel="noreferrer">${escapeHtml(part.value)}</a>`
        : escapeHtml(part.value).replaceAll("\n", "<br />")
      ).join("");
      return `<span class="preview-note"><button type="button" aria-expanded="false" aria-label="주석 ${noteNumber}">[${noteNumber}]</button><span role="note">${noteHtml}</span></span>`;
    }).join("");
    return `<p>${content || "&nbsp;"}</p>`;
  }).join("");
}

function renderPreview() {
  if (!currentSong) return;
  const draft = captureDraft();
  const organization = organizationById(currentSong.organizationId);
  const meaningfulLyrics = draft.lyrics.lines.filter((line) => line.trim());
  const firstVideo = draft.videos.sort((left, right) => left.rank - right.rank)[0];
  const videoId = firstVideo ? extractVideoId(firstVideo.sourceUrl) : null;
  const factHtml = draft.quickFacts.filter((fact) => fact.label || fact.value).map((fact) => `
    <div><span>${escapeHtml(fact.label || "정보")}</span><strong>${escapeHtml(fact.value || "—")}</strong></div>
  `).join("");
  const videoTabs = draft.videos.map((video) => `<span class="preview-video-chip ${video.rank === firstVideo?.rank ? "is-active" : ""}">${video.rank}</span>`).join("");

  sitePreview.innerHTML = `
    <header class="preview-hero">
      <span>${escapeHtml(organization?.type === "baseball" ? "야구" : "대학")} · ${escapeHtml(organization?.name ?? "")}</span>
      <h3>${escapeHtml(draft.title || "제목 없음")}</h3>
    </header>
    <div class="preview-body">
      <section>
        <div class="preview-video">
          ${videoId ? `<iframe title="${escapeHtml(firstVideo.title || draft.title)}" src="https://www.youtube-nocookie.com/embed/${escapeHtml(videoId)}" allow="encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>` : '<div class="preview-placeholder">선택한 영상이 없습니다.</div>'}
        </div>
        ${videoTabs ? `<div class="preview-video-tabs">${videoTabs}</div>` : ""}
        ${firstVideo?.attributionText ? `<p class="preview-attribution">${escapeHtml(firstVideo.attributionText)}</p>` : ""}
      </section>
      <section class="preview-section">
        <div class="preview-section-title"><span>가사</span><small>${meaningfulLyrics.length}줄</small></div>
        ${meaningfulLyrics.length ? `<div class="preview-lyrics">${meaningfulLyrics.slice(0, 2).map((line) => `<p>${escapeHtml(line)}</p>`).join("")}${meaningfulLyrics.length > 2 ? `<details><summary>나머지 ${meaningfulLyrics.length - 2}줄 펼치기</summary>${meaningfulLyrics.slice(2).map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</details>` : ""}</div>` : '<p class="preview-muted">가사가 아직 입력되지 않았습니다.</p>'}
      </section>
      ${factHtml ? `<section class="preview-facts">${factHtml}</section>` : ""}
      <section class="preview-section">
        <div class="preview-section-title"><span>이야기</span></div>
        <div class="preview-story">${draft.descriptionText.trim() ? renderAnnotatedText(draft.descriptionText) : '<p class="preview-muted">본문을 입력하면 여기에 표시됩니다.</p>'}</div>
      </section>
    </div>`;

  sitePreview.querySelectorAll(".preview-note > button").forEach((button) => {
    button.addEventListener("click", () => {
      const note = button.closest(".preview-note");
      const next = !note.classList.contains("is-open");
      note.classList.toggle("is-open", next);
      button.setAttribute("aria-expanded", String(next));
    });
  });
}

songForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentSong || busy) return;
  setBusy(true, "저장 중…");
  try {
    const result = await api(`/api/songs/${encodeURIComponent(currentSong.id)}`, {
      method: "PUT",
      body: { expectedRevision: currentSong.revision, song: captureDraft() },
    });
    const savedSong = { ...result.song, researchText: currentSong.researchText ?? "" };
    state.songs = state.songs.map((song) => song.id === savedSong.id ? savedSong : song);
    currentSong = clone(savedSong);
    activeBucket = currentSong.scopeStatus;
    renderShell();
    fillEditor();
    setDirty(false);
    toast("변경 내용을 저장했습니다.");
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
});

songForm.addEventListener("input", () => {
  if (!currentSong || busy) return;
  setDirty(true);
  renderPreview();
});
songForm.addEventListener("change", () => {
  if (!currentSong || busy) return;
  setDirty(true);
  renderPreview();
});

document.querySelector("#insert-note-button").addEventListener("click", () => {
  const start = descriptionInput.selectionStart;
  const end = descriptionInput.selectionEnd;
  const selected = descriptionInput.value.slice(start, end);
  const insertion = `[* ${selected || "원문 출처: https://"}]`;
  descriptionInput.setRangeText(insertion, start, end, "end");
  descriptionInput.focus();
  setDirty(true);
  renderPreview();
});

researchButton.addEventListener("click", async () => {
  if (!currentSong || busy) return;
  if (dirty) {
    toast("AI 조사를 요청하기 전에 현재 원고를 먼저 저장해 주세요.", "error");
    return;
  }
  setBusy(true, "조사 작업 생성 중…");
  try {
    const result = await api(`/api/songs/${encodeURIComponent(currentSong.id)}?action=request-research`, {
      method: "POST",
      body: { expectedRevision: currentSong.revision },
    });
    const existingIndex = (state.jobs ?? []).findIndex(({ id }) => id === result.job.id);
    if (existingIndex === -1) state.jobs = [...(state.jobs ?? []), result.job];
    else state.jobs[existingIndex] = result.job;
    renderResearchPanel();
    toast(result.created ? "Naru에서 받을 AI 조사 작업을 만들었습니다." : "이미 대기 중인 조사 작업이 있습니다.");
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
    renderResearchPanel();
  }
});

bucketTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-bucket]");
  if (!button) return;
  activeBucket = button.dataset.bucket;
  renderBuckets();
  renderSongList();
});

songList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-song-id]");
  if (button) selectSong(button.dataset.songId);
});

organizationSelect.addEventListener("change", () => {
  if (dirty && !window.confirm("저장하지 않은 변경을 버리고 대학·구단을 바꿀까요?")) {
    organizationSelect.value = selectedOrganizationId;
    return;
  }
  selectedOrganizationId = organizationSelect.value;
  selectedSongId = null;
  renderBuckets();
  renderSongList();
  showEmpty();
  setDirty(false);
});

searchInput.addEventListener("input", renderSongList);

importForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedOrganizationId || busy) return;
  const formData = new FormData(importForm);
  setBusy(true, "목록 추가 중…");
  try {
    const result = await api("/api/import", {
      method: "POST",
      body: {
        organizationId: selectedOrganizationId,
        targetText: formData.get("targetText"),
        deferredText: formData.get("deferredText"),
        discoveredText: formData.get("discoveredText"),
      },
    });
    importForm.reset();
    selectedSongId = result.created[0]?.id ?? selectedSongId;
    if (result.created[0]) activeBucket = result.created[0].scopeStatus;
    await loadState();
    toast(`${result.created.length}곡을 추가했습니다.${result.skipped.length ? ` 중복 ${result.skipped.length}곡은 건너뛰었습니다.` : ""}`);
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
});

refreshButton.addEventListener("click", async () => {
  if (dirty && !window.confirm("저장하지 않은 변경을 버리고 새로고침할까요?")) return;
  setBusy(true, "새로고침 중…");
  try {
    await loadState();
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
});

window.addEventListener("beforeunload", (event) => {
  if (!dirty) return;
  event.preventDefault();
});

try {
  await loadState({ keepSelection: false });
} catch (error) {
  showError(error);
  saveStatus.textContent = "불러오기 실패";
}
