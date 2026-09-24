"use client";

import { useEffect } from "react";
import { SHARE_REFERRAL_PARAM, SHARE_REFERRAL_VALUE } from "../../lib/report/briefArtifact";
import {
  activationLastWeekStorageKey,
  classifyArrival,
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

    // The bucket, not the URL: `classifyArrival` reads the referrer's hostname
    // and keeps one word. `firstVisit` is what lets the funnel be read for the
    // first-visit front door on its own.
    const arrival = classifyArrival({
      referrer: document.referrer,
      siteHost: window.location.hostname,
      sharedLink: new URLSearchParams(window.location.search).get(SHARE_REFERRAL_PARAM) === SHARE_REFERRAL_VALUE,
    });
    trackActivationEvent({ step: "visited", path, arrival, firstVisit: storedSlug === null });

    if (gap) {
      trackActivationEvent({ step: "returned", path, gap });
    }
  }, [path]);

  return null;
}
