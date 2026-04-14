"use client";

import { type ComponentProps } from "react";
import { useState } from "react";

type ThemeMode = "dark" | "light";
const STORAGE_KEY = "whether-theme";

const getBootstrappedThemeMode = (): ThemeMode => {
  if (typeof document !== "undefined") {
    const bootstrappedTheme = document.documentElement.dataset.theme;
    if (bootstrappedTheme === "dark" || bootstrappedTheme === "light") {
      return bootstrappedTheme;
    }
  }

  if (typeof window === "undefined") {
    return "dark";
  }

  try {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }
  } catch {
    // Ignore storage errors.
  }

  return "dark";
};

type ThemeToggleButtonProps = Omit<ComponentProps<"button">, "children" | "onClick" | "type">;

export function ThemeToggleButton({ className = "", ...props }: ThemeToggleButtonProps) {
  const [theme, setTheme] = useState<ThemeMode>(getBootstrappedThemeMode);
  const isDark = theme === "dark";

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;

    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // Ignore storage errors.
    }
  };

  return (
    <button
      {...props}
      type="button"
      onClick={toggleTheme}
      className={`weather-pill inline-flex min-h-[48px] w-full items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] sm:w-auto ${className}`.trim()}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={!isDark}
      suppressHydrationWarning
    >
      {isDark ? "Light" : "Dark"}
    </button>
  );
}
