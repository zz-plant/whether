"use client";

import { useEffect, useState } from "react";
import { type HapticMode, readHapticMode, writeHapticMode } from "./hapticPreferences";
import { useSemanticHaptics } from "./useSemanticHaptics";

const modeOrder: HapticMode[] = ["system", "on", "off"];

const nextMode = (mode: HapticMode): HapticMode => modeOrder[(modeOrder.indexOf(mode) + 1) % modeOrder.length];

const labelByMode: Record<HapticMode, string> = {
  system: "Haptics: System",
  on: "Haptics: On",
  off: "Haptics: Off",
};

export function HapticsToggleButton() {
  const [mode, setMode] = useState<HapticMode>("system");
  const triggerHaptic = useSemanticHaptics();

  useEffect(() => {
    setMode(readHapticMode());
  }, []);

  const toggleMode = () => {
    const updated = nextMode(mode);
    setMode(updated);
    writeHapticMode(updated);
    triggerHaptic("toggleChanged");
  };

  return (
    <button
      type="button"
      onClick={toggleMode}
      className="weather-button inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
      aria-label={`Cycle haptic feedback mode. Current mode: ${mode}.`}
    >
      {labelByMode[mode]}
    </button>
  );
}
