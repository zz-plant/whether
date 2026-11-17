"use client";

import { useCallback } from "react";

import { ClipboardActionRow } from "../components/clipboardActionRow";
import { getClipboardUiState, useClipboardCopy } from "../components/useClipboardCopy";

/** The role page's note (`buildPlanningNote`), for a planning doc or a 1:1 agenda. */
export function CopyPlanningNote({ note }: { note: string }) {
  const { status, error, activeTarget, copiedTarget, copyToClipboard } = useClipboardCopy({ commitment: null });
  const handleCopy = useCallback(() => {
    void copyToClipboard(note, "planning-note");
  }, [copyToClipboard, note]);
  return (
    <ClipboardActionRow
      label="Copy as a planning note"
      state={getClipboardUiState("planning-note", { status, error, activeTarget, copiedTarget })}
      onClick={handleCopy}
      buttonVariant="primary"
      buttonLabels={{ error: "Copy failed" }}
      buttonProps={{ "aria-live": "polite", "data-testid": "copy-planning-note" }}
    />
  );
}
