"use client";

import { useCallback } from "react";
import { type HapticSemanticEvent, resolveHapticSemantic } from "./hapticSemantics";
import { useHapticFeedback } from "./useHapticFeedback";

export const useSemanticHaptics = () => {
  const triggerHaptic = useHapticFeedback();

  return useCallback(
    (event: HapticSemanticEvent) => {
      triggerHaptic(resolveHapticSemantic(event));
    },
    [triggerHaptic]
  );
};

