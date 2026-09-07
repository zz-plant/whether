"use client";

import { useCallback } from "react";

import { useClipboardCopy } from "../components/useClipboardCopy";

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
  "## Review cadence",
  "",
  "",
  "---",
  "From whether.work/template",
].join("\n");

export function TemplateActions() {
  const { status, copyToClipboard } = useClipboardCopy();

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleCopy = useCallback(() => {
    void copyToClipboard(TEMPLATE_MARKDOWN, "template");
  }, [copyToClipboard]);

  // The copy button is the one control here that can fail silently — the
  // clipboard API is unavailable over plain http and in some embedded views —
  // so it says which of the three things happened rather than nothing.
  const copyLabel =
    status === "copied" ? "Copied" : status === "error" ? "Copy failed" : "Copy as text";

  return (
    <div className="flex flex-wrap gap-3 print:hidden">
      <button
        type="button"
        onClick={handlePrint}
        className="weather-button-primary min-h-[44px] px-5 py-2.5 text-xs font-semibold"
      >
        Print this page
      </button>
      <button
        type="button"
        onClick={handleCopy}
        aria-live="polite"
        className="weather-button min-h-[44px] px-5 py-2.5 text-xs font-semibold"
      >
        {copyLabel}
      </button>
    </div>
  );
}
