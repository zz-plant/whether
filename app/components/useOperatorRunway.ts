"use client";

import {
  buildOperatorRunwayCookie,
  readOperatorRunwayCookie,
  runwayBandForMonths,
  runwayMonthsForBandPick,
  type RunwayBand,
} from "../../lib/report/operatorRunway";
import {
  OPERATOR_PROFILE_STORAGE_KEY,
  parseOperatorProfile,
  setOperatorProfileField,
} from "../../lib/operatorProfile";
import { createBrowserSource, useBrowserSource, useHydrated } from "./browserSource";

export const RUNWAY_CHANGED_EVENT = "whether-operator-runway-changed";

/**
 * Carried by the change event: whether the band the server reads moved, and
 * whether a band was picked or implied by a figure being typed. Only a pick
 * re-renders the page straight away: a refresh remounts the page's client
 * components, which closes whatever the reader has open and would eat a
 * half-typed figure.
 */
export type RunwayChangedDetail = { bandChanged: boolean; source: "pick" | "figure" };

const readInitialRunwayBand = (): RunwayBand | null => {
  const fromCookie = readOperatorRunwayCookie(document.cookie);
  if (fromCookie) return fromCookie;

  try {
    const rawProfile = window.localStorage.getItem(OPERATOR_PROFILE_STORAGE_KEY);
    if (rawProfile) {
      const profile = parseOperatorProfile(JSON.parse(rawProfile));
      return runwayBandForMonths(profile.runwayMonths);
    }
  } catch {
    /* non-fatal */
  }
  return null;
};

const runwaySource = createBrowserSource<RunwayBand | null>({
  read: () => readInitialRunwayBand(),
  serverValue: null,
  watch: (onChange) => {
    window.addEventListener(RUNWAY_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(RUNWAY_CHANGED_EVENT, onChange);
  },
  refreshOnSubscribe: true,
});

export const useOperatorRunway = () => {
  const runwayBand = useBrowserSource(runwaySource);
  const hydrated = useHydrated();

  return {
    runwayBand,
    setRunwayBand: persistOperatorRunway,
    hydrated,
  };
};

/**
 * The one write path for the operator's runway.
 *
 * Runway is stored twice, for two readers: the exact figure in the browser
 * profile (the notes, the runway test, `/operate`) and its band in a cookie
 * (the server, which scales the rules it renders). They used to be written by
 * different controls: the band selectors wrote both, while the notes' own
 * picker and every exact-figure field wrote only the profile — so a reader who
 * typed 5 months kept rules scaled for whatever band the cookie last held.
 * Every runway write goes through here now, and the band is always derived from
 * the figure, so the two cannot disagree.
 */
export const writeOperatorRunwayMonths = (months: number | undefined, source: RunwayChangedDetail["source"] = "figure") => {
  const previousBand = readOperatorRunwayCookie(document.cookie);
  const nextBand = runwayBandForMonths(months);
  document.cookie = buildOperatorRunwayCookie(nextBand);

  try {
    const raw = window.localStorage.getItem(OPERATOR_PROFILE_STORAGE_KEY);
    const current: unknown = raw ? JSON.parse(raw) : undefined;
    const updated = setOperatorProfileField(current, "runwayMonths", months);
    window.localStorage.setItem(OPERATOR_PROFILE_STORAGE_KEY, JSON.stringify(updated));
    // The profile hook listens for this, so every panel holding the figure
    // re-reads it now rather than on its next unrelated render.
    window.dispatchEvent(new StorageEvent("storage", { key: OPERATOR_PROFILE_STORAGE_KEY }));
  } catch {
    /* non-fatal */
  }

  const detail: RunwayChangedDetail = { bandChanged: previousBand !== nextBand, source };
  window.dispatchEvent(new CustomEvent(RUNWAY_CHANGED_EVENT, { detail }));
};

/** Picking a band: keeps an entered figure that is already inside it. */
export const persistOperatorRunway = (band: RunwayBand | null) => {
  let currentMonths: number | undefined;
  try {
    const raw = window.localStorage.getItem(OPERATOR_PROFILE_STORAGE_KEY);
    currentMonths = raw ? parseOperatorProfile(JSON.parse(raw)).runwayMonths : undefined;
  } catch {
    currentMonths = undefined;
  }
  writeOperatorRunwayMonths(runwayMonthsForBandPick(currentMonths, band), "pick");
};
