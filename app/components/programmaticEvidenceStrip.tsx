import type { ProgrammaticPayloadRecord } from "../../lib/seo/programmaticPayloadBuilder";

const formatIsoTimestamp = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toISOString().replace(".000", "");
};

const toSourceLabel = (url: string): string => {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const resolveFallbackStatus = (record: ProgrammaticPayloadRecord): boolean =>
  (record.payload.noindexReasons ?? []).includes("fallback-snapshot");

export const ProgrammaticEvidenceStrip = ({ record }: { record: ProgrammaticPayloadRecord }) => {
  const confidenceLabel = record.payload.evidence[0]?.confidenceLabel ?? "Unavailable";
  const fallbackSnapshot = resolveFallbackStatus(record);

  return (
    <aside className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-4 text-xs text-slate-200">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-400">Evidence and trust</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-[0.65rem] uppercase tracking-[0.14em] text-slate-500">Freshness</p>
          <p className="text-sm font-medium text-slate-100">{record.payload.freshness}</p>
          <p className="mono text-[0.7rem] text-slate-400">Record {record.snapshot.recordDate} · Updated {formatIsoTimestamp(record.snapshot.fetchedAtIso)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[0.65rem] uppercase tracking-[0.14em] text-slate-500">Trust status</p>
          <p className="text-sm text-slate-100">Confidence: {confidenceLabel}</p>
          <p className="text-sm text-slate-100">Fallback snapshot: {fallbackSnapshot ? "Yes" : "No"}</p>
          <p className="text-sm text-slate-100">Degraded: {record.payload.degraded ? "Yes" : "No"}</p>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <p className="text-[0.65rem] uppercase tracking-[0.14em] text-slate-500">Top sources</p>
        <ul className="flex flex-wrap gap-2">
          {(record.payload.sourceLinks ?? []).slice(0, 3).map((link) => (
            <li key={link}>
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-[0.7rem] font-semibold text-slate-100"
              >
                {toSourceLabel(link)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};
