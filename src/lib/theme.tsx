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
