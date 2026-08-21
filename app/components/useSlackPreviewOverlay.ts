"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Shared state for the Slack preview overlay toggle, which appears in more than one
 * share surface (the share rail and the report-shell share menu). Toggling it in one
 * place broadcasts to the others so every control shows the same state.
 *
 * The event is a state-change notification, not a command: `detail.active` is the new
 * value to adopt, so a listener never inverts its own state on receipt.
 */
export const SLACK_PREVIEW_CHANGED_EVENT = "whether-slack-preview-changed";

/**
 * Last broadcast value, so a surface that mounts *after* a toggle opens in the
 * current state rather than the default. The share rail mounts on demand, so
 * without this it would show "off" while the report-shell menu shows "on".
 *
 * Safe to hold at module scope: only a user interaction in the browser ever
 * writes to it, so during SSR it is always the initial `false` and cannot leak
 * between requests.
 */
let lastBroadcastActive = false;

/** Narrows an untrusted event payload rather than asserting its shape. Exported for tests. */
export function readActiveFlag(detail: unknown): boolean | null {
  if (typeof detail !== "object" || detail === null) return null;
  if (!("active" in detail)) return null;
  const { active } = detail;
  return typeof active === "boolean" ? active : null;
}

export function useSlackPreviewOverlay() {
  const [active, setActive] = useState(() => lastBroadcastActive);

  useEffect(() => {
    const handleExternalChange = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const next = readActiveFlag(event.detail);
      if (next === null) return;
      lastBroadcastActive = next;
      // The dispatcher hears its own window event; adopting the identical value is a
      // no-op React bails out of, so no echo loop forms between the share surfaces.
      setActive((current) => (current === next ? current : next));
    };

    window.addEventListener(SLACK_PREVIEW_CHANGED_EVENT, handleExternalChange);
    return () => {
      window.removeEventListener(SLACK_PREVIEW_CHANGED_EVENT, handleExternalChange);
    };
  }, []);

  // Dispatch outside the state updater: React may invoke an updater twice in
  // StrictMode, which would broadcast the change twice.
  const toggle = useCallback(() => {
    const next = !active;
    lastBroadcastActive = next;
    setActive(next);
    window.dispatchEvent(
      new CustomEvent(SLACK_PREVIEW_CHANGED_EVENT, { detail: { active: next } })
    );
  }, [active]);

  return { active, toggle };
}
