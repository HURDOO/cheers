import { randomBytes } from "node:crypto";
import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { EditorialError } from "./content-editorial-store.mjs";

const POLICY_VERSION = "2026-08-25-loop-v2";
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
            "수집·작성·자체 검토를 직렬 단계로 나누지 말고, 조사 중 원고를 쓰고 원고의 빈틈을 다시 조사하는 식으로 반복한다.",
            "현재 descriptionText를 반드시 먼저 읽고, 가치 있는 사용자 문장은 보존하면서 부족한 맥락과 TMI를 보완한다.",
            "흥미로운 소재 약 10개를 목표로 폭넓게 찾되 자료가 적거나 많으면 억지로 수량을 맞추지 않는다.",
            "결과는 사실 목록이 아니라 나무위키처럼 편하게 읽히는 공개용 본문으로 완성한다. 뻔한 대표곡 소개보다 의외성 있는 이야기부터 쓴다.",
            "카더라·구전·상충하는 설도 흥미가 있으면 포함할 수 있다. 단정하지 말고 '~라고 전해진다', '~라는 이야기가 있다'처럼 자연스럽게 범위를 드러낸다.",
            "출처는 선택 사항이며 본문 흐름을 끊지 않도록 필요한 문장 뒤에 [* 주석 내용: URL] 형식으로 넣는다.",
            "각 문단은 한 가지 이야기에 집중하고, 중복·AI식 총평·근거 없는 인과관계·과도한 수식은 자체 검토에서 걷어낸다.",
            "추가 응원가를 발견하면 '## 추가 발견곡' 아래에 제목과 발견 경로를 적는다.",
            "영상 순서, 가사, 간단 정보, 관계 데이터는 수정하지 않는다. 공개 본문 descriptionText와 AI 작업 기록 researchText만 제출한다.",
            "제출된 공개 본문은 사용자 검수 대상이며 작업 라벨은 자동으로 '수집 완료'가 된다. 최종 승인은 사용자가 한다.",
          ],
          outputFormat: {
            fileType: "json",
            fields: {
              descriptionText: "사용자 기존 글을 반영해 완성한 공개용 전체 본문. 부분 패치가 아니라 전체 문자열.",
              researchText: "사용자 검수용 작업 기록. 새로 확인한 핵심, 불확실한 부분, 추가 발견곡을 간결한 Markdown으로 정리.",
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

      const updatedSong = await this.editorialStore.saveSong(job.songId, {
        workflowStage: "research_ready",
        descriptionText: normalized.descriptionText,
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
    throw new EditorialError("INVALID_RESULT_FORMAT", "AI 결과는 descriptionText와 researchText가 있는 JSON 객체여야 합니다.");
  }
  const descriptionText = String(result.descriptionText ?? "").replace(/\r\n/gu, "\n").trim();
  const researchText = String(result.researchText ?? "").replace(/\r\n/gu, "\n").trim();
  if (!descriptionText) throw new EditorialError("EMPTY_DESCRIPTION", "AI가 작성한 공개 본문이 비어 있습니다.");
  if (!researchText) throw new EditorialError("EMPTY_RESEARCH_LOG", "AI 작업 기록이 비어 있습니다.");
  if (descriptionText.length > 60_000 || researchText.length > 150_000) {
    throw new EditorialError("RESULT_TOO_LARGE", "AI 결과가 너무 깁니다.", 413);
  }
  return { descriptionText, researchText };
}
