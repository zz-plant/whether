"use client";

import { useEffect } from "react";

/** Targets that get the highlight pulse on arrival, on top of the landing every hash gets. */
const FLASH_IDS = new Set([
  "current-scores",
  "thresholds",
  "ops-workstreams",
  "ops-playbook",
  "sensor-array",
  "advanced-controls",
  "onboarding-checklist",
  "ops-strategy-brief",
  "ops-monthly-action-summary",
]);

/** How long after a hash arrives the target may still gain layout and be landed on. */
const LANDING_WINDOW_MS = 4_000;
const LANDING_POLL_MS = 60;
/** Gestures that mean the reader has taken over the scroll position. */
const READER_INTENT_EVENTS = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

/**
 * A collapsed panel cannot receive an anchor. Sections that are disclosures
 * still get linked with a plain hash, so a link into one has to open it before
 * the browser scrolls. Runs for the target itself and for any <details>
 * containing it.
 */
const revealTarget = (target: HTMLElement) => {
  // Both directions. An anchor can sit on a disclosure, inside one, or — as on
  // /trust, where the id is on the <section> and the panel is within it — above
  // the one that has to open.
  if (target instanceof HTMLDetailsElement) target.open = true;
  let ancestor: HTMLElement | null = target.parentElement;
  while (ancestor) {
    if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
    ancestor = ancestor.parentElement;
  }
  for (const nested of target.querySelectorAll("details")) nested.open = true;
};

const flashTarget = (target: HTMLElement) => {
  target.classList.remove("anchor-feedback-active");
  window.requestAnimationFrame(() => target.classList.add("anchor-feedback-active"));
  window.setTimeout(() => target.classList.remove("anchor-feedback-active"), 900);
};

/**
 * Puts the hash target at the top of the viewport once it has a box to scroll to.
 *
 * The browser scrolls to a fragment at load, but this app streams and hydrates: on
 * 2026-09-15 `/trust#confidence-limits` at desktop width had its target in the DOM with
 * no layout at 250ms and a 5,500px box by 600ms, and the page sat at the top for good.
 * Opening a disclosure has the same effect after the fact — the document grows under a
 * scroll position that was computed before it did. So the landing is retried on a short
 * timer until the target has height, and stops the moment the reader scrolls, so it
 * never fights a hand that has already taken over. `scrollIntoView` honours the html
 * `scroll-padding-top`, which is the one place the sticky stack is described.
 */
const landOnTarget = (id: string) => {
  let settled = false;
  const stop = () => {
    settled = true;
    for (const type of READER_INTENT_EVENTS) window.removeEventListener(type, stop);
  };
  for (const type of READER_INTENT_EVENTS) window.addEventListener(type, stop, { passive: true });

  const deadline = Date.now() + LANDING_WINDOW_MS;
  const attempt = () => {
    if (settled) return;
    const target = document.getElementById(id);
    if (target && target.getBoundingClientRect().height > 0) {
      revealTarget(target);
      target.scrollIntoView({ block: "start" });
      if (FLASH_IDS.has(id)) flashTarget(target);
      stop();
      return;
    }
    if (Date.now() < deadline) {
      window.setTimeout(attempt, LANDING_POLL_MS);
    } else {
      stop();
    }
  };
  attempt();
};

const readHashId = (hash: string): string | null => {
  const raw = hash.replace(/^#/, "");
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

export const AnchorFeedback = () => {
  useEffect(() => {
    const onHash = () => {
      const id = readHashId(window.location.hash);
      if (id) landOnTarget(id);
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return null;
};
