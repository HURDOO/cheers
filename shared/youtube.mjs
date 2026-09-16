export function extractYouTubeVideoId(value) {
  try {
    const url = new URL(String(value ?? "").trim());
    if (!["https:", "http:"].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./u, "");
    let id = null;
    if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0];
    if (["youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
      id = url.searchParams.get("v");
      const [kind, pathId] = url.pathname.split("/").filter(Boolean);
      if (!id && ["shorts", "embed", "live"].includes(kind)) id = pathId;
    }
    return id && /^[A-Za-z0-9_-]{11}$/u.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function youtubeStartSeconds(value) {
  if (!extractYouTubeVideoId(value)) return 0;
  const url = new URL(value);
  const time = url.searchParams.get("t") ?? url.searchParams.get("start") ?? "0";
  if (/^\d+$/u.test(time)) return Math.min(Number(time), 86400);
  const match = time.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/u);
  return match ? Math.min(Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0), 86400) : 0;
}
