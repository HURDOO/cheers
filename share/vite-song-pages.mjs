import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  DEFAULT_SHARE_IMAGE,
  SITE_NAME,
  SITE_ORIGIN,
  loadShareSongs,
  shareImageExists,
  songShareImagePath,
  songSharePath,
} from "./song-share.mjs";

/** 검색엔진에 알릴 공개 페이지. 이벤트 시안 페이지들은 각자 noindex라 넣지 않습니다. */
const INDEXED_STATIC_PATHS = ["/", "/events/korea-yonsei-games-2026/"];

const HOME_DESCRIPTION = "응원석에서 부르는 대학·야구 응원가와 그 원곡, 응원가가 된 이야기를 모은 아카이브";

const SHARE_BLOCK = /<!-- share-meta -->[\s\S]*?<!-- \/share-meta -->/u;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function shareMetaBlock({ title, description, pagePath, imagePath }) {
  const url = `${SITE_ORIGIN}${pagePath}`;
  const image = `${SITE_ORIGIN}${imagePath}`;
  return [
    "<!-- share-meta -->",
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    '<meta property="og:locale" content="ko_KR" />',
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    "<!-- /share-meta -->",
  ].join("\n      ");
}

/**
 * 빌드 결과의 아카이브 index.html을 바탕으로 /songs/<id>/index.html을 곡마다 만듭니다.
 * 앱 번들은 같고, 카카오톡·메신저 미리보기가 읽는 제목·설명·이미지만 곡별로 다릅니다.
 * 운영 Nginx는 실제 파일만 서빙하므로(try_files) 곡 주소마다 파일이 있어야 합니다.
 */
export function songSharePages() {
  let root = process.cwd();
  let outDir = "dist";
  let publicDir = "public";

  return {
    name: "song-share-pages",
    apply: "build",
    configResolved(config) {
      root = config.root;
      outDir = path.resolve(config.root, config.build.outDir);
      publicDir = config.publicDir;
    },
    closeBundle() {
      const template = readFileSync(path.join(outDir, "index.html"), "utf8");
      if (!SHARE_BLOCK.test(template)) throw new Error("index.html에 <!-- share-meta --> 블록이 없습니다.");

      const songs = loadShareSongs(root);
      const missingImages = [];

      songs.forEach((song) => {
        const imagePath = songShareImagePath(song.id);
        const hasImage = shareImageExists(publicDir, imagePath);
        if (!hasImage) missingImages.push(song.id);

        const pageTitle = `${song.pageTitle} — ${SITE_NAME}`;
        const html = template
          .replace(/<title>[\s\S]*?<\/title>/u, `<title>${escapeHtml(pageTitle)}</title>`)
          .replace(/<meta name="description" content="[^"]*" \/>/u, `<meta name="description" content="${escapeHtml(song.description)}" />`)
          .replace(SHARE_BLOCK, shareMetaBlock({
            title: song.pageTitle,
            description: song.description,
            pagePath: songSharePath(song.id),
            imagePath: hasImage ? imagePath : DEFAULT_SHARE_IMAGE,
          }));

        const target = path.join(outDir, "songs", song.id, "index.html");
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, html);
      });

      const lastmod = String(JSON.parse(readFileSync(path.join(root, "src/data/generated/catalog.json"), "utf8")).generatedAt ?? "").slice(0, 10);
      const urls = [...INDEXED_STATIC_PATHS, ...songs.map(({ id }) => songSharePath(id))];
      writeFileSync(path.join(outDir, "sitemap.xml"), [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls.map((url) => `  <url><loc>${SITE_ORIGIN}${url}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`),
        "</urlset>",
        "",
      ].join("\n"));

      console.log(`곡별 공유 페이지 ${songs.length}개와 sitemap.xml을 만들었습니다.`);
      if (missingImages.length) {
        console.warn(`공유 이미지가 없어 기본 이미지를 쓰는 곡 ${missingImages.length}개: ${missingImages.join(", ")}`);
        console.warn("npm run share:images 로 공유 이미지를 다시 만드세요.");
      }
    },
  };
}

function previewCard({ href, imagePath, title, description, isFallback }) {
  return `<a class="card" href="${escapeHtml(href)}" target="_blank" rel="noreferrer">
    <img src="${escapeHtml(imagePath)}" alt="" loading="lazy" />
    <div class="meta">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(description)}</p>
      <span>cheers.app.hurdoo.kr${isFallback ? " · <b>기본 이미지</b>" : ""}</span>
    </div>
  </a>`;
}

/**
 * 개발 서버 전용 /share-preview/ 페이지. 곡마다 메신저 공유 카드가 어떻게 보일지
 * (이미지·제목·설명) 한 화면에 모아 보여 줍니다. 운영 빌드에는 들어가지 않습니다.
 */
export function sharePreviewPage() {
  let root = process.cwd();
  let publicDir = "public";

  return {
    name: "share-preview-page",
    apply: "serve",
    configResolved(config) {
      root = config.root;
      publicDir = config.publicDir;
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!request.url?.startsWith("/share-preview")) return next();
        const cards = loadShareSongs(root).map((song) => {
          const imagePath = songShareImagePath(song.id);
          const isFallback = !shareImageExists(publicDir, imagePath);
          return {
            href: songSharePath(song.id),
            imagePath: isFallback ? DEFAULT_SHARE_IMAGE : imagePath,
            title: song.pageTitle,
            description: song.description,
            isFallback,
          };
        });
        const missing = cards.filter(({ isFallback }) => isFallback).length;
        const home = { href: "/", imagePath: DEFAULT_SHARE_IMAGE, title: SITE_NAME, description: HOME_DESCRIPTION, isFallback: false };
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.end(`<!doctype html><html lang="ko"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>공유 미리보기 점검</title>
<style>
  body { margin: 0; padding: 24px 16px 64px; background: #b2c7d9; font-family: -apple-system, "Apple SD Gothic Neo", sans-serif; }
  h1 { margin: 0 0 4px; font-size: 20px; }
  .note { margin: 0 0 20px; color: #333; font-size: 14px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; max-width: 1200px; }
  .card { display: block; overflow: hidden; border-radius: 12px; background: #fff; color: #111; text-decoration: none; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
  .card img { display: block; width: 100%; aspect-ratio: 1200 / 630; object-fit: cover; background: #ddd; }
  .meta { padding: 12px 14px 14px; }
  .meta strong { display: block; font-size: 15px; line-height: 1.35; }
  .meta p { display: -webkit-box; margin: 4px 0 6px; overflow: hidden; color: #555; font-size: 13px; line-height: 1.45; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .meta span { color: #999; font-size: 12px; }
  .meta b { color: #d7233f; }
</style></head><body>
<h1>공유 미리보기 점검 · ${cards.length}곡</h1>
<p class="note">메신저에 곡 링크를 보냈을 때 뜨는 카드 모양입니다. 실제 앱마다 글자 수 자르기는 조금 다릅니다.${missing ? ` 공유 이미지가 없는 곡 ${missing}개는 기본 이미지로 공유됩니다(npm run share:images).` : ""}</p>
<div class="grid">${[home, ...cards].map(previewCard).join("")}</div>
</body></html>`);
      });
    },
  };
}
