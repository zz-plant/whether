"use client";

import { useCallback } from "react";
import { type HapticInput } from "web-haptics";
import { useWebHaptics } from "web-haptics/react";

export const useHapticFeedback = () => {
  const { trigger, isSupported } = useWebHaptics({ showSwitch: false });

  return useCallback(
    (preset: HapticInput) => {
      if (!isSupported) {
        return;
      }

      void trigger?.(preset);
    },
    [isSupported, trigger]
  );
};
