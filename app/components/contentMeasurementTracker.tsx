"use client";

import { useEffect } from "react";
import {
  trackContentAssistedConversion,
  trackContentCtaConversion,
  trackContentOrganicEntrance,
  type ContentCluster,
  type ContentIntent,
} from "../../lib/contentMeasurement";

const ROOT_ATTRIBUTE = "data-content-measurement-root";
const CTA_ATTRIBUTE = "data-conversion-event";
const SESSION_KEY_PREFIX = "whether.content-measurement.entrance";

const resolveInternalDestination = (href: string): URL | null => {
  try {
    const destination = new URL(href, window.location.origin);
    if (destination.origin !== window.location.origin) {
      return null;
    }
    return destination;
  } catch {
    return null;
  }
};

export function ContentMeasurementTracker({
  pagePath,
  cluster,
  intent,
}: {
  pagePath: string;
  cluster: ContentCluster;
  intent: ContentIntent;
}) {
  useEffect(() => {
    const sessionKey = `${SESSION_KEY_PREFIX}:${pagePath}:${cluster}:${intent}`;

    try {
      if (window.sessionStorage.getItem(sessionKey) !== "1") {
        trackContentOrganicEntrance({ pagePath, cluster, intent });
        window.sessionStorage.setItem(sessionKey, "1");
      }
    } catch {
      trackContentOrganicEntrance({ pagePath, cluster, intent });
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const scopedRoot = target.closest<HTMLElement>(`[${ROOT_ATTRIBUTE}]`);
      if (!scopedRoot || scopedRoot.getAttribute(ROOT_ATTRIBUTE) !== pagePath) {
        return;
      }

      const ctaElement = target.closest<HTMLElement>(`[${CTA_ATTRIBUTE}]`);
      if (ctaElement) {
        const ctaId = ctaElement.getAttribute(CTA_ATTRIBUTE)?.trim();
        if (ctaId) {
          trackContentCtaConversion({
            pagePath,
            cluster,
            intent,
            ctaId,
          });
        }
        return;
      }

      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) {
        return;
      }

      const destination = resolveInternalDestination(anchor.href);
      if (!destination || destination.pathname === window.location.pathname) {
        return;
      }

      trackContentAssistedConversion({
        pagePath,
        cluster,
        intent,
        internalPath: `${pagePath} -> ${destination.pathname}${destination.hash}`,
      });
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, [cluster, intent, pagePath]);

  return null;
}
