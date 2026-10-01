"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorageState } from "../../lib/hooks/useLocalStorageState";
import {
  EMPTY_OPERATOR_PROFILE,
  OPERATOR_PROFILE_STORAGE_KEY,
  parseOperatorProfile,
  resolveProfileRunwayMonths,
  setOperatorProfileField,
  type OperatorProfile,
} from "../../lib/operatorProfile";
import { syncRunwayBandToMonths } from "./useOperatorRunway";

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
      const runway: { before?: number; after?: number } = {};
      setStored((previous) => {
        const next = setOperatorProfileField(previous, key, value);
        runway.before = resolveProfileRunwayMonths(parseOperatorProfile(previous));
        runway.after = resolveProfileRunwayMonths(next);
        return next;
      });
      // One runway setting: an exact figure moves the band with it, and so does
      // one worked out from cash, which a change to spend or revenue moves too.
      if (runway.after !== runway.before) syncRunwayBandToMonths(runway.after);
    },
    [setStored],
  );

  return { profile, setProfileField };
};
