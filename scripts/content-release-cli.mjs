import path from "node:path";
import { fileURLToPath } from "node:url";
import { EditorialStore } from "./content-editorial-store.mjs";
import { ContentReleaseStore, validatePublicCatalog } from "./content-release-store.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = process.env.CONTENT_PROJECT_ROOT
  ? path.resolve(process.env.CONTENT_PROJECT_ROOT)
  : path.resolve(scriptDirectory, "..");
const editorialStore = new EditorialStore(projectRoot);
const releaseStore = new ContentReleaseStore(projectRoot, editorialStore);
const [command = "status", ...ids] = process.argv.slice(2);

await editorialStore.initialize();
await releaseStore.initialize();

if (command === "validate") {
  const catalog = validatePublicCatalog(await releaseStore.readCurrent());
  console.log(`공개 카탈로그 확인 완료: ${catalog.releaseId} · ${catalog.songs.length}곡`);
} else if (command === "status") {
  const status = await releaseStore.describe();
  const pending = Object.values(status.songs).filter((item) => item.status === "changes_pending").length;
  const unpublished = Object.values(status.songs).filter((item) => item.status === "unpublished").length;
  console.log(`${status.current.releaseId} · 공개 ${status.current.songCount}곡 · 재공개 필요 ${pending}곡 · 미공개 ${unpublished}곡`);
} else if (command === "publish") {
  if (ids.length === 0) throw new Error("공개할 응원가 ID를 하나 이상 입력해 주세요.");
  const songs = await Promise.all(ids.map((id) => editorialStore.getSong(id)));
  const result = await releaseStore.publishSongs(songs.map((song) => ({ id: song.id, expectedRevision: song.revision })));
  console.log(`릴리스 생성 완료: ${result.release.releaseId} · ${ids.length}곡 반영`);
} else if (command === "unpublish") {
  if (ids.length === 0) throw new Error("공개를 내릴 응원가 ID를 하나 이상 입력해 주세요.");
  const songs = await Promise.all(ids.map((id) => editorialStore.getSong(id)));
  const result = await releaseStore.unpublishSongs(songs.map((song) => ({ id: song.id, expectedRevision: song.revision })));
  console.log(`릴리스 생성 완료: ${result.release.releaseId} · ${ids.length}곡 공개 해제`);
} else {
  throw new Error(`지원하지 않는 명령입니다: ${command}`);
}
