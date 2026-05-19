"use client";

import { useState, useEffect } from "react";

const THEMES = [
  { key: "", label: "OLED Dark" },
  { key: "slate", label: "Slate" },
  { key: "midnight", label: "Midnight" },
  { key: "forest", label: "Forest" },
  { key: "sepia", label: "Sepia" },
  { key: "paper", label: "Paper Light" },
  { key: "minimal", label: "Minimal Light" },
  { key: "neon", label: "Neon" },
  { key: "mono", label: "Mono" },
  { key: "warm", label: "Warm" },
] as const;

const STORAGE_KEY = "whether-theme-variant";

export function ThemeCycler() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const idx = THEMES.findIndex((t) => t.key === saved);
      if (idx >= 0) setCurrent(idx);
    } catch {}
  }, []);

  const apply = (idx: number) => {
    const theme = THEMES[idx];
    setCurrent(idx);
    const key = theme.key || "";
    if (key) {
      document.documentElement.dataset.themeVariant = key;
      document.documentElement.style.colorScheme = ["paper", "minimal"].includes(key) ? "light" : "dark";
    } else {
      delete document.documentElement.dataset.themeVariant;
      document.documentElement.style.colorScheme = "dark";
    }
    try { localStorage.setItem(STORAGE_KEY, key); } catch {}
  };

  const cycle = () => {
    const next = (current + 1) % THEMES.length;
    apply(next);
  };

  const theme = THEMES[current];

  return (
    <button
      type="button"
      onClick={cycle}
      className="text-fluid-micro text-slate-500 hover:text-sky-200 transition-colors"
      title={`Theme: ${theme.label}. Click to cycle.`}
    >
      {theme.label}
    </button>
  );
}
