import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseInlineNotes } from "../shared/inline-notes.mjs";

/** 공유 미리보기에 쓰는 공개 주소. 카카오톡 등은 절대 주소만 읽습니다. */
export const SITE_ORIGIN = "https://cheers.app.hurdoo.kr";
export const SITE_NAME = "응원가 아카이브";
export const SHARE_IMAGE_DIR = "og";
export const DEFAULT_SHARE_IMAGE = `/${SHARE_IMAGE_DIR}/archive.jpg`;

export function songSharePath(songId) {
  return `/songs/${encodeURIComponent(songId)}/`;
}

export function songShareImagePath(songId) {
  return `/${SHARE_IMAGE_DIR}/songs/${songId}.jpg`;
}

function readJson(root, file) {
  return JSON.parse(readFileSync(path.join(root, file), "utf8"));
}

function plainExcerpt(text, maxLength) {
  const firstParagraph = String(text ?? "").split(/\n{2,}/u)[0] ?? "";
  const plain = parseInlineNotes(firstParagraph)
    .filter((token) => token.type !== "note")
    .map((token) => token.value)
    .join("")
    .replace(/\s+/gu, " ")
    .trim();
  return plain.length > maxLength ? `${plain.slice(0, maxLength - 1).trimEnd()}…` : plain;
}

/**
 * 공개 카탈로그의 곡마다 공유 페이지·공유 이미지에 필요한 값을 만듭니다.
 * 사이트 화면과 같은 정본(src/data/generated/catalog.json, data/original-songs.json)만 읽습니다.
 */
export function loadShareSongs(root) {
  const catalog = readJson(root, "src/data/generated/catalog.json");
  const originals = new Map(readJson(root, "data/original-songs.json").items.map((item) => [item.id, item]));
  const teams = new Map(catalog.organizations.map((team) => [team.id, team]));

  return catalog.songs.map((song) => {
    const team = teams.get(song.organizationId);
    const originalId = song.relationships.find(({ type }) => type === "original-song")?.targetId;
    const original = originalId ? originals.get(originalId) : undefined;
    const commissioned = song.legacy?.originType === "commissioned-original" || original?.kind === "commissioned";
    const lines = song.symbolicLines.filter(Boolean).slice(0, 2);

    let originText = "";
    if (original && commissioned) originText = "응원가로 새로 만든 곡";
    else if (original) originText = `원곡 ${original.title} — ${original.artist}`;

    const excerpt = plainExcerpt(song.descriptionText, 90);
    return {
      id: song.id,
      title: song.title,
      team: team?.name ?? "",
      teamColor: team?.colors.primary ?? "#8B0029",
      teamColorAlt: team?.colors.secondary ?? "#540018",
      lines,
      originText,
      pageTitle: `${song.title} · ${team?.name ?? ""} 응원가`,
      description: [originText && `${originText}.`, excerpt].filter(Boolean).join(" "),
    };
  });
}

export function shareImageExists(publicDir, imagePath) {
  return existsSync(path.join(publicDir, imagePath));
}
