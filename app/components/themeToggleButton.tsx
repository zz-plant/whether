"use client";

import { type ComponentProps } from "react";
import { MoonIcon, SunIcon } from "./uiIcons";
import { useLocalStorageState } from "../../lib/hooks/useLocalStorageState";
import { STORAGE_KEYS } from "../../lib/storage/keys";

type ThemeMode = "dark" | "light";

type ThemeToggleButtonProps = Omit<ComponentProps<"button">, "children" | "onClick" | "type"> & {
  showLabel?: boolean;
};

/**
 * The paint is the caller's: the toggle sits among buttons of another shape, the
 * header's cells and the phone sheet's bordered rows, and takes their class. It
 * was a `.weather-pill`, whose fill and border come from unlayered CSS and beat
 * every utility a caller passed, so in the header it drew as a raised, lit key
 * beside a flat share cell and read as switched on (2026-11-06).
 */
export function ThemeToggleButton({ className = "", showLabel = false, ...props }: ThemeToggleButtonProps) {
  const [theme, setTheme] = useLocalStorageState<ThemeMode>(STORAGE_KEYS.theme, "dark");
  const isDark = theme === "dark";

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
  };

  return (
    <button
      {...props}
      type="button"
      onClick={toggleTheme}
      className={className}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={!isDark}
      suppressHydrationWarning
    >
      {isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
      {showLabel ? <span>{isDark ? "Light" : "Dark"}</span> : null}
    </button>
  );
}
