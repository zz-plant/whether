"use client";

import { type ComponentProps, useEffect, useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "./uiIcons";
import { useLocalStorageState } from "../../lib/hooks/useLocalStorageState";
import { STORAGE_KEYS } from "../../lib/storage/keys";

type ThemeMode = "dark" | "light";

type ThemeToggleButtonProps = Omit<ComponentProps<"button">, "children" | "onClick" | "type"> & {
  showLabel?: boolean;
};

const DEVICE_DARK_QUERY = "(prefers-color-scheme: dark)";

const subscribeToDevice = (onChange: () => void) => {
  const query = window.matchMedia(DEVICE_DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const readDeviceTheme = (): ThemeMode => (window.matchMedia(DEVICE_DARK_QUERY).matches ? "dark" : "light");
/* The server cannot know the device; the button's label settles on hydration. */
const serverTheme = (): ThemeMode => "light";

const isThemeMode = (value: string): value is ThemeMode => value === "dark" || value === "light";

/**
 * The paint is the caller's: the toggle sits among buttons of another shape, the
 * header's cells and the phone sheet's bordered rows, and takes their class. It
 * was a `.weather-pill`, whose fill and border come from unlayered CSS and beat
 * every utility a caller passed, so in the header it drew as a raised, lit key
 * beside a flat share cell and read as switched on (2026-11-06).
 *
 * A stored choice wins; with none, the device setting picks the theme, as the
 * bootstrap script in app/layout.tsx does before the first paint (2026-11-10).
 */
export function ThemeToggleButton({ className = "", showLabel = false, ...props }: ThemeToggleButtonProps) {
  const [stored, setStored] = useLocalStorageState<string>(STORAGE_KEYS.theme, "");
  const device = useSyncExternalStore(subscribeToDevice, readDeviceTheme, serverTheme);
  const hasChoice = isThemeMode(stored);
  const theme: ThemeMode = hasChoice ? stored : device;
  const isDark = theme === "dark";

  /* A reader with no stored choice who changes the device setting mid-visit. The store
     is read here, not from `stored`: during hydration the hook still holds its fallback,
     and acting on that repainted a reader's stored dark page in the device's light. */
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEYS.theme);
    } catch {
      return;
    }
    if (saved !== null && isThemeMode(saved)) return;
    document.documentElement.dataset.theme = device;
    document.documentElement.style.colorScheme = device;
  }, [stored, device]);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = isDark ? "light" : "dark";
    setStored(nextTheme);
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
