"use client";

import { type ComponentProps } from "react";
import { MoonIcon, SunIcon } from "./uiIcons";
import { useLocalStorageState } from "../../lib/hooks/useLocalStorageState";
import { STORAGE_KEYS } from "../../lib/storage/keys";

type ThemeMode = "dark" | "light";

type ThemeToggleButtonProps = Omit<ComponentProps<"button">, "children" | "onClick" | "type"> & {
  showLabel?: boolean;
};

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
      className={`weather-pill inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-semibold tracking-[0.08em] ${className}`.trim()}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={!isDark}
      suppressHydrationWarning
    >
      {isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
      {showLabel ? <span>{isDark ? "Light" : "Dark"}</span> : null}
    </button>
  );
}
