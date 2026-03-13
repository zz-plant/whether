"use client";

import { useEffect, useState } from "react";

export type DisplayMode = "auto" | "tv";

const STORAGE_KEY = "whether-display-mode";

const hasCoarsePointer = () => {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }

  return (
    window.matchMedia("(min-width: 1280px) and (pointer: coarse)").matches ||
    window.matchMedia("(min-width: 1920px)").matches
  );
};

const getUrlMode = (): DisplayMode | null => {
  const searchParams = new URLSearchParams(window.location.search);
  const mode = searchParams.get("display");

  if (mode === "tv") {
    return "tv";
  }

  if (mode === "auto") {
    return "auto";
  }

  return null;
};

const getInitialMode = (): DisplayMode => {
  const urlMode = getUrlMode();
  if (urlMode) {
    return urlMode;
  }

  const persisted = window.localStorage.getItem(STORAGE_KEY);
  if (persisted === "tv" || persisted === "auto") {
    return persisted;
  }

  return "auto";
};

const getRenderedMode = (): DisplayMode | null => {
  const currentMode = document.documentElement.dataset.displayMode;
  if (currentMode === "tv" || currentMode === "auto") {
    return currentMode;
  }

  return null;
};

const applyMode = (mode: DisplayMode) => {
  const nextMode = mode === "auto" && hasCoarsePointer() ? "tv" : mode;

  if (getRenderedMode() === nextMode) {
    return;
  }

  document.documentElement.dataset.displayMode = nextMode;
};

const persistMode = (mode: DisplayMode) => {
  if (window.localStorage.getItem(STORAGE_KEY) === mode) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, mode);
};

const syncUrl = (mode: DisplayMode) => {
  const currentMode = getUrlMode();

  if (mode === "auto" && currentMode === null) {
    return;
  }

  if (currentMode === mode) {
    return;
  }

  const nextUrl = new URL(window.location.href);

  if (mode === "auto") {
    nextUrl.searchParams.delete("display");
  } else {
    nextUrl.searchParams.set("display", mode);
  }

  window.history.replaceState({}, "", nextUrl);
};

export const initializeDisplayMode = (): DisplayMode => {
  const initialMode = getInitialMode();
  applyMode(initialMode);
  persistMode(initialMode);
  syncUrl(initialMode);

  return initialMode;
};

export const useDisplayMode = () => {
  const [mode, setMode] = useState<DisplayMode>("auto");

  useEffect(() => {
    const initialMode = initializeDisplayMode();
    setMode(initialMode);

    const onMediaChange = () => {
      if (window.localStorage.getItem(STORAGE_KEY) === "auto") {
        applyMode("auto");
      }
    };

    const coarse = window.matchMedia("(min-width: 1280px) and (pointer: coarse)");
    const wide = window.matchMedia("(min-width: 1920px)");
    coarse.addEventListener("change", onMediaChange);
    wide.addEventListener("change", onMediaChange);

    return () => {
      coarse.removeEventListener("change", onMediaChange);
      wide.removeEventListener("change", onMediaChange);
    };
  }, []);

  const updateMode = (nextMode: DisplayMode) => {
    setMode(nextMode);
    applyMode(nextMode);
    persistMode(nextMode);
    syncUrl(nextMode);
  };

  return { mode, setMode: updateMode };
};

export const DisplayModeManager = () => {
  useDisplayMode();
  return null;
};
