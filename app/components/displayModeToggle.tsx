"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "whether-display-mode";

const getAutoDatasetMode = () => {
  const coarse = window.matchMedia("(min-width: 1280px) and (pointer: coarse)").matches;
  const wide = window.matchMedia("(min-width: 1920px)").matches;
  return coarse || wide ? "tv" : "auto";
};

const getBootstrappedToggleMode = (): "auto" | "tv" | null => {
  if (typeof document !== "undefined") {
    const bootstrappedMode = document.documentElement.dataset.displayPreference;
    if (bootstrappedMode === "tv" || bootstrappedMode === "auto") {
      return bootstrappedMode;
    }
  }

  return null;
};

const getResolvedToggleMode = (): "auto" | "tv" | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const urlMode = new URLSearchParams(window.location.search).get("display");
  if (urlMode === "tv") {
    return "tv";
  }

  if (urlMode === "auto") {
    return getAutoDatasetMode();
  }

  const bootstrapped = getBootstrappedToggleMode();
  if (bootstrapped) {
    return bootstrapped;
  }

  try {
    const persisted = window.localStorage.getItem(STORAGE_KEY);
    if (persisted === "tv") {
      return "tv";
    }

    if (persisted === "auto") {
      return getAutoDatasetMode();
    }
  } catch {
    // Ignore storage errors.
  }

  return null;
};

const getInitialToggleMode = (): "auto" | "tv" => {
  return getResolvedToggleMode() ?? "auto";
};

export const DisplayModeToggle = () => {
  const [mode, setMode] = useState<"auto" | "tv">(getInitialToggleMode);

  const triggerToggleHaptic = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
  };

  useEffect(() => {
    const syncFromLocation = () => {
      setMode(getResolvedToggleMode() ?? "auto");
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
    try {
      window.localStorage.setItem(STORAGE_KEY, nextMode);
    } catch {
      // Ignore storage errors.
    }

    const nextUrl = new URL(window.location.href);
    if (nextMode === "tv") {
      nextUrl.searchParams.set("display", "tv");
      document.documentElement.dataset.displayMode = "tv";
      document.documentElement.dataset.displayPreference = "tv";
    } else {
      nextUrl.searchParams.delete("display");
      document.documentElement.dataset.displayMode = getAutoDatasetMode();
      document.documentElement.dataset.displayPreference = "auto";
    }

    window.history.replaceState({}, "", nextUrl);
    triggerToggleHaptic();
  };

  const isTv = mode === "tv";

  return (
    <button
      type="button"
      onClick={() => updateMode(isTv ? "auto" : "tv")}
      aria-pressed={isTv}
      aria-label={isTv ? "Switch to auto display mode" : "Switch to TV display mode"}
      className="weather-pill inline-flex min-h-[56px] items-center justify-center px-4 py-2 text-center text-sm font-semibold tracking-[0.12em] text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
      suppressHydrationWarning
    >
      {isTv ? "Use auto display mode" : "Force TV display mode"}
    </button>
  );
};
