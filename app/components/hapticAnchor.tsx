"use client";

import type { AnchorHTMLAttributes } from "react";
import { useHapticFeedback } from "./useHapticFeedback";

type HapticAnchorTone = "navigation" | "confirm";

type HapticAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  tone?: HapticAnchorTone;
};

export function HapticAnchor({ tone = "navigation", onClick, ...props }: HapticAnchorProps) {
  const haptic = useHapticFeedback();

  const handleClick: AnchorHTMLAttributes<HTMLAnchorElement>["onClick"] = (event) => {
    // Haptics should reinforce decision delta and artifact completion, not decorative interaction.
    if (tone === "confirm") {
      haptic.confirm();
    } else {
      haptic.navigate();
    }
    onClick?.(event);
  };

  return <a {...props} onClick={handleClick} />;
}
