import { createContext, useCallback, useContext, useMemo, useState, type ReactNode, type Ref } from "react";

interface PlaybackContextValue {
  activeKey: string | null;
  activate: (key: string) => void;
  close: () => void;
}

const PlaybackContext = createContext<PlaybackContextValue>({
  activeKey: null,
  activate: () => undefined,
  close: () => undefined,
});

export function DPlaybackProvider({ children, initialKey = null }: { children: ReactNode; initialKey?: string | null }) {
  const [activeKey, setActiveKey] = useState<string | null>(initialKey);
  const activate = useCallback((key: string) => setActiveKey(key), []);
  const close = useCallback(() => setActiveKey(null), []);
  const value = useMemo(() => ({ activeKey, activate, close }), [activeKey, activate, close]);

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function useDPlayback() {
  return useContext(PlaybackContext);
}

export function SharedYouTubeFrame({ videoId, startSeconds = 0, endSeconds, title, iframeRef }: {
  videoId: string;
  startSeconds?: number;
  endSeconds?: number;
  title: string;
  iframeRef?: Ref<HTMLIFrameElement>;
}) {
  const params = new URLSearchParams({ autoplay: "1", playsinline: "1", rel: "0" });
  if (startSeconds) params.set("start", String(startSeconds));
  if (endSeconds) params.set("end", String(endSeconds));

  return <iframe
    ref={iframeRef}
    src={`https://www.youtube.com/embed/${videoId}?${params.toString()}`}
    title={title}
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerPolicy="strict-origin-when-cross-origin"
    allowFullScreen
  />;
}
