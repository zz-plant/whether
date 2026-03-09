export type HapticMode = "system" | "on" | "off";

export const HAPTIC_MODE_STORAGE_KEY = "whether-haptics";

const validHapticModes: HapticMode[] = ["system", "on", "off"];

export const parseHapticMode = (value: string | null): HapticMode => {
  if (value && validHapticModes.includes(value as HapticMode)) {
    return value as HapticMode;
  }

  return "system";
};

export const readHapticMode = (): HapticMode => {
  if (typeof window === "undefined") {
    return "system";
  }

  return parseHapticMode(window.localStorage.getItem(HAPTIC_MODE_STORAGE_KEY));
};

export const writeHapticMode = (mode: HapticMode) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(HAPTIC_MODE_STORAGE_KEY, mode);
};

export const shouldEnableHaptics = ({
  mode,
  prefersReducedMotion,
}: {
  mode: HapticMode;
  prefersReducedMotion: boolean;
}) => {
  if (mode === "off") {
    return false;
  }

  if (mode === "on") {
    return true;
  }

  return !prefersReducedMotion;
};

