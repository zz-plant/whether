"use client";

import { BRIEF_FORMATS, type BriefFormatId } from "../../lib/report/briefArtifact";

/**
 * Pick a format, see exactly what will be copied, copy it.
 *
 * Shared by the share panel and `/share`, which is what makes the two one
 * control rather than a page and an overlay that build the same thing twice —
 * the component-level duplication section 1.1.9 of the feature specs left as
 * "the smaller follow-up".
 */
export const BriefFormatPicker = ({
  format,
  activeFormat,
  briefText,
  copiedTarget,
  onSelect,
  onCopy,
}: {
  format: BriefFormatId;
  activeFormat: (typeof BRIEF_FORMATS)[number];
  briefText: string;
  copiedTarget: string | null;
  onSelect: (id: BriefFormatId) => void;
  onCopy: () => void;
}) => (
  <>
    <fieldset className="mt-2">
      <legend className="sr-only">Format</legend>
      <div className="grid grid-cols-2 gap-1.5">
        {BRIEF_FORMATS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            aria-pressed={format === option.id}
            className={`min-h-[44px] rounded-md px-2 py-2 text-xs font-semibold transition-colors weather-focus-ring ${
              format === option.id
                ? "border border-sky-500/30 bg-sky-500/12 text-sky-100"
                : "border border-transparent text-slate-300 hover:bg-slate-800/50"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
    <p className="mt-1.5 text-xs text-slate-400">{activeFormat.hint}</p>
    {/* The preview is the copy payload itself, not a rendering of it. A picker
        that describes three formats and copies a fourth thing is the failure the
        share panel used to have. No scroll container of its own: the host
        scrolls, and a nested scroller would need its own tab stop to stay
        keyboard-reachable. */}
    <pre
      aria-label={`Preview of the ${activeFormat.label} format`}
      className="mt-2 whitespace-pre-wrap break-words rounded-md border border-slate-800/70 bg-slate-950/60 p-2.5 text-[11px] leading-5 text-slate-300"
    >
      {briefText}
    </pre>
    <button
      type="button"
      onClick={onCopy}
      data-premium-intent="export_brief"
      data-premium-cta="share_rail_copy_brief"
      data-testid="share-rail-copy-brief"
      className="weather-button mt-2 inline-flex w-full min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold"
    >
      {copiedTarget === "brief" ? "Copied!" : `Copy ${activeFormat.label} format`}
    </button>
  </>
);
