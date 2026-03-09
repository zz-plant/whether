"use client";

import { useCallback } from "react";
import { type HapticInput } from "web-haptics";
import { useWebHaptics } from "web-haptics/react";
import { readHapticMode, shouldEnableHaptics } from "./hapticPreferences";

export const useHapticFeedback = () => {
  const { trigger, isSupported } = useWebHaptics({ showSwitch: false });

  return useCallback(
    (preset: HapticInput) => {
      if (!isSupported) {
        return;
      }

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const hapticMode = readHapticMode();

      if (!shouldEnableHaptics({ mode: hapticMode, prefersReducedMotion })) {
        return;
      }

      void trigger?.(preset);
    },
    [isSupported, trigger]
  );
};
