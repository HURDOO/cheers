import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { readOriginalSongCatalog, reorderOriginalSongs, saveOriginalSongOrder } from "../scripts/original-song-order.mjs";

const catalog = {
  schemaVersion: 1,
  items: [
    { id: "first", title: "첫 곡", sources: [{ label: "원본", url: "https://example.com" }] },
    { id: "second", title: "둘째 곡", sources: [] },
    { id: "third", title: "셋째 곡", sources: [] },
  ],
};

test("원곡 순서는 전체 ID를 정확히 한 번씩 받아야 한다", () => {
  assert.deepEqual(reorderOriginalSongs(catalog, ["third", "first", "second"]).items.map(({ id }) => id), ["third", "first", "second"]);
  for (const ids of [["first", "second"], ["first", "first", "third"], ["first", "second", "unknown"]]) {
    assert.throws(() => reorderOriginalSongs(catalog, ids), { code: "INVALID_ORIGINAL_ORDER" });
  }
});

test("순서 저장은 원곡 내용을 보존하고 오래된 revision을 거부한다", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "cheers-original-order-test-"));
  const filePath = path.join(directory, "original-songs.json");
  await writeFile(filePath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  const before = await readOriginalSongCatalog(filePath);
  const saved = await saveOriginalSongOrder(filePath, ["third", "first", "second"], before.revision);
  const after = JSON.parse(await readFile(filePath, "utf8"));
  assert.deepEqual(after.items, [catalog.items[2], catalog.items[0], catalog.items[1]]);
  assert.notEqual(saved.revision, before.revision);
  await assert.rejects(
    saveOriginalSongOrder(filePath, ["first", "second", "third"], before.revision),
    { code: "REVISION_CONFLICT", statusCode: 409 },
  );
  assert.deepEqual(JSON.parse(await readFile(filePath, "utf8")), after);
});
