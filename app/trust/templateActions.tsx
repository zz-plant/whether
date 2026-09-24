"use client";

import { useCallback } from "react";

import { ClipboardActionRow } from "../components/clipboardActionRow";
import { getClipboardUiState, useClipboardCopy } from "../components/useClipboardCopy";

/*
 * The print and copy controls for /template.
 *
 * They live here rather than in page.tsx because that page exports `metadata`
 * and so has to stay a server component — passing these handlers across that
 * boundary threw "Event handlers cannot be passed to Client Component props"
 * and took the whole route down.
 */

const TEMPLATE_MARKDOWN = [
  "# Bounded Decision Template",
  "",
  "## Decision",
  "",
  "",
  "## Action",
  "",
  "",
  "## Threshold (pause if)",
  "",
  "",
  "## Reversal (clears when)",
  "",
  "",
  "## When you will check",
  "",
  "",
  "---",
  "From whether.work/trust#template",
].join("\n");

export function TemplateActions() {
  const { status, error, activeTarget, copiedTarget, copyToClipboard } = useClipboardCopy({ commitment: null });

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleCopy = useCallback(() => {
    void copyToClipboard(TEMPLATE_MARKDOWN, "template");
  }, [copyToClipboard]);

  return (
    <div className="flex flex-wrap gap-3 print:hidden">
      <button
        type="button"
        onClick={handlePrint}
        className="weather-button-primary min-h-[44px] px-5 py-2.5 text-xs font-semibold"
      >
        Print this page
      </button>
      {/* The copy button is the one control here that can fail silently — the
          clipboard API is unavailable over plain http and in some embedded
          views — so it says which of the three things happened rather than
          nothing. */}
      <ClipboardActionRow
        label="Copy as text"
        state={getClipboardUiState("template", { status, error, activeTarget, copiedTarget })}
        onClick={handleCopy}
        buttonLabels={{ error: "Copy failed" }}
        buttonProps={{ "aria-live": "polite" }}
      />
    </div>
  );
}
