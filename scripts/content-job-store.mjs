import { randomBytes } from "node:crypto";
import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { EditorialError } from "./content-editorial-store.mjs";

const POLICY_VERSION = "2026-08-25";
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

  async createResearchJob(songId, expectedRevision) {
    const song = await this.editorialStore.getSong(songId);
    if (!Number.isInteger(expectedRevision) || song.revision !== expectedRevision) {
      throw new EditorialError("REVISION_CONFLICT", "곡이 변경되었습니다. 새로고침한 뒤 다시 요청해 주세요.", 409);
    }

    return this.#withLock(async () => {
      const queue = await this.#readQueue();
      const existing = queue.items.find((job) => (
        job.type === "research_song" && job.songId === songId && ACTIVE_STATUSES.has(job.status)
      ));
      if (existing) return { job: existing, created: false };

      const now = new Date().toISOString();
      const job = {
        id: `research-${songId}-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`,
        type: "research_song",
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
          instructions: [
            "완성된 소개문을 쓰지 말고 사용자가 참고할 조사 메모를 작성한다.",
            "TMI 후보는 2~4개를 목표로 하되 흥미를 우선하고 수량을 억지로 채우지 않는다.",
            "출처는 선택 사항이다. 찾은 URL은 후보 아래 평문으로 적고, 없으면 '별도 출처 없음'이라고 적을 수 있다.",
            "상충하는 설명은 Claim/Evidence 구조로 만들지 말고 서로 다른 내용을 평문으로 함께 적는다.",
            "추가 응원가를 발견하면 '## 추가 발견곡' 아래에 제목과 발견 경로를 적는다.",
            "사용자 원고, 영상 순서와 승인 상태는 수정하지 않는다.",
          ],
          suggestedFormat: [
            "# 조사 메모 — 응원가 제목",
            "## TMI 후보",
            "- 흥미로운 이야기",
            "  - 참고: https://example.com 또는 별도 출처 없음",
            "## 서로 다른 설명",
            "- 필요한 경우에만 작성",
            "## 추가 발견곡",
            "- 필요한 경우에만 작성",
          ].join("\n"),
        };
      }

      if (changed) {
        queue.revision += 1;
        await this.#writeQueue(queue);
      }
      return null;
    });
  }

  async submitResearch(jobId, resultText) {
    if (!SAFE_JOB_ID.test(String(jobId ?? ""))) {
      throw new EditorialError("INVALID_JOB_ID", "작업 ID가 올바르지 않습니다.");
    }
    const text = String(resultText ?? "").replace(/\r\n/gu, "\n").trim();
    if (!text) throw new EditorialError("EMPTY_RESULT", "조사 결과가 비어 있습니다.");
    if (text.length > 150_000) throw new EditorialError("RESULT_TOO_LARGE", "조사 결과가 너무 깁니다.", 413);

    return this.#withLock(async () => {
      const queue = await this.#readQueue();
      const job = queue.items.find(({ id }) => id === jobId);
      if (!job) throw new EditorialError("JOB_NOT_FOUND", "조사 작업을 찾을 수 없습니다.", 404);
      if (job.status !== "running") {
        throw new EditorialError("JOB_NOT_RUNNING", "실행 중인 조사 작업만 제출할 수 있습니다.", 409);
      }

      const song = await this.editorialStore.getSong(job.songId);
      if (song.revision !== job.inputRevision) {
        const stalePath = path.join(this.resultsDirectory, `${job.id}.md`);
        await this.#writeTextAtomic(stalePath, `${text}\n`);
        job.status = "stale";
        job.completedAt = new Date().toISOString();
        job.staleResultPath = path.relative(this.projectRoot, stalePath);
        queue.revision += 1;
        await this.#writeQueue(queue);
        return { job, stale: true, song };
      }

      const updatedSong = await this.editorialStore.saveSong(job.songId, {
        title: song.title,
        aliases: song.aliases,
        scopeStatus: song.scopeStatus,
        workflowStage: "research_ready",
        descriptionText: song.descriptionText,
        lyrics: song.lyrics,
        quickFacts: song.quickFacts,
        videos: song.videos,
      }, song.revision);
      const researchPath = path.join(this.projectRoot, "content", "editorial", "songs", job.songId, "research.md");
      await this.#writeTextAtomic(researchPath, `${text}\n`);

      job.status = "completed";
      job.completedAt = new Date().toISOString();
      job.resultRevision = updatedSong.revision;
      queue.revision += 1;
      await this.#writeQueue(queue);
      return { job, stale: false, song: updatedSong, researchPath: path.relative(this.projectRoot, researchPath) };
    });
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
