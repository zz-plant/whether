"use client";

import { useEffect } from "react";
import { SHARE_REFERRAL_PARAM, SHARE_REFERRAL_VALUE } from "../../lib/report/briefArtifact";
import {
  activationLastWeekStorageKey,
  classifyArrival,
  resolveReturnVisit,
  trackActivationEvent,
} from "../../lib/activationFunnel";

/* Anything a reader presses, opens or follows. A click on plain text or the
   page background is not a deliberate act; Enter or Space on a button, link or
   summary fires a click, so keyboard use counts the same. */
const DELIBERATE_TARGETS = [
  "a[href]",
  "button",
  "summary",
  "label",
  "input",
  "select",
  "textarea",
  '[role="button"]',
  '[role="tab"]',
  '[role="radio"]',
  '[role="option"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="combobox"]',
].join(", ");

/**
 * Emits `visited`, `returned` when this browser last saw a brief in an
 * earlier ISO week, and `oriented` on the first deliberate act of the visit.
 *
 * `oriented` used to come only from the first-visit picker and the explainer's
 * Dismiss, and both are hidden from a browser that has seen the brief before.
 * On 2026-09-30 that was 81 of the 85 visits with an arrival tag, so a returning
 * reader who opened a section or followed the brief to `/signals` counted as
 * leaving without doing anything. One listener for the whole page, and at most
 * one `oriented` per `visited`, so the visits that touched nothing are
 * `visited` minus `oriented`.
 *
 * Runs in an effect rather than during render: it reads `localStorage` and the
 * clock, both of which differ between server and client and would otherwise
 * mismatch on hydration.
 */
export function ActivationTracker({ path }: { path: string }) {
  useEffect(() => {
    // Capture phase, so a control that stops propagation still counts.
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(DELIBERATE_TARGETS)) return;
      document.removeEventListener("click", onClick, true);
      trackActivationEvent({ step: "oriented", path });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [path]);

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
