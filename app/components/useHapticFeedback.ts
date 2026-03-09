"use client";

import { useCallback } from "react";
import { type HapticInput } from "web-haptics";
import { useWebHaptics } from "web-haptics/react";

/**
 * Semantic action → web-haptics preset mapping.
 * Keep this table as the single tactile language source for UI interactions.
 */
const HAPTIC_ACTION_PRESETS = {
  toggle: "selection",
  open: "light",
  close: "selection",
  copySuccess: "success",
  copyError: "error",
  navigate: "light",
  confirm: "success",
} as const satisfies Record<string, HapticInput>;

type HapticAction = keyof typeof HAPTIC_ACTION_PRESETS;

export const useHapticFeedback = () => {
  const { trigger, isSupported } = useWebHaptics({ showSwitch: false });

  const play = useCallback(
    (preset: HapticInput) => {
      if (!isSupported) {
        return;
      }

      void trigger?.(preset);
    },
    [isSupported, trigger]
  );

  const run = useCallback(
    (action: HapticAction) => {
      play(HAPTIC_ACTION_PRESETS[action]);
    },
    [play]
  );

  return {
    toggle: () => run("toggle"),
    open: () => run("open"),
    close: () => run("close"),
    copySuccess: () => run("copySuccess"),
    copyError: () => run("copyError"),
    navigate: () => run("navigate"),
    confirm: () => run("confirm"),
    play,
  };
};
