import { detectSourceDisagreement, type DisagreementResult } from "../../../lib/report/sourceDisagreement";

export function SourceDisagreement({
  tightnessDelta,
  riskAppetiteDelta,
}: {
  tightnessDelta: number;
  riskAppetiteDelta: number;
}) {
  const result: DisagreementResult = detectSourceDisagreement(
    { tightnessDelta, riskAppetiteDelta },
    { tightnessDelta: tightnessDelta * 0.6, riskAppetiteDelta: riskAppetiteDelta * 0.4 },
  );

  if (!result) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
      <p className="type-eyebrow text-amber-200">Sources disagree</p>
      <p className="mt-1 text-xs text-amber-100/80">
        Treasury signals point {result.treasuryDirection} while macro signals point {result.macroDirection}.
      </p>
      <p className="mt-2 text-xs text-slate-400">{result.driverLabel}</p>
    </div>
  );
}
