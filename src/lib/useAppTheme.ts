"use client";

import { useCallback, useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "qr-menu-theme";

export type ThemeMode = "system" | "light" | "dark";

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    /* ignore */
  }
  return "system";
}

function resolveMode(mode: ThemeMode): boolean {
  if (typeof window === "undefined") return true;
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return mode === "dark";
}

/**
 * system — telefon/tizim (prefers-color-scheme).
 * light / dark — foydalanuvchi tanlovi (localStorage).
 */
export function useAppTheme() {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setMode(readStoredMode());
  }, []);

  useEffect(() => {
    const apply = () => setIsDark(resolveMode(mode));

    apply();

    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (mode === "system") apply();
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const setThemeMode = useCallback((next: ThemeMode) => {
    setMode(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  /** Tizim → yorug' → qorong'u → tizim */
  const cycleTheme = useCallback(() => {
    const order: ThemeMode[] = ["system", "light", "dark"];
    const i = order.indexOf(mode);
    const next = order[(i + 1) % order.length];
    setThemeMode(next);
  }, [mode, setThemeMode]);

  return { mode, isDark, setThemeMode, cycleTheme };
}
