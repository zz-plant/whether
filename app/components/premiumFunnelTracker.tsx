"use client";

import { useEffect } from "react";
import {
  isPremiumIntentSource,
  PREMIUM_EVENT_ENDPOINT,
  type PremiumFunnelEvent,
  type PremiumFunnelEventType,
} from "../../lib/premiumFunnel";

const PREMIUM_DATA_ATTRIBUTE = "data-premium-intent";
const PREMIUM_CTA_ATTRIBUTE = "data-premium-cta";
const PREMIUM_EVENT_TYPE_ATTRIBUTE = "data-premium-event-type";
const PREMIUM_DETAIL_ATTRIBUTE = "data-premium-detail";

const buildPayload = (
  element: HTMLElement,
  eventType: PremiumFunnelEventType,
): PremiumFunnelEvent | null => {
  const sourceValue = element.getAttribute(PREMIUM_DATA_ATTRIBUTE);
  if (!sourceValue || !isPremiumIntentSource(sourceValue)) {
    return null;
  }

  return {
    type: eventType,
    source: sourceValue,
    path: window.location.pathname,
    ctaId: element.getAttribute(PREMIUM_CTA_ATTRIBUTE) ?? undefined,
    detail: element.getAttribute(PREMIUM_DETAIL_ATTRIBUTE) ?? undefined,
    occurredAt: new Date().toISOString(),
  };
};

const sendEvent = (payload: PremiumFunnelEvent) => {
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const beaconBody = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(PREMIUM_EVENT_ENDPOINT, beaconBody);
    return;
  }

  void fetch(PREMIUM_EVENT_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
    priority: "low",
  }).catch(() => {
    // Ignore telemetry network failures to keep the client console clean.
  });
};

export function PremiumFunnelTracker() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const trackedElement = target.closest<HTMLElement>(`[${PREMIUM_DATA_ATTRIBUTE}]`);
      if (!trackedElement) {
        return;
      }

      const eventTypeValue = trackedElement.getAttribute(PREMIUM_EVENT_TYPE_ATTRIBUTE);
      const eventType: PremiumFunnelEventType =
        eventTypeValue === "premium_gate_view" ||
          eventTypeValue === "premium_checkout_start" ||
          eventTypeValue === "premium_checkout_complete"
        ? eventTypeValue
        : "premium_intent";
      const payload = buildPayload(trackedElement, eventType);
      if (!payload) {
        return;
      }

      sendEvent(payload);
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, []);

  return null;
}
