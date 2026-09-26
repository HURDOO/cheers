#!/usr/bin/env node
/**
 * 곡별 공유 이미지(1200×630 JPG)를 public/og/에 만듭니다.
 *
 * 설치된 Google Chrome의 헤드리스 스크린샷과 macOS 기본 도구 sips만 사용하므로
 * 새 의존성이 필요 없습니다. 결과 이미지는 저장소에 커밋해 운영 빌드가 그대로 복사합니다.
 *
 *   npm run share:images              # 이미지가 없는 곡만
 *   npm run share:images -- --all     # 전부 다시
 *   npm run share:images -- <song-id> # 지정한 곡만
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DEFAULT_SHARE_IMAGE, SITE_NAME, loadShareSongs, songShareImagePath } from "../share/song-share.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const fontUrl = pathToFileURL(path.join(publicDir, "fonts/PretendardVariable.woff2")).href;
const chromePath = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** 카드와 같은 기준으로, 긴 줄도 너무 작아지지 않게 가사 크기를 정합니다. */
function lyricSize(lines) {
  const longest = Math.max(3, ...lines.map((line) => [...line].reduce((sum, character) => (
    sum + (character === " " ? 0.28 : /[A-Za-z0-9]/u.test(character) ? 0.58 : 0.9)
  ), 0)));
  return Math.round(Math.min(118, Math.max(64, 1040 / longest)));
}

const baseStyle = `
  @font-face { font-family: "Pretendard"; src: url("${fontUrl}") format("woff2"); font-weight: 45 920; }
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body { font-family: "Pretendard", sans-serif; color: #fff; word-break: keep-all; letter-spacing: -0.02em; }
`;

function songCardHtml(song) {
  const size = lyricSize(song.lines);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${baseStyle}
    body { position: relative; padding: 56px 72px 60px; display: flex; flex-direction: column;
      background: linear-gradient(150deg, ${song.teamColor}, ${song.teamColorAlt}); }
    body::before { content: ""; position: absolute; inset: 0;
      background: radial-gradient(90% 90% at 100% 0%, rgba(255,255,255,.22), transparent 60%),
        linear-gradient(180deg, transparent 55%, rgba(0,0,0,.35)); }
    .top, .lyrics, .bottom { position: relative; }
    .top { display: flex; justify-content: space-between; align-items: center; font-size: 26px; font-weight: 800; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .mark { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; background: #fff; color: ${song.teamColor}; font-weight: 900; }
    .team { padding: 8px 18px; border-radius: 999px; background: rgba(0,0,0,.25); font-size: 24px; font-weight: 700; }
    .lyrics { margin: auto 0; font-size: ${size}px; font-weight: 900; line-height: 1.04; letter-spacing: -0.06em; }
    .lyrics span { display: block; }
    .bottom { display: flex; justify-content: space-between; align-items: flex-end; gap: 40px; }
    .title { font-size: 44px; font-weight: 900; letter-spacing: -0.04em; white-space: nowrap; }
    .origin { max-width: 560px; padding: 14px 22px; border-radius: 16px; background: rgba(0,0,0,.28);
      font-size: 26px; font-weight: 700; line-height: 1.3; text-align: right; }
  </style></head><body>
    <div class="top"><span class="brand"><span class="mark">응</span>${SITE_NAME}</span><span class="team">${escapeHtml(song.team)}</span></div>
    <p class="lyrics">${song.lines.map((line) => `<span>${escapeHtml(line)}</span>`).join("")}</p>
    <div class="bottom"><span class="title">${escapeHtml(song.title)}</span>${song.originText ? `<span class="origin">${escapeHtml(song.originText)}</span>` : ""}</div>
  </body></html>`;
}

function archiveCardHtml(songs) {
  const sample = songs.slice(0, 6);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${baseStyle}
    body { padding: 64px 72px; background: #0c0b0a; display: flex; flex-direction: column; justify-content: space-between; }
    .brand { display: flex; align-items: center; gap: 14px; font-size: 30px; font-weight: 800; }
    .mark { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 13px; background: #e0304a; font-weight: 900; }
    h1 { font-size: 76px; font-weight: 900; line-height: 1.12; letter-spacing: -0.055em; }
    h1 em { font-style: normal; color: #ff5d6c; }
    .chips { display: flex; gap: 12px; }
    .chips span { flex: 1; height: 16px; border-radius: 8px; }
  </style></head><body>
    <div class="brand"><span class="mark">응</span>${SITE_NAME}</div>
    <h1>목이 터져라 부른 그 응원가,<br><em>원곡이 따로 있다.</em></h1>
    <div class="chips">${sample.map((song) => `<span style="background:linear-gradient(90deg, ${song.teamColor}, ${song.teamColorAlt})"></span>`).join("")}</div>
  </body></html>`;
}

function render(html, target, workDir) {
  const htmlPath = path.join(workDir, "card.html");
  const pngPath = path.join(workDir, "card.png");
  writeFileSync(htmlPath, html);
  execFileSync(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=1200,630",
    "--virtual-time-budget=3000",
    "--allow-file-access-from-files",
    `--screenshot=${pngPath}`,
    pathToFileURL(htmlPath).href,
  ], { stdio: "ignore" });
  mkdirSync(path.dirname(target), { recursive: true });
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "84", pngPath, "--out", target], { stdio: "ignore" });
}

if (!existsSync(chromePath)) {
  console.error(`Chrome을 찾을 수 없습니다: ${chromePath}\nCHROME_PATH 환경 변수로 경로를 지정하세요.`);
  process.exit(1);
}

const args = process.argv.slice(2);
const renderAll = args.includes("--all");
const requested = new Set(args.filter((arg) => !arg.startsWith("--")));
const songs = loadShareSongs(root);
const workDir = mkdtempSync(path.join(os.tmpdir(), "cheers-share-"));

try {
  let count = 0;
  const archiveTarget = path.join(publicDir, DEFAULT_SHARE_IMAGE);
  if (renderAll || !existsSync(archiveTarget)) {
    render(archiveCardHtml(songs), archiveTarget, workDir);
    count += 1;
  }

  for (const song of songs) {
    const target = path.join(publicDir, songShareImagePath(song.id));
    const wanted = requested.size ? requested.has(song.id) : renderAll || !existsSync(target);
    if (!wanted) continue;
    render(songCardHtml(song), target, workDir);
    count += 1;
    console.log(`- ${song.id}`);
  }
  console.log(`공유 이미지 ${count}개를 만들었습니다: public/og/`);
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
