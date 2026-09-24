"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorageState } from "../../lib/hooks/useLocalStorageState";
import {
  EMPTY_OPERATOR_PROFILE,
  OPERATOR_PROFILE_STORAGE_KEY,
  parseOperatorProfile,
  setOperatorProfileField,
  type OperatorProfile,
} from "../../lib/operatorProfile";
import { writeOperatorRunwayMonths } from "./useOperatorRunway";

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
      // Runway also sets the band cookie the server reads; one path for it.
      if (key === "runwayMonths") {
        writeOperatorRunwayMonths(typeof value === "number" ? value : undefined);
        return;
      }
      setStored((previous) => setOperatorProfileField(previous, key, value));
    },
    [setStored],
  );

  return { profile, setProfileField };
};
