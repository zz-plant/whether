"use client";

import { useEffect, useState } from "react";
import { useHapticFeedback } from "./useHapticFeedback";

const STORAGE_KEY = "whether-display-mode";

const getAutoDatasetMode = () => {
  const coarse = window.matchMedia("(min-width: 1280px) and (pointer: coarse)").matches;
  const wide = window.matchMedia("(min-width: 1920px)").matches;
  return coarse || wide ? "tv" : "auto";
};

const getInitialToggleMode = (): "auto" | "tv" => {
  const urlMode = new URLSearchParams(window.location.search).get("display");
  if (urlMode === "tv" || urlMode === "auto") {
    return urlMode;
  }

  const persisted = window.localStorage.getItem(STORAGE_KEY);
  if (persisted === "tv" || persisted === "auto") {
    return persisted;
  }

  return "auto";
};

export const DisplayModeToggle = () => {
  const [mode, setMode] = useState<"auto" | "tv">("auto");
  const triggerHaptic = useHapticFeedback();

  useEffect(() => {
    const syncFromLocation = () => {
      setMode(getInitialToggleMode());
    };

    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    window.addEventListener("storage", syncFromLocation);

    return () => {
      window.removeEventListener("popstate", syncFromLocation);
      window.removeEventListener("storage", syncFromLocation);
    };
  }, []);

  const updateMode = (nextMode: "auto" | "tv") => {
    setMode(nextMode);
    window.localStorage.setItem(STORAGE_KEY, nextMode);

    const nextUrl = new URL(window.location.href);
    if (nextMode === "tv") {
      nextUrl.searchParams.set("display", "tv");
      document.documentElement.dataset.displayMode = "tv";
    } else {
      nextUrl.searchParams.delete("display");
      document.documentElement.dataset.displayMode = getAutoDatasetMode();
    }

    window.history.replaceState({}, "", nextUrl);
    triggerHaptic("selection");
  };

  const isTv = mode === "tv";

  return (
    <button
      type="button"
      onClick={() => updateMode(isTv ? "auto" : "tv")}
      aria-pressed={isTv}
      aria-label={isTv ? "Switch to auto display mode" : "Switch to TV display mode"}
      className="weather-pill inline-flex min-h-[56px] items-center justify-center px-4 py-2 text-center text-sm font-semibold tracking-[0.12em] text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
    >
      {isTv ? "Use auto display mode" : "Force TV display mode"}
    </button>
  );
};
