"use client";

import type { AnchorHTMLAttributes } from "react";
import { useHapticFeedback } from "./useHapticFeedback";

type HapticAnchorTone = "navigation" | "confirm";

type HapticAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  tone?: HapticAnchorTone;
};

export function HapticAnchor({ tone = "navigation", onClick, ...props }: HapticAnchorProps) {
  const triggerHaptic = useHapticFeedback();

  const handleClick: AnchorHTMLAttributes<HTMLAnchorElement>["onClick"] = (event) => {
    // Haptics should reinforce decision delta and artifact completion, not decorative interaction.
    triggerHaptic(tone === "confirm" ? "success" : "light");
    onClick?.(event);
  };

  return <a {...props} onClick={handleClick} />;
}
