import { formatDateUTC, formatTimestampUTC } from "../../../lib/formatters";

export type SeriesFreshnessProps = {
  label?: string;
  sourceLabel: string;
  sourceUrl: string;
  recordDate: string;
  fetchedAt: string;
  isLive: boolean;
};

export const SeriesFreshnessBadge = ({
  label = "Data freshness",
  sourceLabel,
  sourceUrl,
  recordDate,
  fetchedAt,
  isLive,
}: SeriesFreshnessProps) => {
  const statusLabel = isLive ? "Live source" : "Cached snapshot";
  const statusTone = isLive
    ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
    : "border-amber-400/60 bg-amber-500/15 text-amber-100";

  return (
    <div className="weather-surface px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">{label}</p>
        <span
          className={`inline-flex min-h-[24px] items-center rounded-full border px-2 py-1 text-xs font-semibold tracking-[0.12em] ${statusTone}`}
        >
          {statusLabel}
        </span>
      </div>
      <dl className="mt-2 space-y-2 text-xs text-slate-400">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="text-slate-500">Source</dt>
          <dd>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="touch-target inline-flex min-h-[44px] items-center text-slate-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100"
            >
              {sourceLabel}
            </a>
          </dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="text-slate-500">Record date</dt>
          <dd className="mono text-slate-200">
            <time dateTime={recordDate}>{formatDateUTC(recordDate)}</time>
          </dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="text-slate-500">Fetched</dt>
          <dd className="mono text-slate-200">
            <time dateTime={fetchedAt}>{formatTimestampUTC(fetchedAt)}</time>
          </dd>
        </div>
      </dl>
    </div>
  );
};
