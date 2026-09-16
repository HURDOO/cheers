import assert from "node:assert/strict";
import test from "node:test";
import { canRestoreSongDraft, descriptionPreview, lyricsPreview, readSongDraft } from "../admin/song-editor.js";
import { extractYouTubeVideoId, youtubeStartSeconds } from "../shared/youtube.mjs";
import { fetchYouTubeMetadata } from "../scripts/youtube-metadata.mjs";

test("외부 주소는 요청하지 않고 YouTube URL만 정규화해 조회한다", async () => {
  let requested = null;
  const fetcher = async (url) => {
    requested = url;
    return { ok: true, json: async () => ({ type: "video", title: "떼창 영상", author_name: "응원 채널", html: "<script>untrusted</script>" }) };
  };
  for (const url of ["http://127.0.0.1/private", "https://youtube.com.evil.example/watch?v=M7lc1UVf-VE", "ftp://youtube.com/watch?v=M7lc1UVf-VE"]) {
    await assert.rejects(fetchYouTubeMetadata(url, fetcher), { code: "INVALID_YOUTUBE_URL" });
  }
  assert.equal(requested, null);
  const data = await fetchYouTubeMetadata("https://youtu.be/M7lc1UVf-VE?t=30&si=tracking", fetcher);
  assert.equal(requested.origin, "https://www.youtube.com");
  assert.equal(requested.searchParams.get("url"), "https://www.youtube.com/watch?v=M7lc1UVf-VE");
  assert.equal(data.channelName, "응원 채널");
  assert.equal("html" in data, false);
});

test("비공개·네트워크 실패·잘못된 응답은 직접 입력 가능한 오류로 돌려준다", async () => {
  for (const fetcher of [
    async () => ({ ok: false, status: 401 }),
    async () => { throw new Error("offline"); },
    async () => ({ ok: true, json: async () => ({ html: "bad" }) }),
  ]) {
    await assert.rejects(fetchYouTubeMetadata("https://youtu.be/M7lc1UVf-VE", fetcher), { code: "VIDEO_METADATA_UNAVAILABLE" });
  }
});

test("Shorts·Live URL과 사용자가 고른 시작 시각을 읽는다", () => {
  assert.equal(extractYouTubeVideoId("https://www.youtube.com/shorts/M7lc1UVf-VE"), "M7lc1UVf-VE");
  assert.equal(extractYouTubeVideoId("https://www.youtube.com/live/M7lc1UVf-VE"), "M7lc1UVf-VE");
  assert.equal(youtubeStartSeconds("https://youtu.be/M7lc1UVf-VE?t=1m23s"), 83);
  assert.equal(youtubeStartSeconds("https://youtu.be/M7lc1UVf-VE?start=40"), 40);
});

test("붙여 넣은 HTML은 실행하지 않고 주석과 문단·가사 줄바꿈을 미리 본다", () => {
  const html = descriptionPreview('<img src=x onerror=alert(1)>\n\n설명.[* 참고 https://example.com/?a=1&b=2]');
  assert.ok(!html.includes("<img"));
  assert.match(html, /&lt;img/u);
  assert.match(html, /aria-label="주석 1"/u);
  assert.match(html, /href="https:\/\/example.com\/\?a=1&amp;b=2"/u);
  assert.match(lyricsPreview("첫째\n둘째\n\n넷째"), /첫째<br>둘째/u);
  assert.match(lyricsPreview("첫째\n둘째\n\n넷째"), /가사 더 보기/u);
});

test("손상된 임시본을 무시하고 오래된 revision은 자동 복원하지 않는다", () => {
  assert.equal(readSongDraft({ getItem: () => "broken" }, "song"), null);
  assert.equal(readSongDraft({ getItem: () => { throw new Error("blocked"); } }, "song"), null);
  const draft = { version: 1, revision: 2, form: { descriptionText: "수정 중인 본문", lyrics: { lines: [] }, videos: [] } };
  const loaded = readSongDraft({ getItem: () => JSON.stringify(draft) }, "song");
  assert.ok(canRestoreSongDraft(loaded, 2));
  assert.ok(!canRestoreSongDraft(loaded, 3));
  assert.equal(loaded.form.descriptionText, "수정 중인 본문");
});
