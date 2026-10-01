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
export function SharePageFormats({
  scoreReferences = [],
}: {
  /** Each score with its line, distance and last week, from `formatScoreReference`; the on-screen reference for the pastes. */
  scoreReferences?: string[];
}) {
  const artifact = useBriefArtifact();
  const [format, setFormat] = useState<BriefFormatId>("slack");
  const { copyToClipboard, copiedTarget } = useClipboardCopy({ commitment: "copied_brief" });
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
    <section className="weather-panel space-y-4 px-5 max-sm:px-0 py-5" aria-labelledby="copy-call-heading">
      <h2 id="copy-call-heading" className="text-xl font-semibold text-white sm:text-2xl">Copy this week&apos;s guidance</h2>
      {/* Labelled and ruled at the left, so the four lines read as the readings
          behind every format rather than the opening of the text the tabs
          below copy. */}
      {scoreReferences.length > 0 ? (
        <div className="space-y-1 border-l-2 border-[var(--border-subtle)] pl-3">
          <p id="copy-call-scores-label" className="type-eyebrow">This week&apos;s readings</p>
          <ul className="space-y-1 text-xs tabular-nums text-slate-300" aria-labelledby="copy-call-scores-label">
            {scoreReferences.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
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
