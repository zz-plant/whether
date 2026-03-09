"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes } from "react";
import { useHapticFeedback } from "./useHapticFeedback";

type HapticAnchorTone = "navigation" | "confirm";

type HapticAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  tone?: HapticAnchorTone;
};

function isInternalRouteHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

export function HapticAnchor({ tone = "navigation", onClick, href, ...props }: HapticAnchorProps) {
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

  if (typeof href === "string" && isInternalRouteHref(href)) {
    return <Link {...props} href={href} onClick={handleClick} />;
  }

  return <a {...props} href={href} onClick={handleClick} />;
}
