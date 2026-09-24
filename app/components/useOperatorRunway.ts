"use client";

import {
  buildOperatorRunwayCookie,
  readOperatorRunwayCookie,
  runwayBandForMonths,
  runwayMonthsFitBand,
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
 * whether it was picked or implied by a figure being typed. Only a pick
 * re-renders the page straight away (`RunwayServerSync`): a refresh remounts
 * the page's client components, which closes whatever the reader has open and
 * would eat a half-typed figure.
 */
export type RunwayChangedDetail = { bandChanged: boolean; source: "pick" | "figure" };

const announceRunwayChange = (previousBand: RunwayBand | null, nextBand: RunwayBand | null, source: RunwayChangedDetail["source"]) => {
  const detail: RunwayChangedDetail = { bandChanged: previousBand !== nextBand, source };
  window.dispatchEvent(new CustomEvent(RUNWAY_CHANGED_EVENT, { detail }));
};

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
 * Choose a band. The band is the setting; it writes no figure.
 *
 * It used to write the band's representative month count into the profile as
 * if the reader had typed it, so "12–24 mo" became "18 months" in the runway
 * planner, the stress test and the homepage notes. Now a figure the reader
 * entered stays unless the new band excludes it — then it goes, because the two
 * would disagree about the same company and the band is the newer answer.
 */
export const persistOperatorRunway = (band: RunwayBand | null) => {
  const previousBand = readOperatorRunwayCookie(document.cookie);
  document.cookie = buildOperatorRunwayCookie(band);

  try {
    const raw = window.localStorage.getItem(OPERATOR_PROFILE_STORAGE_KEY);
    const current = raw ? parseOperatorProfile(JSON.parse(raw)) : undefined;
    const exact = current?.runwayMonths;
    if (current && typeof exact === "number" && (!band || !runwayMonthsFitBand(exact, band))) {
      const updated = setOperatorProfileField(current, "runwayMonths", undefined);
      window.localStorage.setItem(OPERATOR_PROFILE_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new StorageEvent("storage", { key: OPERATOR_PROFILE_STORAGE_KEY }));
    }
  } catch {
    /* non-fatal */
  }

  announceRunwayChange(previousBand, band, "pick");
};

/**
 * An exact figure was entered: move the band to the one it falls in, so the
 * header, the homepage selector and the server-calibrated rules agree with it.
 * A cleared figure leaves the band alone — clearing a number is not choosing a
 * runway.
 */
export const syncRunwayBandToMonths = (months: number | undefined) => {
  const band = runwayBandForMonths(months);
  if (!band) return;
  const previousBand = readOperatorRunwayCookie(document.cookie);
  document.cookie = buildOperatorRunwayCookie(band);
  announceRunwayChange(previousBand, band, "figure");
};
