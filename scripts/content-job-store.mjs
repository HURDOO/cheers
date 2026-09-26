import { randomBytes } from "node:crypto";
import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { EditorialError } from "./content-editorial-store.mjs";

const POLICY_VERSION = "2026-09-26-notes-v3";
const ACTIVE_STATUSES = new Set(["queued", "running"]);
const SAFE_JOB_ID = /^[a-z0-9-]+$/u;

export class ContentJobStore {
  constructor(projectRoot, editorialStore) {
    this.projectRoot = path.resolve(projectRoot);
    this.editorialStore = editorialStore;
    this.localDirectory = path.join(this.projectRoot, ".local");
    this.jobsPath = path.join(this.localDirectory, "content-jobs.json");
    this.lockPath = path.join(this.localDirectory, "content-jobs.lock");
    this.resultsDirectory = path.join(this.localDirectory, "content-results");
  }

  async initialize() {
    await Promise.all([
      mkdir(this.localDirectory, { recursive: true }),
      mkdir(this.resultsDirectory, { recursive: true }),
    ]);
  }

  async list() {
    await this.initialize();
    return (await this.#readQueue()).items;
  }

  async createEnrichmentJob(songId, expectedRevision) {
    const song = await this.editorialStore.getSong(songId);
    if (!Number.isInteger(expectedRevision) || song.revision !== expectedRevision) {
      throw new EditorialError("REVISION_CONFLICT", "곡이 변경되었습니다. 새로고침한 뒤 다시 요청해 주세요.", 409);
    }

    return this.#withLock(async () => {
      const queue = await this.#readQueue();
      const existing = queue.items.find((job) => job.songId === songId && ACTIVE_STATUSES.has(job.status));
      if (existing) return { job: existing, created: false };

      const now = new Date().toISOString();
      const job = {
        id: `enrich-${songId}-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`,
        type: "enrich_song",
        songId,
        songTitle: song.title,
        organizationId: song.organizationId,
        inputRevision: song.revision,
        policyVersion: POLICY_VERSION,
        status: "queued",
        createdAt: now,
        claimedAt: null,
        completedAt: null,
        resultRevision: null,
      };
      queue.items.push(job);
      queue.revision += 1;
      await this.#writeQueue(queue);
      return { job, created: true };
    });
  }

  async createResearchJob(songId, expectedRevision) {
    return this.createEnrichmentJob(songId, expectedRevision);
  }

  async claimNext() {
    return this.#withLock(async () => {
      const queue = await this.#readQueue();
      let changed = false;

      for (const job of queue.items) {
        if (job.status !== "queued") continue;
        const song = await this.editorialStore.getSong(job.songId);
        if (song.revision !== job.inputRevision) {
          job.status = "stale";
          job.completedAt = new Date().toISOString();
          changed = true;
          continue;
        }

        job.status = "running";
        job.claimedAt = new Date().toISOString();
        queue.revision += 1;
        await this.#writeQueue(queue);
        return {
          job,
          song,
          previousResearchText: await this.editorialStore.readResearch(job.songId),
          instructions: [
            "이 작업은 조사 전용이다. 공개용 문장은 별도 다듬기 단계(ChatGPT)에서 쓰므로, 산문을 다듬는 데 시간을 쓰지 말고 소재를 넓고 정확하게 모은다.",
            "현재 descriptionText와 이전 작업 기록을 반드시 먼저 읽고, 이미 있는 내용은 새 소재로 반복하지 않는다.",
            "흥미로운 소재 약 10개를 목표로 폭넓게 찾되 자료가 적거나 많으면 억지로 수량을 맞추지 않는다. 뻔한 대표곡 소개보다 의외성 있는 이야기를 우선한다.",
            "researchText는 아래 소재 노트 형식의 Markdown으로 작성한다. 소재마다 '### 번호. 한 줄 제목' 아래 '- 내용:', '- 확신도: 확실 | 구전 | 설 대립 | 추정', '- 출처: URL 또는 없음' 세 항목을 적는다.",
            "카더라·구전·상충하는 설도 흥미가 있으면 소재로 남기고 확신도로 범위를 표시한다. 서로 다른 설은 한 소재 안에 함께 적는다.",
            "출처는 선택 사항이다. 자료를 만들거나 없는 링크를 붙이지 않는다.",
            "소재 노트 뒤에 '## 확인 필요'(사용자가 판단해야 할 사실·민감한 표현)와 '## 추가 발견곡'(제목과 발견 경로)을 둔다.",
            "descriptionText는 제출하지 않는다. 공개 본문, 영상 순서, 가사, 간단 정보, 관계 데이터는 수정하지 않는다.",
            "제출하면 작업 라벨은 자동으로 '수집 완료'가 되고, 사용자가 작업 모드의 '다듬기'에서 ChatGPT로 공개 본문을 만든다.",
          ],
          outputFormat: {
            fileType: "json",
            fields: {
              researchText: "소재 노트 Markdown. '## 소재' 아래 소재별 내용·확신도·출처, '## 확인 필요', '## 추가 발견곡'.",
            },
          },
        };
      }

      if (changed) {
        queue.revision += 1;
        await this.#writeQueue(queue);
      }
      return null;
    });
  }

  async submitEnrichment(jobId, result) {
    if (!SAFE_JOB_ID.test(String(jobId ?? ""))) {
      throw new EditorialError("INVALID_JOB_ID", "작업 ID가 올바르지 않습니다.");
    }
    const normalized = normalizeEnrichmentResult(result);

    return this.#withLock(async () => {
      const queue = await this.#readQueue();
      const job = queue.items.find(({ id }) => id === jobId);
      if (!job) throw new EditorialError("JOB_NOT_FOUND", "조사 작업을 찾을 수 없습니다.", 404);
      if (job.status !== "running") {
        throw new EditorialError("JOB_NOT_RUNNING", "실행 중인 조사 작업만 제출할 수 있습니다.", 409);
      }

      const song = await this.editorialStore.getSong(job.songId);
      if (song.revision !== job.inputRevision) {
        const stalePath = path.join(this.resultsDirectory, `${job.id}.json`);
        await this.#writeTextAtomic(stalePath, `${JSON.stringify(normalized, null, 2)}\n`);
        job.status = "stale";
        job.completedAt = new Date().toISOString();
        job.staleResultPath = path.relative(this.projectRoot, stalePath);
        queue.revision += 1;
        await this.#writeQueue(queue);
        return { job, stale: true, song };
      }

      // 이전 계약의 본문 제출도 받되, AI 문장은 다듬기 전 초안으로만 저장한다.
      const updatedSong = await this.editorialStore.saveSong(job.songId, {
        workflowStage: "research_ready",
        ...(normalized.descriptionText ? { descriptionText: normalized.descriptionText, descriptionStatus: "draft" } : {}),
      }, song.revision);
      const researchPath = path.join(this.projectRoot, "content", "editorial", "songs", job.songId, "research.md");
      await this.#writeTextAtomic(researchPath, `${normalized.researchText}\n`);

      job.status = "completed";
      job.completedAt = new Date().toISOString();
      job.resultRevision = updatedSong.revision;
      queue.revision += 1;
      await this.#writeQueue(queue);
      return { job, stale: false, song: updatedSong, researchPath: path.relative(this.projectRoot, researchPath) };
    });
  }

  async submitResearch(jobId, result) {
    return this.submitEnrichment(jobId, result);
  }

  async #readQueue() {
    try {
      const value = JSON.parse(await readFile(this.jobsPath, "utf8"));
      if (value?.schemaVersion !== 1 || !Number.isInteger(value.revision) || !Array.isArray(value.items)) {
        throw new EditorialError("INVALID_JOB_QUEUE", "콘텐츠 작업 큐 형식이 올바르지 않습니다.", 500);
      }
      return value;
    } catch (error) {
      if (error?.code === "ENOENT") return { schemaVersion: 1, revision: 0, items: [] };
      throw error;
    }
  }

  async #writeQueue(queue) {
    await this.#writeTextAtomic(this.jobsPath, `${JSON.stringify(queue, null, 2)}\n`);
  }

  async #writeTextAtomic(filePath, value) {
    const directory = path.dirname(filePath);
    await mkdir(directory, { recursive: true });
    const temporaryPath = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`);
    await writeFile(temporaryPath, value, "utf8");
    await rename(temporaryPath, filePath);
  }

  async #withLock(operation) {
    await this.initialize();
    let handle;
    try {
      handle = await open(this.lockPath, "wx", 0o600);
    } catch (error) {
      if (error?.code === "EEXIST") {
        throw new EditorialError("JOB_QUEUE_BUSY", "다른 AI 작업 요청을 처리 중입니다. 잠시 후 다시 시도해 주세요.", 409);
      }
      throw error;
    }

    try {
      return await operation();
    } finally {
      await handle.close();
      await unlink(this.lockPath).catch(() => {});
    }
  }
}

function normalizeEnrichmentResult(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new EditorialError("INVALID_RESULT_FORMAT", "AI 결과는 researchText가 있는 JSON 객체여야 합니다.");
  }
  const descriptionText = String(result.descriptionText ?? "").replace(/\r\n/gu, "\n").trim();
  const researchText = String(result.researchText ?? "").replace(/\r\n/gu, "\n").trim();
  if (!researchText) throw new EditorialError("EMPTY_RESEARCH_LOG", "AI 소재 노트가 비어 있습니다.");
  if (descriptionText.length > 60_000 || researchText.length > 150_000) {
    throw new EditorialError("RESULT_TOO_LARGE", "AI 결과가 너무 깁니다.", 413);
  }
  return { descriptionText, researchText };
}
