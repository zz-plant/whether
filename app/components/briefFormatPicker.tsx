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
  /* A container, not a viewport breakpoint: the same picker sits in the narrow
     share drawer and across the full width of /share. At full width the 2×2
     grid drew four buttons each half the page wide, and the copy button ran
     edge to edge under a preview a third of that width. */
  <div className="@container">
    <fieldset className="mt-2">
      <legend className="sr-only">Format</legend>
      <div className="grid grid-cols-2 gap-1.5 @xl:max-w-xl @xl:grid-cols-4">
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
    {/* The preview is the copy payload itself, with realistic channel context. */}
    <div className="mt-2 overflow-hidden rounded-md border border-slate-800/80 bg-slate-950/80">
      <div className="flex items-center justify-between border-b border-slate-800/60 bg-slate-900/60 px-3 py-1.5 text-fluid-nano text-slate-400">
        <span className="flex items-center gap-1.5 font-medium text-slate-300">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400/80" aria-hidden="true" />
          {activeFormat.label} format
        </span>
        <span className="text-slate-500 tabular-nums">Ready to paste</span>
      </div>
      <pre
        aria-label={`Preview of the ${activeFormat.label} format`}
        className="whitespace-pre-wrap break-words p-3 text-[11px] leading-5 text-slate-300"
      >
        {briefText}
      </pre>
    </div>
    <button
      type="button"
      onClick={onCopy}
      data-premium-intent="export_brief"
      data-premium-cta="share_rail_copy_brief"
      data-testid="share-rail-copy-brief"
      className="weather-button mt-2 inline-flex w-full min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold @xl:w-auto @xl:px-5"
    >
      {copiedTarget === "brief" ? "Copied!" : `Copy ${activeFormat.label} format`}
    </button>
  </div>
);
