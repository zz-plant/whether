import { type HapticInput } from "web-haptics";

export const hapticSemanticMap = {
  confirmAction: "success",
  copySucceeded: "success",
  copyFailed: "error",
  copyUnavailable: "warning",
  navigationTap: "light",
  panelClosed: "selection",
  panelOpened: "light",
  selectionChanged: "selection",
  toggleChanged: "selection",
} satisfies Record<string, HapticInput>;

export type HapticSemanticEvent = keyof typeof hapticSemanticMap;

export const resolveHapticSemantic = (event: HapticSemanticEvent): HapticInput =>
  hapticSemanticMap[event];

