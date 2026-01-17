/**
 * Data provenance strip for surfacing source, freshness, and live status inline.
 * Keeps each Regime Station section traceable at the point of interpretation.
 */
export type DataProvenance = {
  sourceLabel: string;
  sourceUrl?: string;
  timestampLabel: string;
  statusLabel: string;
};

const statusStyles = {
  Live: "border-emerald-400/50 bg-emerald-500/10 text-emerald-200",
  Offline: "border-slate-600/70 bg-slate-800/40 text-slate-200",
} as const;

export const DataProvenanceStrip = ({
  provenance,
  label = "Data provenance",
}: {
  provenance: DataProvenance;
  label?: string;
}) => {
  const statusStyle = statusStyles[provenance.statusLabel as keyof typeof statusStyles];

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-full border border-slate-800/80 bg-slate-950/60 px-3 py-2 text-[10px] uppercase tracking-[0.25em] text-slate-400">
      <span className="text-slate-500">{label}</span>
      <span className="h-1 w-1 rounded-full bg-slate-700" aria-hidden="true" />
      <span>
        Source:{" "}
        {provenance.sourceUrl ? (
          <a
            href={provenance.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="touch-target inline-flex min-h-[44px] items-center text-slate-200 underline decoration-slate-700 underline-offset-4 hover:text-slate-100"
          >
            {provenance.sourceLabel}
          </a>
        ) : (
          <span className="text-slate-200">{provenance.sourceLabel}</span>
        )}
      </span>
      <span className="h-1 w-1 rounded-full bg-slate-700" aria-hidden="true" />
      <span>
        Timestamp: <span className="mono text-slate-200">{provenance.timestampLabel}</span>
      </span>
      <span
        className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.25em] ${
          statusStyle ?? "border-slate-700 text-slate-200"
        }`}
      >
        {provenance.statusLabel}
      </span>
    </div>
  );
};
