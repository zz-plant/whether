/**
 * Data provenance strip for surfacing source, freshness, and live status inline.
 * Keeps each Market Climate Station section traceable at the point of interpretation.
 */
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

export const DataProvenanceStrip = ({
  provenance,
  label = "Data provenance",
}: {
  provenance: DataProvenance;
  label?: string;
}) => {
  const statusStyle = statusStyles[provenance.statusLabel as keyof typeof statusStyles];

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
      <span
        className={`weather-chip rounded-full border px-2 py-1 text-xs font-semibold tracking-[0.14em] ${
          statusStyle ?? "border-slate-700 text-slate-200"
        }`}
      >
        {provenance.statusLabel}
      </span>
    </div>
  );
};
