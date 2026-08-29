"use client";

import { useEffect } from "react";
import {
  activationLastWeekStorageKey,
  resolveReturnVisit,
  trackActivationEvent,
} from "../../lib/activationFunnel";

/**
 * Emits `visited`, and `returned` when this browser last saw a brief in an
 * earlier ISO week.
 *
 * Runs in an effect rather than during render: it reads `localStorage` and the
 * clock, both of which differ between server and client and would otherwise
 * mismatch on hydration.
 */
export function ActivationTracker({ path }: { path: string }) {
  useEffect(() => {
    let storedSlug: string | null = null;

    try {
      storedSlug = window.localStorage.getItem(activationLastWeekStorageKey);
    } catch {
      // Private mode or blocked storage: the visit still counts, the return cannot.
    }

    const { gap, nextStoredSlug } = resolveReturnVisit(storedSlug, new Date());

    try {
      window.localStorage.setItem(activationLastWeekStorageKey, nextStoredSlug);
    } catch {
      // Ignore storage failures; they cost a measurement, not a page.
    }

    trackActivationEvent({ step: "visited", path });

    if (gap) {
      trackActivationEvent({ step: "returned", path, gap });
    }
  }, [path]);

  return null;
}
