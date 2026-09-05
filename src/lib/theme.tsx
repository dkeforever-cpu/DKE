"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const THEME_KEY = "dke-theme-v1";

export type ThemeMode = "light" | "dark";
export type ViewMode = "auto" | "mobile" | "desktop";

export interface ThemeState {
  accent: string;
  mode: ThemeMode;
  scale: number; // percent, 80-130
  viewMode: ViewMode;
}

const DEFAULT_THEME: ThemeState = { accent: "#3355d6", mode: "light", scale: 100, viewMode: "auto" };

export const ACCENT_PRESETS: { name: string; value: string }[] = [
  { name: "블루", value: "#3355d6" },
  { name: "퍼플", value: "#7c4dfd" },
  { name: "인디고", value: "#4f46e5" },
  { name: "틸", value: "#0f9488" },
  { name: "그린", value: "#1f8a4c" },
  { name: "오렌지", value: "#d97706" },
  { name: "레드", value: "#d92d20" },
  { name: "차콜", value: "#23262e" },
];

interface ThemeContextValue extends ThemeState {
  setAccent: (hex: string) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  setScale: (scale: number) => void;
  setViewMode: (viewMode: ViewMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function loadTheme(): ThemeState {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const raw = window.localStorage.getItem(THEME_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ThemeState>;
      return { ...DEFAULT_THEME, ...parsed };
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeState>(DEFAULT_THEME);
  // Guards the persist effect below from firing with the pre-load default
  // state and clobbering localStorage before the saved theme has loaded.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(loadTheme());
    setLoaded(true);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", theme.accent);
    document.documentElement.setAttribute("data-theme", theme.mode);
    document.documentElement.setAttribute("data-view", theme.viewMode);
    document.body.style.zoom = String(theme.scale / 100);
    if (loaded) {
      window.localStorage.setItem(THEME_KEY, JSON.stringify(theme));
    }
  }, [theme, loaded]);

  const setAccent = useCallback((hex: string) => {
    setTheme((t) => ({ ...t, accent: hex }));
  }, []);

  const setMode = useCallback((mode: ThemeMode) => {
    setTheme((t) => ({ ...t, mode }));
  }, []);

  const toggleMode = useCallback(() => {
    setTheme((t) => ({ ...t, mode: t.mode === "light" ? "dark" : "light" }));
  }, []);

  const setScale = useCallback((scale: number) => {
    setTheme((t) => ({ ...t, scale }));
  }, []);

  const setViewMode = useCallback((viewMode: ViewMode) => {
    setTheme((t) => ({ ...t, viewMode }));
  }, []);

  return (
    <ThemeContext.Provider
      value={{ ...theme, setAccent, setMode, toggleMode, setScale, setViewMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

// 화면 배율(80~130%)은 document.body.style.zoom으로 적용되는데, 이는
// window.innerHeight를 바꾸지 않고 렌더링 크기만 키우거나 줄인다. 그래서
// 레이아웃을 "뷰포트에 꽉 채우고 그 안에서만 스크롤"시키려는 화면(h-screen +
// overflow-hidden 조합)은 배율이 100%가 아니면 실제 화면보다 크게 렌더링돼
// 하단 내용이 잘린다. 실제 뷰포트 높이를 배율만큼 보정한 CSS px 값을 돌려줘,
// 그 값을 style={{ height }}로 직접 지정하면 배율과 무관하게 항상 화면에
// 정확히 맞는다.
export function useZoomCorrectedViewportHeight(): number {
  const { scale } = useTheme();
  const [innerHeight, setInnerHeight] = useState(0);

  useEffect(() => {
    function update() {
      setInnerHeight(window.innerHeight);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (innerHeight === 0) return 0;
  return innerHeight / ((scale || 100) / 100);
}
