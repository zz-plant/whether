"use client";

import { useCallback, useMemo, useState } from "react";
import { BriefFormatPicker } from "../components/briefFormatPicker";
import { useBriefArtifact } from "../components/useBriefArtifact";
import { useClipboardCopy } from "../components/useClipboardCopy";
import { BRIEF_FORMATS, formatBriefArtifact, type BriefFormatId } from "../../lib/report/briefArtifact";

/**
 * The share panel's picker, on the share page.
 *
 * Reads the same island the panel reads, so the page and the overlay cannot
 * offer different briefs. Renders nothing until the island is read, which is
 * one effect after hydration; the long-form controls below it are server
 * rendered and carry the page until then.
 */
export function SharePageFormats() {
  const artifact = useBriefArtifact();
  const [format, setFormat] = useState<BriefFormatId>("slack");
  const { copyToClipboard, copiedTarget } = useClipboardCopy();
  const activeFormat = BRIEF_FORMATS.find((option) => option.id === format) ?? BRIEF_FORMATS[0];

  const briefText = useMemo(
    () => (artifact ? formatBriefArtifact(artifact, format, window.location.origin) : ""),
    [artifact, format],
  );

  const copyBrief = useCallback(() => {
    if (!briefText) return;
    void copyToClipboard(briefText, "brief");
  }, [briefText, copyToClipboard]);

  if (!artifact) return null;

  return (
    <section className="weather-panel space-y-3 px-5 py-5" aria-labelledby="copy-call-heading">
      <h2 id="copy-call-heading" className="type-eyebrow">Copy this week&apos;s call</h2>
      <BriefFormatPicker
        format={format}
        activeFormat={activeFormat}
        briefText={briefText}
        copiedTarget={copiedTarget}
        onSelect={setFormat}
        onCopy={copyBrief}
      />
    </section>
  );
}
