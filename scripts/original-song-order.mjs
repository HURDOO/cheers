import { createHash, randomBytes } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { EditorialError } from "./content-editorial-store.mjs";

function revisionOf(text) {
  return createHash("sha256").update(text).digest("hex");
}

export async function readOriginalSongCatalog(filePath) {
  const text = await readFile(filePath, "utf8");
  const catalog = JSON.parse(text);
  if (catalog?.schemaVersion !== 1 || !Array.isArray(catalog.items)) {
    throw new Error("원곡 데이터 형식이 올바르지 않습니다.");
  }
  return { catalog, revision: revisionOf(text) };
}

export function reorderOriginalSongs(catalog, ids) {
  const items = catalog.items;
  const byId = new Map(items.map((item) => [item.id, item]));
  if (!Array.isArray(ids)
    || ids.length !== items.length
    || ids.some((id) => typeof id !== "string" || !byId.has(id))
    || new Set(ids).size !== items.length) {
    throw new EditorialError("INVALID_ORIGINAL_ORDER", "원곡 목록 전체를 중복 없이 순서대로 보내 주세요.");
  }
  return { ...catalog, items: ids.map((id) => byId.get(id)) };
}

export async function saveOriginalSongOrder(filePath, ids, expectedRevision) {
  const { catalog, revision } = await readOriginalSongCatalog(filePath);
  if (expectedRevision !== revision) {
    throw new EditorialError("REVISION_CONFLICT", "원곡 목록이 변경되었습니다. 변경 취소 후 새로고침해 주세요.", 409);
  }
  const reordered = reorderOriginalSongs(catalog, ids);
  const text = `${JSON.stringify(reordered, null, 2)}\n`;
  if (reordered.items.every((item, index) => item.id === catalog.items[index].id)) {
    return { items: catalog.items, revision };
  }
  const temporaryPath = path.join(path.dirname(filePath), `.original-songs.${process.pid}.${randomBytes(5).toString("hex")}.tmp`);
  await writeFile(temporaryPath, text, "utf8");
  await rename(temporaryPath, filePath);
  return { items: reordered.items, revision: revisionOf(text) };
}
