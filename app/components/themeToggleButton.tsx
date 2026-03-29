"use client";

import { useEffect, useState } from "react";

export function ThemeToggleButton() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const isDark = theme === "dark";

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
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="weather-pill inline-flex min-h-[48px] w-full items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] sm:w-auto"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={!isDark}
    >
      {isDark ? "Light" : "Dark"}
    </button>
  );
}
