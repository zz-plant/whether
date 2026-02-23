"use client";

import { useEffect } from "react";

const TARGET_IDS = new Set(["current-scores", "thresholds", "ops-workstreams"]);

const flashTarget = (hash: string) => {
  const id = hash.replace(/^#/, "");
  if (!TARGET_IDS.has(id)) return;
  const target = document.getElementById(id);
  if (!target) return;
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
