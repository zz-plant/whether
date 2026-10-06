"use client";

import { useCallback, useMemo, useState } from "react";
import { BriefFormatPicker } from "./briefFormatPicker";
import { useBriefArtifact } from "./useBriefArtifact";
import { useClipboardCopy } from "./useClipboardCopy";
import { BRIEF_FORMATS, formatBriefArtifact, type BriefFormatId } from "../../lib/report/briefArtifact";

/**
 * The share rail's four formats, embedded in a page: /operate's "Share the
 * brief" step. Reads the same island the rail reads, so the step and the
 * overlay cannot offer different briefs, and renders nothing until the island
 * is read. Every other format — the full brief, email, meeting pack, tags,
 * memos — lives on /share (`app/share/sharePageFormats.tsx`).
 */
export function BriefIslandPicker({
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
    <section className="weather-section-stack" aria-label="Copy this week’s guidance">
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
