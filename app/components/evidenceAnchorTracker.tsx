"use client";

import { useEffect } from "react";
import { trackProductEvent } from "../../lib/analytics";

export function EvidenceAnchorTracker() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) {
        return;
      }
      const href = anchor.getAttribute("href") ?? "";
      if (!href.startsWith("#") && !href.includes("#")) {
        return;
      }
      trackProductEvent("evidence_anchor_clicked", {
        route: window.location.pathname,
        href,
        label: anchor.textContent?.trim() ?? "",
      });
    };

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
    };
  }, []);

  return null;
}
