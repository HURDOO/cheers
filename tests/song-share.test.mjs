import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadShareSongs, songShareImagePath, songSharePath } from "../share/song-share.mjs";
import { shareMetaBlock } from "../share/vite-song-pages.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(path.join(root, "src/data/generated/catalog.json"), "utf8"));

test("공개 카탈로그의 모든 곡에 공유 정보가 만들어진다", () => {
  const songs = loadShareSongs(root);
  assert.equal(songs.length, catalog.songs.length);
  songs.forEach((song) => {
    assert.ok(song.pageTitle.includes(song.title), song.id);
    assert.ok(song.description.length > 0, `${song.id} 설명이 비어 있습니다.`);
    assert.ok(!song.description.includes("[*"), `${song.id} 설명에 주석 표기가 남았습니다.`);
  });
});

test("원곡이 있는 곡은 설명 첫머리에 원곡을 밝힌다", () => {
  const song = loadShareSongs(root).find(({ id }) => id === "korea-university-minjogui-aria");
  assert.ok(song);
  assert.match(song.description, /^원곡 Melodramma — Andrea Bocelli\./u);
});

test("공유 주소와 이미지 경로는 곡 ID로 정해진다", () => {
  assert.equal(songSharePath("a-b"), "/songs/a-b/");
  assert.equal(songShareImagePath("a-b"), "/og/songs/a-b.jpg");
});

test("공유 메타 태그는 값을 이스케이프하고 절대 주소를 쓴다", () => {
  const block = shareMetaBlock({ title: 'A "B" <C>', description: "x & y", pagePath: "/songs/a/", imagePath: "/og/songs/a.jpg" });
  assert.match(block, /content="A &quot;B&quot; &lt;C&gt;"/u);
  assert.match(block, /content="x &amp; y"/u);
  assert.match(block, /og:url" content="https:\/\/cheers\.app\.hurdoo\.kr\/songs\/a\/"/u);
  assert.match(block, /og:image" content="https:\/\/cheers\.app\.hurdoo\.kr\/og\/songs\/a\.jpg"/u);
});
