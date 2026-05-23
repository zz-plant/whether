import { buildTrustPageModel } from "../../trust/trustPageModel";
import { DataCard } from "../DataCard";

export async function TrustContent() {
  let data;
  try {
    data = await buildTrustPageModel();
  } catch {
    return (
      <p className="text-xs text-slate-500">Trust data is currently unavailable. The standalone <a href="/trust" className="text-sky-300 underline">trust page</a> may have more detail.</p>
    );
  }

  const { reportData, isFallback, confidenceLabel, trustSummary, sourceCoverage, trustVerdict, warnings } = data;

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        System status and data reliability. Full detail on the{" "}
        <a href="/trust" className="text-sky-300 underline decoration-slate-600 underline-offset-4 hover:text-sky-200">
          trust page
        </a>.
      </p>

      <DataCard
        variant="narrative"
        label="Overall status"
        interpretation={trustVerdict.detail}
      >
        <div className="flex items-center gap-2 mt-2">
          <span className={`flex h-2.5 w-2.5 rounded-full ${isFallback ? "bg-amber-400" : "bg-emerald-400"}`} aria-hidden="true" />
          <span className="text-xs text-slate-300">{isFallback ? "Degraded" : "Operational"}</span>
          <span className="text-fluid-micro text-slate-500 ml-auto">Updated {reportData.fetchedAtLabel}</span>
        </div>
      </DataCard>

      <div className="grid gap-2 sm:grid-cols-2">
        <DataCard
          variant="metric"
          label="Freshness"
          value={reportData.fetchedAtLabel}
          interpretation={trustSummary}
          status={{ label: isFallback ? "Cached" : "Live", tone: isFallback ? "warning" : "positive" }}
        />
        <DataCard
          variant="metric"
          label="Source coverage"
          value={sourceCoverage}
          status={{ label: confidenceLabel, tone: confidenceLabel === "HIGH" ? "positive" : confidenceLabel === "MED" ? "warning" : "negative" }}
        />
      </div>

      {warnings.length > 0 ? (
        <DataCard variant="narrative" label="Active warnings">
          <ul className="mt-2 space-y-1">
            {warnings.map((w: { id: string; warning: string }) => (
              <li key={w.id} className="text-xs text-amber-200">{w.warning}</li>
            ))}
          </ul>
        </DataCard>
      ) : null}
    </div>
  );
}
