import { CONFIDENCE_COLOR, RELIABILITY_COLOR } from "../viewModel";

export function DeltaTrustStrip({
  confidenceLabel,
  reliabilityScore,
  sourceCount,
  degradedCount,
  fetchedAtLabel,
  inputsComplete = true,
}: {
  tightnessDelta: number;
  riskAppetiteDelta: number;
  confidenceLabel: string;
  reliabilityScore: number;
  sourceCount: number;
  degradedCount: number;
  direction: unknown;
  fetchedAtLabel?: string;
  inputsComplete?: boolean;
}) {
  const confColor = CONFIDENCE_COLOR(confidenceLabel);
  const relColor = RELIABILITY_COLOR(reliabilityScore);
  const freshnessLabel = fetchedAtLabel?.match(/\d+h/)?.[0] ?? "0h";
  const normalizedConfidence = confidenceLabel === "HIGH" ? "High" : confidenceLabel === "MED" ? "Medium" : confidenceLabel === "LOW" ? "Low" : confidenceLabel;

  return (
    <section className="weather-card lg:col-span-12" aria-label="compact confidence strip">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-fluid-micro">
        <p className="font-semibold tracking-[0.14em] text-white/40">compact confidence strip</p>
        <p className="text-white/55">Data freshness: <strong className="text-white">{freshnessLabel}</strong></p>
        <p className="text-white/55">Confidence: <strong className={confColor}>{normalizedConfidence}</strong></p>
        <p className="text-white/55">Inputs complete: <strong className={inputsComplete ? "text-emerald-300" : "text-amber-300"}>{inputsComplete ? "Yes" : "No"}</strong></p>
        <p className="text-white/40">Reliability <strong className={`tabular-nums ${relColor}`}>{reliabilityScore}%</strong> · {sourceCount - degradedCount} live{degradedCount > 0 ? ` · ${degradedCount} cached` : ""}</p>
      </div>
    </section>
  );
}
