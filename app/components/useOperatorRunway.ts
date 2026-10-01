"use client";

import {
  buildOperatorRunwayCookie,
  readOperatorRunwayCookie,
  runwayBandForProfileRunway,
  type RunwayBand,
} from "../../lib/report/operatorRunway";
import {
  OPERATOR_PROFILE_STORAGE_KEY,
  parseOperatorProfile,
  resolveProfileRunway,
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
      return runwayBandForProfileRunway(resolveProfileRunway(profile));
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
    const implied = current ? runwayBandForProfileRunway(resolveProfileRunway(current)) : null;
    if (current && implied && implied !== band) {
      // A runway worked out from cash goes the same way: the cash figure is what states it. So does
      // a cash-flow-positive one, which reads as the open-ended band.
      const updated = setOperatorProfileField(
        setOperatorProfileField(current, "runwayMonths", undefined),
        "cashUsd",
        undefined,
      );
      window.localStorage.setItem(OPERATOR_PROFILE_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new StorageEvent("storage", { key: OPERATOR_PROFILE_STORAGE_KEY }));
    }
  } catch {
    /* non-fatal */
  }

  announceRunwayChange(previousBand, band, "pick");
};

/**
 * A figure was entered: move the band to the one the figures fall in, so the
 * header, the homepage selector and the server-calibrated rules agree with
 * them (`runwayBandForProfileEdit` decides which). Revenue that covers spending
 * moves it too, to the open-ended band. A null band leaves the cookie alone —
 * clearing a number is not choosing a runway.
 */
export const syncRunwayBandToFigures = (band: RunwayBand | null) => {
  if (!band) return;
  const previousBand = readOperatorRunwayCookie(document.cookie);
  document.cookie = buildOperatorRunwayCookie(band);
  announceRunwayChange(previousBand, band, "figure");
};
