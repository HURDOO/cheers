import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const server = await createServer({
  root: fileURLToPath(new URL("../", import.meta.url)),
  server: { middlewareMode: true },
  appType: "custom",
});

try {
  const { getPreviewSideContent, getSideContent } = await server.ssrLoadModule("/src/events/korea-yonsei-games-2026/eventContent.ts");
  const { BaseballStory } = await server.ssrLoadModule("/src/events/korea-yonsei-games-2026-d/BaseballStory.tsx");
  const { BASEBALL_CONNECTIONS } = await server.ssrLoadModule("/src/events/korea-yonsei-games-2026-d/baseballConnections.ts");
  const { RivalryHero, getTitlePose } = await server.ssrLoadModule("/src/events/korea-yonsei-games-2026-d/RivalryHero.tsx");
  const { RivalrySwitch, getSwitchPlacement } = await server.ssrLoadModule("/src/events/korea-yonsei-games-2026-d/RivalrySwitch.tsx");
  const { RivalryStory, RIVALRY_LINES, getRivalryPlaybackSong } = await server.ssrLoadModule("/src/events/korea-yonsei-games-2026-d/RivalryStory.tsx");
  const { SongSections, getListeningNote } = await server.ssrLoadModule("/src/events/korea-yonsei-games-2026-d/SongSections.tsx");
  const { Finale, CHEER_INSTAGRAM } = await server.ssrLoadModule("/src/events/korea-yonsei-games-2026-d/Finale.tsx");
  const { SCHEDULES, TIMELINE } = await server.ssrLoadModule("/src/events/korea-yonsei-games-2026/eventConfig.ts");
  const { KoreaYonseiGamesCPage } = await server.ssrLoadModule("/src/events/korea-yonsei-games-2026-c/KoreaYonseiGamesCPage.tsx");
  const contents = { korea: getPreviewSideContent("korea"), yonsei: getPreviewSideContent("yonsei") };
  for (const side of ["korea", "yonsei"]) {
    assert.equal(contents[side].mustKnowSongs.length, 6, `${side}: all six D preview songs remain visible`);
    assert.equal(contents[side].memorySongs.length, 8, `${side}: all eight D memory songs remain visible`);
    assert.equal(contents[side].rivalrySongs.length, 4, `${side}: all four D rivalry songs remain visible`);
    assert.ok(getSideContent(side).mustKnowSongs.every((song) => song.dataStatus !== "mock"), "The public source remains release-only");
  }
  const expected = {
    korea: [["korea-university-minjogui-aria", "kiwoom-heroes-seungni-ui-hamseong"], ["korea-university-minjogui-aria", "lg-twins-seoul-ui-aria"]],
    yonsei: [["hanwha-eagles-saranghanda-eagles", "yonsei-university-haneul-kkeutkkaji"], ["yonsei-university-yonseiyeo-saranghanda", "lg-twins-saranghanda-lg"]],
  };

  for (const side of ["korea", "yonsei"]) {
    const html = renderToStaticMarkup(createElement(BaseballStory, { side, contents }));
    const edges = [...html.matchAll(/data-lineage-from="([^"]+)" data-lineage-to="([^"]+)"/g)].map(([, from, to]) => [from, to]);
    const expectedEdges = expected[side].flatMap((route) => route.slice(1).map((to, index) => [route[index], to]));
    assert.deepEqual(edges, expectedEdges, `${side}: title-level arrows preserve the directed lineage`);
    assert.ok(!html.includes("baseball-route__flow"), "No separate route strip above video titles");
    const featured = [...html.matchAll(/<article class="baseball-story__version" data-song-id="([^"]+)"/g)].map(([, id]) => id);
    assert.deepEqual(featured, side === "korea"
      ? ["kiwoom-heroes-seungni-ui-hamseong", "lg-twins-seoul-ui-aria"]
      : ["hanwha-eagles-saranghanda-eagles", "lg-twins-saranghanda-lg"], "Only the two baseball videos are featured");
    assert.equal((html.match(/학교 버전 듣기/g) ?? []).length, expected[side].length, "Campus versions stay accessible as supporting links");
    assert.ok(html.includes(side === "korea" ? "키움과 LG가 부르는,<br/><em>민족의 아리아.</em>" : "한화에서 연세로,<br/><em>연세에서 LG로.</em>"));
    assert.ok(!html.includes("<details") && html.includes('class="baseball-story__rail"'), "Secondary connections are visible in a horizontal rail");
    assert.equal((html.match(/원곡 계보 자세히 알아보기/g) ?? []).length, side === "korea" ? 1 : 2);
    assert.ok(html.includes("구단별 응원가 더 알아보기") && html.includes('href="/?view=team&amp;type=baseball"'));
    assert.ok(!html.includes("대학·야구 응원가 관련 기사"));
    if (side === "yonsei") assert.ok(html.includes("전 구단 아파트 응원 영상 찾기"));
    assert.ok(html.includes("같은 원곡"), "Keep the distinction between shared originals and direct adaptations");
    const connections = [...html.matchAll(/data-relation="([^"]+)" data-campus-song="([^"]+)" data-club-song="([^"]+)"/g)].map(([, kind, campusId, clubId]) => ({kind, campusId, clubId}));
    assert.deepEqual(connections, BASEBALL_CONNECTIONS[side].map(({kind, campusId, clubId}) => ({kind, campusId, clubId})), "Every curated connection renders, including songs outside the six/eight playlists");
    assert.equal(connections.length, side === "korea" ? 5 : 4);
    if (side === "korea") {
      assert.ok(!html.includes("위닝케이티"), "Replace the repeated KT club with SSG");
      assert.ok(html.includes('href="/?song=kia-tigers-kiareul-eungwonhara"'), "Approved KIA song opens the main archive");
      assert.ok(html.includes("고연가 — 고대를 노래하라") && html.includes("고연가 — 고대를 사랑하라"), "Do not conflate the two 고연가 songs");
      assert.ok(connections.some(c => c.clubId === "ssg-landers-tuhon-ui-landers" && c.campusId === "korea-university-godaereul-saranghara" && c.kind === "shared"));
      assert.ok(connections.some(c => c.clubId === "kia-tigers-kiareul-eungwonhara" && c.campusId === "korea-university-godaereul-noraehara"));
      assert.ok(html.includes("t=831s"), "SSG's official playlist opens at 투혼의 랜더스");
    } else {
      assert.ok(connections.some(c => c.clubId === "kia-tigers-lineup-song" && c.campusId === "yonsei-university-seosi" && c.kind === "shared"));
      assert.ok(html.includes("t=22s"), "KIA's official playlist opens at the lineup song");
      assert.ok(!html.includes("대구FC"), "Do not classify a football connection as baseball");
    }
    if (side === "yonsei") assert.match(html, /href="\/\?song=doosan-bears-haeya" aria-label="두산 베어스 해야 자세히 알아보기"/, "Doosan's card opens the main archive, not YouTube");
    if (side === "korea") assert.ok(html.includes("관계 확인 중"), "Do not imply the unresolved KT relationship is confirmed");
    assert.ok(html.includes(`data-camp="${side}"`));
    assert.ok(!html.includes("aria-pressed"), "No independent school selector in the baseball section");
    assert.ok(!html.includes("baseball-lineage"), "Do not restore the old nested archive layout");
    assert.ok(!html.includes("<iframe"), "Videos load only after playback is requested");
    for (const excerpt of side === "korea" ? ["t=832s", "t=1451s"] : ["t=1027s"]) {
      assert.ok(html.includes(excerpt), `Preserve excerpt ${excerpt}`);
    }

    const hero = renderToStaticMarkup(createElement(RivalryHero, { side }));
    assert.ok(!hero.includes("<button"), "The hero reserves space for the single traveling control, not another picker");
    assert.equal((hero.match(/class="rivalry-hero__crest"/g) ?? []).length, 2, "Both rival school crests remain visible");
    assert.ok(!hero.includes("rivalry-hero__core"), "No enclosing spheres around the school logos");
    assert.equal((hero.match(/data-active="true"/g) ?? []).length, 1, "One camp moves into the foreground");
    const title = hero.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "";
    assert.deepEqual([...title.matchAll(/data-school="([^"]+)"/g)].map(([, school]) => school), [side, side === "korea" ? "yonsei" : "korea"], "The title swaps school order with the selected side");
    assert.ok(hero.includes('id="rivalry-school-home"'));
    assert.ok(hero.includes("href=\"#match-songs\"") && hero.includes("응원가 미리 듣기"));
    assert.ok(!hero.includes("href=\"#match-rivalry\"") && !hero.includes("상대의 도발 들어보기") && !hero.includes("우리 응원부터 듣기"));
    assert.ok(!hero.includes("medallion") && !hero.includes("__orbit") && !hero.includes("SPECIAL EDITION"), "Do not restore generic luxury decorations");
    assert.ok(hero.includes("고려대학교") && hero.includes("연세대학교"), "The opponent remains part of the cover");
    assert.ok(hero.includes("필승, 전승, 압승을 위해!"), "The cover communicates its purpose");
    assert.deepEqual([...hero.matchAll(/class="rivalry-hero__crest" data-school="([^"]+)"/g)].map(([, school]) => school), ["yonsei", "korea"], "The duel matches the selector's left-to-right order");
    const picker = renderToStaticMarkup(createElement(RivalrySwitch, { side, onChange: () => {} }));
    const buttons = [...picker.matchAll(/<button[^>]*aria-label="([^"]+)" aria-pressed="([^"]+)"/g)];
    assert.deepEqual(buttons.map(([, label]) => label), ["연세 관점", "고려 관점"], "Yonsei is always the left choice");
    assert.deepEqual(buttons.map(([, , pressed]) => pressed), side === "yonsei" ? ["true", "false"] : ["false", "true"], "The selected choice tracks the page's school setting");
    const rivalry = renderToStaticMarkup(createElement(RivalryStory, { side, contents }));
    assert.ok(!rivalry.includes("rivalry-story__intro"), "Remove editorial process commentary from the visitor-facing story");
    assert.ok(!rivalry.includes("<details"), "Other rivalry songs stay unfolded");
    assert.ok(rivalry.includes("꿇어라 연세") && rivalry.includes("Woo"), "Keep both lead rivalry performances");
    assert.ok(!rivalry.includes("rivalry-story__playback-note"), "Remove redundant playback notes without losing video start times");
    assert.equal((rivalry.match(/aria-controls="rivalry-more-player"/g) ?? []).length, 6, "All six supporting songs open the shared inline player");
    assert.equal((rivalry.match(/id="rivalry-more-player"/g) ?? []).length, 1);
    assert.ok(!rivalry.includes("<iframe"), "No rivalry playback before the user requests it");
    for (const line of Object.values(RIVALRY_LINES)) assert.ok(rivalry.includes(line), "Preserve the user's rivalry lyrics");
    assert.ok(rivalry.includes("신촌은 골로골로 골로간다~") && rivalry.includes("고대가 꿈틀거리네, 꽉 밟아라!"));
    assert.ok(rivalry.includes("마지막 필살기 한방에 넉다운 K.O.") && !rivalry.includes("한방이"));
    for (const song of contents[side].rivalrySongs.filter((song) => !/woo$|kkureora-yonsei$/.test(song.id))) {
      const playable = getRivalryPlaybackSong(song);
      assert.match(playable.media.videoId, /^[A-Za-z0-9_-]{11}$/);
      assert.equal(playable.lyrics[0], RIVALRY_LINES[song.id]);
    }
    const listening = renderToStaticMarkup(createElement(SongSections, { side, content: contents[side] }));
    assert.ok(listening.includes(side === "yonsei" ? "함성 발사!" : "애니멀 사운드 발사!"));
    assert.ok(listening.includes("1학기, 어디까지") && listening.includes("기억나?"));
    assert.ok(!listening.includes('role="tab"'), "Memory listening is a separate section, not a tab");
    assert.ok(listening.indexOf('id="match-songs"') < listening.indexOf('id="match-memory"'));
    assert.equal((listening.match(/aria-pressed=/g) ?? []).length, 14, "All six essentials and eight memory songs are initially visible");
    assert.ok(!listening.includes("<iframe"), "Listening videos load on request");
    assert.ok(listening.includes("행사 전 꼭 들을 6곡") && listening.includes("대표 응원가부터 올해 신곡까지."));
    assert.ok(listening.includes('class="listening-player__detail"') && listening.includes("자세히 보기"));
    assert.ok(listening.includes(side === "korea" ? "지성의 힘으로 야성의 힘으로" : "일어나 이제는 응원을 해야지!"), "Representative lines appear under playlist titles");
    assert.ok(listening.includes("응원석에서 함께 부를 여섯 곡을 미리 들어보세요.") && listening.includes("1학기 합동응원전에서 들었던,"));
    const finale = renderToStaticMarkup(createElement(Finale, {side}));
    assert.ok(finale.includes(`2026년 ${side === "korea" ? "고연전" : "연고전"}도`) && finale.includes("필승, 전승, 압승!"));
    assert.ok(finale.includes(CHEER_INSTAGRAM[side]) && finale.includes("응원단 인스타그램") && !finale.includes("우리 응원 다시 듣기"));
    console.log(`${side}: lineage order, originals, videos, and inherited school setting verified`);
  }

  const originalC = renderToStaticMarkup(createElement(KoreaYonseiGamesCPage));
  const redesignedD = renderToStaticMarkup(createElement(KoreaYonseiGamesCPage, {
    concept: "D",
    renderHero: ({ side }) => createElement(RivalryHero, { side }),
    renderSchoolPicker: ({ side, onChange }) => createElement(RivalrySwitch, { side, onChange }),
    renderRivalry: ({ side, contents }) => createElement(RivalryStory, { side, contents }),
    renderBaseball: ({ side, contents }) => createElement(BaseballStory, { side, contents }),
    renderSongs: ({ side, content }) => createElement(SongSections, { side, content }),
    renderFooter: ({ side }) => createElement(Finale, { side }),
  }));
  assert.ok(originalC.includes("목록은 단정하게,") && originalC.includes("<dt>데이터</dt>"), "C keeps its existing copy and player metadata");
  assert.ok(!originalC.includes("is-concept-d") && !originalC.includes("rivalry-hero__medallion"), "D's cover is opt-in");
  assert.ok(redesignedD.includes("함성 발사!") && !redesignedD.includes("<dt>데이터</dt>"), "D prioritizes visitor-facing listening guidance");
  assert.equal((redesignedD.match(/aria-label="학교 관점 선택"/g) ?? []).length, 1, "There is only one live school selector");
  assert.ok(redesignedD.includes('class="match-page is-concept-d" data-side="yonsei"'), "Without an explicit school setting, D defaults to Yonsei");
  assert.ok(redesignedD.includes('aria-label="2026 정기 연고전"'), "The default cover uses this year's Yon-Ko title");
  for (const caption of ["FAST TRACK", "우리 응원석", "상대 응원석", "같은 무대. 다른 함성.", "첫 곡부터 바로 재생", "선택한 응원가"]) {
    assert.ok(!redesignedD.includes(caption), `Remove redundant UI copy: ${caption}`);
  }
  const playlist = redesignedD.match(/class="match-song-list"[^>]*>([\s\S]*?)<\/div><aside/)?.[1] ?? "";
  assert.ok(playlist && playlist.includes('class="listening-song-line"') && !playlist.includes("<p>"), "Short representative lyrics support titles without repeating long descriptions");
  assert.ok(!redesignedD.includes("일정은 기획용 데이터입니다."), "Remove the requested draft disclaimer");
  assert.ok(redesignedD.includes("10월 2일부터 3일까지") && redesignedD.includes("9월 22일 (화)"), "Use Korean dates");
  assert.ok(redesignedD.includes("잠실야구장") && redesignedD.includes("잠실학생체육관") && redesignedD.includes("목동종합운동장") && redesignedD.includes("목동 아이스링크"));
  assert.equal(SCHEDULES.find((item) => item.id === "korea-sejong-ot").venue, "녹지운동장");
  assert.equal(TIMELINE.find((item) => item.id === "joint-cheer").timeLabel, "18:00");
  assert.ok(TIMELINE.find((item) => item.id === "joint-cheer").detail.includes("연세대학교 신촌캠퍼스"));
  const schedule = redesignedD.match(/<section class="match-schedule"[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.equal((schedule.match(/<li /g) ?? []).length, 5, "Four OTs and one joint rehearsal, without a duplicate matchday row");
  assert.ok(schedule.includes("lucide-swords"));
  assert.equal((schedule.match(/>자율 입장</g) ?? []).length, 1);
  assert.equal((schedule.match(/>티켓 필요</g) ?? []).length, 3);
  for (const camp of ["yonsei", "korea", "neutral"]) assert.equal((schedule.match(new RegExp(`data-camp="${camp}"`, "g")) ?? []).length, 2, "Schedule colors are tied to the event, not selected school");
  assert.ok(redesignedD.includes('class="rivalry-finale"') && redesignedD.includes("rivalry-finale__horizon"));
  const wonsirimNote = getListeningNote(contents.yonsei.mustKnowSongs[0]);
  assert.equal(wonsirimNote.line, "일어나 이제는 응원을 해야지!");
  assert.equal(getListeningNote(contents.yonsei.mustKnowSongs[1]).line, "내 가슴속에 영원히 남을 사랑이 되어라");
  assert.equal(getListeningNote(contents.yonsei.mustKnowSongs[2]).line, "승리를 향해 외쳐라 하늘 끝까지");
  assert.ok(wonsirimNote.description.includes("고대의 뱃노래"));
  assert.equal(getListeningNote(contents.korea.memorySongs[0]).line, "지성의 힘으로 야성의 힘으로");
  assert.equal(getListeningNote({id: "unknown-song", title: "Unknown"}).line, undefined, "Do not fabricate lyrics for unresolved records");
  const heroCss = await readFile(new URL("../src/events/korea-yonsei-games-2026-d/hero.css", import.meta.url), "utf8");
  assert.ok(!/transition:\s*filter/.test(heroCss) && !/data-active[^\n]+filter:/.test(heroCss), "School changes must not tween crest glow colors");
  assert.ok(redesignedD.includes("디카츄") && redesignedD.includes("baseball-route__source"), "Keep video attribution and original-song lineage");
  assert.ok(getTitlePose("korea", "korea").scale > getTitlePose("yonsei", "yonsei").scale, "Optically compensate for the lighter 고 glyph");
  for (const side of ["yonsei", "korea"]) {
    const other = side === "korea" ? "yonsei" : "korea";
    assert.ok(getTitlePose(side, side).scale / getTitlePose(other, side).scale > 1.2, "The leading school is clearly larger");
    assert.equal(getTitlePose(other, side).y, other === "yonsei" ? "-0.13em" : "-0.0375em", "The opponent is optically lifted from the very first render; 고's lift is halved");
    assert.equal(getTitlePose(side, side).y, "0em");
  }
  assert.equal((redesignedD.match(/id="rivalry-school-dock"/g) ?? []).length, 1);
  assert.equal((redesignedD.match(/id="rivalry-school-home"/g) ?? []).length, 1);
  assert.ok(!originalC.includes("rivalry-school-dock"), "Traveling controls are opt-in for D");
  for (const anchor of ["match-schedule", "match-songs", "match-memory", "match-rivalry", "match-baseball"]) {
    assert.equal((redesignedD.match(new RegExp(`id="${anchor}"`, "g")) ?? []).length, 1, `Single navigation target: ${anchor}`);
  }
  console.log("D full-page navigation and copy verified; C remains unchanged");

  const home = { left: 416, top: 120, width: 368, height: 66 };
  const dock = { left: 800, top: 9, width: 212, height: 46 };
  assert.deepEqual(getSwitchPlacement(home, dock, 0), { ...home, progress: 0 }, "Top of page: centered, full-size control");
  const middle = getSwitchPlacement({ ...home, top: 70 }, dock, 50);
  assert.ok(middle.left > home.left && middle.left < dock.left && middle.width < home.width && middle.width > dock.width);
  assert.deepEqual(getSwitchPlacement({ ...home, top: -380 }, dock, 500), { ...dock, progress: 1 }, "Scrolled: dock exactly inside the header");
  assert.deepEqual(getSwitchPlacement(home, dock, 0), { ...home, progress: 0 }, "Returning to top restores the initial position");
  const mobileDock = { left: 118, top: 6, width: 190, height: 46 };
  assert.deepEqual(getSwitchPlacement({ left: 16, top: -200, width: 288, height: 60 }, mobileDock, 320), { ...mobileDock, progress: 1 }, "Small screens keep the control within the header and retain a 44px target");
  console.log("Traveling switch geometry verified: home, mid-scroll, dock, return, mobile");
} finally {
  await server.close();
}
