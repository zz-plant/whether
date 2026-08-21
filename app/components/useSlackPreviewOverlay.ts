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

/** Narrows an untrusted event payload rather than asserting its shape. */
function readActiveFlag(detail: unknown): boolean | null {
  if (typeof detail !== "object" || detail === null) return null;
  if (!("active" in detail)) return null;
  const { active } = detail;
  return typeof active === "boolean" ? active : null;
}

export function useSlackPreviewOverlay() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const handleExternalChange = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const next = readActiveFlag(event.detail);
      if (next === null) return;
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
    setActive(next);
    window.dispatchEvent(
      new CustomEvent(SLACK_PREVIEW_CHANGED_EVENT, { detail: { active: next } })
    );
  }, [active]);

  return { active, toggle };
}
