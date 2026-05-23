"use client";

import { useEffect } from "react";

type TabNotifierProps = {
  direction: "tighten" | "ease" | "hold" | "revisit";
  tightness: number;
  reliabilityScore?: number;
};

const EMOJI: Record<string, string> = {
  tighten: "🔴",
  ease: "🟢",
  hold: "🟡",
  revisit: "🟡",
};

const PREFIX: Record<string, string> = {
  tighten: "Tightening · ",
  ease: "Easing · ",
  hold: "Holding · ",
  revisit: "Revisit · ",
};

export function TabNotifier({ direction, tightness, reliabilityScore }: TabNotifierProps) {
  useEffect(() => {
    const originalTitle = document.title;
    const prefix = PREFIX[direction] ?? "";
    const suffix = reliabilityScore != null ? ` · ${reliabilityScore}% reliable` : "";
    document.title = `${EMOJI[direction] ?? ""} ${prefix}${tightness}${suffix} | Whether`;

    return () => {
      document.title = originalTitle;
    };
  }, [direction, tightness, reliabilityScore]);

  return null;
}
