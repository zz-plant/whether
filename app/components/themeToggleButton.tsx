"use client";

import { useEffect, useState } from "react";
import { useHapticFeedback } from "./useHapticFeedback";

export function ThemeToggleButton() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const triggerHaptic = useHapticFeedback();

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("whether-theme");
    const nextTheme = savedTheme === "light" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("whether-theme", nextTheme);
    triggerHaptic("selection");
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="weather-button inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
      aria-label="Toggle light mode"
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
