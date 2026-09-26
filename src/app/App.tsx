import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import { getCheerSong } from "../data/catalog";
import { HomePage } from "./archive/HomePage";
import { SongPage } from "./archive/SongPage";
import { FILTER_TEAMS, type TeamFilter } from "./archive/lib";
import "./archive/archive.css";

const SITE_TITLE = "응원가 아카이브";
const EVENT_URL = "/events/korea-yonsei-games-2026/";

type Route = { songId: string | null; filter: TeamFilter; query: string };

function readRoute(): Route {
  const params = new URLSearchParams(window.location.search);
  const songId = params.get("song");
  const team = params.get("team") ?? params.get("type") ?? "all";
  const validFilter = team === "baseball" || team === "university" || FILTER_TEAMS.some(({ id }) => id === team);

  return {
    songId: songId && getCheerSong(songId) ? songId : null,
    filter: validFilter ? team : "all",
    query: params.get("q") ?? "",
  };
}

function routeUrl({ songId, filter, query }: Route) {
  const params = new URLSearchParams();
  if (songId) params.set("song", songId);
  else {
    if (filter !== "all") params.set("team", filter);
    if (query) params.set("q", query);
  }
  const search = params.toString();
  return `${window.location.pathname}${search ? `?${search}` : ""}`;
}

type Theme = "light" | "dark";
const THEME_KEY = "cheers-theme";
const THEME_COLOR: Record<Theme, string> = { light: "#f6f4f0", dark: "#0c0b0a" };

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
}

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === "light" ? "light" : "dark"));

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // 저장이 막힌 브라우저에서는 이번 방문에만 적용합니다.
    }
  }

  return (
    <button
      type="button"
      className="topbar__icon"
      onClick={toggle}
      aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
      title={theme === "dark" ? "라이트 모드" : "다크 모드"}
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

function trackPageView() {
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  gtag?.("event", "page_view", { page_location: window.location.href, page_title: document.title });
}

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const homeScroll = useRef(0);
  const song = route.songId ? getCheerSong(route.songId) ?? null : null;
  const isFirstRender = useRef(true);

  const routeRef = useRef(route);
  routeRef.current = route;

  const navigate = useCallback((songId: string | null) => {
    const current = routeRef.current;
    const depth: number = window.history.state?.songDepth ?? 0;

    if (!songId) {
      // 홈에서 들어온 경우 홈 기록으로 돌아가 스크롤 위치까지 복원합니다.
      if (depth > 0) {
        window.history.go(-depth);
        return;
      }
      const next = { ...current, songId: null };
      window.history.pushState(null, "", routeUrl(next));
      setRoute(next);
      window.scrollTo({ top: 0 });
      return;
    }

    if (!current.songId) homeScroll.current = window.scrollY;
    const next = { ...current, songId };
    window.history.pushState({ songDepth: current.songId ? (depth > 0 ? depth + 1 : 0) : 1 }, "", routeUrl(next));
    setRoute(next);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    function handlePopState() {
      const next = readRoute();
      setRoute(next);
      if (!next.songId) requestAnimationFrame(() => window.scrollTo({ top: homeScroll.current }));
      else window.scrollTo({ top: 0 });
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    document.title = song ? `${song.title} · ${song.team} — ${SITE_TITLE}` : SITE_TITLE;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    trackPageView();
  }, [song]);

  const updateList = useCallback((patch: Partial<Pick<Route, "filter" | "query">>) => {
    const next = { ...routeRef.current, ...patch };
    window.history.replaceState(window.history.state, "", routeUrl(next));
    setRoute(next);
  }, []);

  return (
    <div className="archive">
      <header className="topbar">
        <div className="topbar__inner">
          {song ? (
            <a
              className="topbar__back"
              href={window.location.pathname}
              onClick={(event) => { event.preventDefault(); navigate(null); }}
            >
              <ArrowLeft size={18} /> 전체 응원가
            </a>
          ) : (
            <a className="brand" href={window.location.pathname}>
              <span className="brand__mark" aria-hidden="true">응</span>
              {SITE_TITLE}
            </a>
          )}
          <div className="topbar__actions">
            <a className="topbar__event" href={EVENT_URL}>
              <span className="topbar__dot" aria-hidden="true" />
              <span>2026 정기전<span className="topbar__event-more"> 응원가 예습</span></span>
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main>
        {song ? (
          <SongPage song={song} navigate={navigate} />
        ) : (
          <HomePage
            filter={route.filter}
            query={route.query}
            onFilter={(filter) => updateList({ filter })}
            onQuery={(query) => updateList({ query })}
            navigate={navigate}
          />
        )}
      </main>

      <footer className="footer">
        <p>{SITE_TITLE} — 응원석에서 부르는 노래와 그 원곡의 기록</p>
        <p>사용자가 검수한 곡만 공개합니다.</p>
      </footer>
    </div>
  );
}
