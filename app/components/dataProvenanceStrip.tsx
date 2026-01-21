/**
 * Data provenance strip for surfacing source, freshness, and live status inline.
 * Keeps each Market Climate Station section traceable at the point of interpretation.
 */
"use client";

import { Tooltip } from "@base-ui/react/tooltip";

export type DataProvenance = {
  sourceLabel: string;
  sourceUrl?: string;
  recordDateLabel: string;
  timestampLabel: string;
  ageLabel: string;
  statusLabel: string;
};

const statusStyles = {
  "Live (high confidence)": "border-emerald-400/50 bg-emerald-500/10 text-emerald-200",
  "Cached (medium)": "border-amber-400/60 bg-amber-500/10 text-amber-100",
  "Simulated (low)": "border-slate-600/70 bg-slate-800/40 text-slate-200",
} as const;

const statusDescriptions = {
  "Live (high confidence)": "Streaming feeds updated within the last 24 hours.",
  "Cached (medium)": "Latest available data cached from our last refresh.",
  "Simulated (low)": "Modeled inputs or backfilled estimates where live data is absent.",
} as const;

export const DataProvenanceStrip = ({
  provenance,
  label = "Data provenance",
}: {
  provenance: DataProvenance;
  label?: string;
}) => {
  const statusStyle = statusStyles[provenance.statusLabel as keyof typeof statusStyles];
  const statusDescription =
    statusDescriptions[provenance.statusLabel as keyof typeof statusDescriptions] ??
    "Signal status defined by source availability.";

  return (
    <div className="weather-pill flex flex-wrap items-center gap-2 px-4 py-2 text-[0.65rem] font-semibold tracking-[0.16em] text-slate-300">
      <span className="text-slate-500">{label}</span>
      <span className="h-1 w-1 rounded-full bg-slate-600" aria-hidden="true" />
      <span>
        Source:{" "}
        {provenance.sourceUrl ? (
          <a
            href={provenance.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="touch-target inline-flex min-h-[44px] items-center text-slate-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100"
          >
            {provenance.sourceLabel}
          </a>
        ) : (
          <span className="text-slate-200">{provenance.sourceLabel}</span>
        )}
      </span>
      <span className="h-1 w-1 rounded-full bg-slate-600" aria-hidden="true" />
      <span>
        Record date: <span className="mono text-slate-200">{provenance.recordDateLabel}</span>
      </span>
      <span className="h-1 w-1 rounded-full bg-slate-600" aria-hidden="true" />
      <span>
        Timestamp: <span className="mono text-slate-200">{provenance.timestampLabel}</span>
      </span>
      <span className="h-1 w-1 rounded-full bg-slate-600" aria-hidden="true" />
      <span>
        <span className="text-slate-500">Data age:</span>{" "}
        <span className="mono text-slate-200">{provenance.ageLabel}</span>
      </span>
      <Tooltip.Root>
        <Tooltip.Trigger
          type="button"
          className={`weather-chip rounded-full border px-2 py-1 text-xs font-semibold tracking-[0.14em] transition-colors hover:border-slate-500/80 ${
            statusStyle ?? "border-slate-700 text-slate-200"
          }`}
        >
          {provenance.statusLabel}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner side="top" align="center" sideOffset={8}>
            <Tooltip.Popup className="max-w-[220px] rounded-xl border border-slate-700/80 bg-slate-950/95 px-3 py-2 text-xs text-slate-200 shadow-lg">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Status meaning
              </p>
              <p className="mt-2 text-sm text-slate-200">{statusDescription}</p>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </div>
  );
};
