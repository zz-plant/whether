"use client";

import { useEffect } from "react";

const TARGET_IDS = new Set([
  "current-scores",
  "thresholds",
  "ops-workstreams",
  "first-time-guide",
  "beginner-glossary",
  "ops-playbook",
  "sensor-array",
  "advanced-controls",
  "onboarding-checklist",
  "ops-strategy-brief",
  "ops-monthly-action-summary",
]);

/**
 * A collapsed panel cannot receive an anchor. Sections that are disclosures now
 * — the /trust glossary is 26 terms and was rendering all of them — still get
 * linked with a plain hash from six places, so a link into one has to open it
 * before the browser scrolls. Runs for the target itself and for any <details>
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

const flashTarget = (hash: string) => {
  const id = hash.replace(/^#/, "");
  if (!TARGET_IDS.has(id)) return;
  const target = document.getElementById(id);
  if (!target) return;
  revealTarget(target);
  // Opening the panel changes the document height, so the browser's own scroll
  // to the fragment has already landed short. Put it back on the target.
  window.requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
  target.classList.remove("anchor-feedback-active");
  window.requestAnimationFrame(() => target.classList.add("anchor-feedback-active"));
  window.setTimeout(() => target.classList.remove("anchor-feedback-active"), 900);
};

export const AnchorFeedback = () => {
  useEffect(() => {
    flashTarget(window.location.hash);
    const onHashChange = () => flashTarget(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return null;
};
