"use client";

import { useEffect } from "react";
import {
  trackProductEvent,
  type ProductEventName,
  type ProductEventPayload,
} from "../../lib/analytics";

export function ViewEventBeacon({
  name,
  payload = {},
}: {
  name: ProductEventName;
  payload?: ProductEventPayload;
}) {
  useEffect(() => {
    trackProductEvent(name, payload);
  }, [name, payload]);

  return null;
}
