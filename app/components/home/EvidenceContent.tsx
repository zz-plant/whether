import { buildSignalsPageModel } from "../../evidence/evidencePageModel";
import Link from "next/link";
import { DataCard } from "../DataCard";

export async function EvidenceContent() {
  let data;
  try {
    data = await buildSignalsPageModel();
  } catch {
    return (
      <p className="text-xs text-slate-500">Evidence data is currently unavailable. The standalone <Link href="/evidence" className="text-sky-300 underline">evidence page</Link> may have more detail.</p>
    );
  }

  const sensors = data.sensors ?? [];
  const macros = data.macroSeries ?? [];
  const topMacros = macros.slice(0, 3);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        These signals drive the weekly call. Full detail on the{" "}
        <Link href="/evidence" className="text-sky-300 underline decoration-slate-600 underline-offset-4 hover:text-sky-200">
          evidence page
        </Link>.
      </p>

      {sensors.length > 0 ? (
        <div>
          <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Key sensors</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {sensors.slice(0, 2).map((sensor) => (
              <DataCard
                key={sensor.id}
                variant="reading"
                label={sensor.label}
                value={sensor.value ?? "—"}
                unit={sensor.unit}
                interpretation={sensor.explanation}
                source={{ label: sensor.sourceLabel, freshness: sensor.isLive ? "Live" : "Cached" }}
                status={{ label: sensor.isLive ? "Live" : "Cached", tone: sensor.isLive ? "positive" : "warning" }}
              />
            ))}
          </div>
        </div>
      ) : null}

      {topMacros.length > 0 ? (
        <div>
          <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Macro context</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {topMacros.map((macro) => (
              <DataCard
                key={macro.id}
                variant="metric"
                label={macro.label}
                value={macro.value ?? "—"}
                unit={macro.unit}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
