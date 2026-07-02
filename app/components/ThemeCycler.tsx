"use client";

import { useState, useEffect } from "react";

const THEMES = [
  { key: "", label: "Dark" },
  { key: "paper", label: "Paper" },
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
      document.documentElement.style.colorScheme = key === "paper" ? "light" : "dark";
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
      className="fixed bottom-4 left-4 z-50 inline-flex min-h-[40px] items-center justify-center rounded-full border border-slate-800 bg-slate-950/85 px-3 text-fluid-micro font-medium text-slate-400 backdrop-blur-sm transition-colors hover:text-slate-200 hover:border-slate-700 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
      title={`Theme: ${theme.label}. Click to cycle.`}
    >
      {theme.label}
    </button>
  );
}
