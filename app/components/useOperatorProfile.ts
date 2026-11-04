"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorageState } from "../../lib/hooks/useLocalStorageState";
import {
  applyCompanyFiling,
  EMPTY_OPERATOR_PROFILE,
  OPERATOR_PROFILE_STORAGE_KEY,
  parseOperatorProfile,
  resolveProfileRunway,
  setOperatorProfileField,
  type OperatorProfile,
} from "../../lib/operatorProfile";
import { runwayBandForProfileEdit, runwayBandForProfileRunway, type RunwayBand } from "../../lib/report/operatorRunway";
import { syncRunwayBandToFigures } from "./useOperatorRunway";

/**
 * The operator's own figures, shared by every surface that needs one. Backed by
 * localStorage through the same hook the theme and ritual check use, so a
 * change in one panel reaches the others on the page without a reload.
 *
 * The stored value is re-parsed on every read: a hand-edited or stale entry
 * loses the bad field, not the whole profile.
 */
export const useOperatorProfile = () => {
  const [stored, setStored] = useLocalStorageState<OperatorProfile>(
    OPERATOR_PROFILE_STORAGE_KEY,
    EMPTY_OPERATOR_PROFILE,
  );
  const profile = useMemo(() => parseOperatorProfile(stored), [stored]);

  const setProfileField = useCallback(
    <K extends keyof OperatorProfile>(key: K, value: OperatorProfile[K] | undefined) => {
      // The setter runs the updater synchronously, so the runway on either side
      // of this edit is known here without reading storage again.
      const sync: { band: RunwayBand | null; ages: boolean } = { band: null, ages: true };
      setStored((previous) => {
        const next = setOperatorProfileField(previous, key, value);
        const after = resolveProfileRunway(next);
        sync.band = runwayBandForProfileEdit(resolveProfileRunway(parseOperatorProfile(previous)), after);
        sync.ages = after?.basis !== "cash-flow-positive";
        return next;
      });
      // One runway setting: an exact figure moves the band with it, and so does
      // one worked out from cash, which a change to spend or revenue moves too —
      // including revenue that comes to cover spending.
      syncRunwayBandToFigures(sync.band, { ages: sync.ages });
    },
    [setStored],
  );

  /** Every filed figure at once: set one at a time, the band would pass through each half-filled state. */
  const setProfileFromFiling = useCallback(
    (filing: Parameters<typeof applyCompanyFiling>[1]) => {
      const sync: { band: RunwayBand | null; ages: boolean } = { band: null, ages: true };
      setStored((previous) => {
        const next = applyCompanyFiling(previous, filing);
        const runway = resolveProfileRunway(next);
        sync.band = runwayBandForProfileRunway(runway);
        sync.ages = runway?.basis !== "cash-flow-positive";
        return next;
      });
      syncRunwayBandToFigures(sync.band, { ages: sync.ages });
    },
    [setStored],
  );

  return { profile, setProfileField, setProfileFromFiling };
};
