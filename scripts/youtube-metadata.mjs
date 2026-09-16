import { EditorialError } from "./content-editorial-store.mjs";
import { extractYouTubeVideoId } from "../shared/youtube.mjs";

// Only a canonical YouTube endpoint is fetched, never the supplied URL.
export async function fetchYouTubeMetadata(sourceUrl, fetcher = fetch) {
  const videoId = extractYouTubeVideoId(sourceUrl);
  if (!videoId) throw new EditorialError("INVALID_YOUTUBE_URL", "YouTube 영상 주소를 확인해 주세요.");
  const endpoint = new URL("https://www.youtube.com/oembed");
  endpoint.searchParams.set("url", `https://www.youtube.com/watch?v=${videoId}`);
  endpoint.searchParams.set("format", "json");
  try {
    const response = await fetcher(endpoint, { signal: AbortSignal.timeout(8000), redirect: "error" });
    if (!response.ok) throw new Error(`YouTube ${response.status}`);
    const data = await response.json();
    if (data.type !== "video" || typeof data.title !== "string" || typeof data.author_name !== "string") {
      throw new Error("Invalid metadata");
    }
    return {
      videoId,
      title: data.title.slice(0, 300),
      channelName: data.author_name.slice(0, 200),
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch {
    throw new EditorialError("VIDEO_METADATA_UNAVAILABLE", "영상 정보를 가져오지 못했어요. 제목과 채널명을 직접 입력하거나 URL만 저장할 수 있어요.", 502);
  }
}
