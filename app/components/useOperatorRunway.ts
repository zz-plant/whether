"use client";

import {
  buildOperatorRunwayCookie,
  readOperatorRunwayCookie,
  runwayBandForMonths,
  monthsForRunwayBand,
  type RunwayBand,
} from "../../lib/report/operatorRunway";
import {
  OPERATOR_PROFILE_STORAGE_KEY,
  parseOperatorProfile,
  setOperatorProfileField,
} from "../../lib/operatorProfile";
import { createBrowserSource, useBrowserSource, useHydrated } from "./browserSource";

const RUNWAY_CHANGED_EVENT = "whether-operator-runway-changed";

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

export const persistOperatorRunway = (band: RunwayBand | null) => {
  document.cookie = buildOperatorRunwayCookie(band);

  try {
    const raw = window.localStorage.getItem(OPERATOR_PROFILE_STORAGE_KEY);
    const current = raw ? JSON.parse(raw) : undefined;
    const months = band ? monthsForRunwayBand(band) : undefined;
    const updated = setOperatorProfileField(current, "runwayMonths", months);
    window.localStorage.setItem(OPERATOR_PROFILE_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    /* non-fatal */
  }

  window.dispatchEvent(new CustomEvent(RUNWAY_CHANGED_EVENT));
};
