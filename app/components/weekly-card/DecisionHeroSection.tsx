import { CircleTargetIcon, ShieldIcon } from "../uiIcons";
import type { DecisionHeroSectionProps } from "./types";

const resolvePostureAndStage = ({ statusLabel, postureLabel, stageLabel, postureWithStageLabel }: Pick<DecisionHeroSectionProps, "statusLabel" | "postureLabel" | "stageLabel" | "postureWithStageLabel">) => {
  const [derivedPostureLabel, derivedStageLabel] = (postureWithStageLabel ?? "").split(" — ");
  return {
    resolvedPostureLabel: postureLabel ?? derivedPostureLabel ?? statusLabel,
    resolvedStageLabel: stageLabel ?? derivedStageLabel ?? "Unspecified",
  };
};

export function DecisionHeroSection(props: DecisionHeroSectionProps) {
  const { resolvedPostureLabel, resolvedStageLabel } = resolvePostureAndStage(props);
  const { immediateDecision, operatingStanceLine, regimeDistance, netConstraintSummary, regimeSignalIndicators = [] } = props as DecisionHeroSectionProps & { netConstraintSummary?: string; regimeSignalIndicators?: Array<{ key: string; trendArrow?: string; label?: string; valueLabel?: string; isFallback?: boolean }> };

  return (
    <header className="space-y-4 border-b border-slate-700/80 pb-6" data-testid="weekly-top-fold">
      <article className="rounded-xl border border-sky-400/50 bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950 p-5">
        <div id="weekly-posture-brief-title" className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">Weekly operating call</p>
        </div>
        <ol className="mt-3 grid gap-2" aria-label="Weekly decision card sequence">
          <li className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-200"><p className="inline-flex items-center gap-1.5"><CircleTargetIcon className="h-3.5 w-3.5" />Regime</p><p className="mt-1 text-sm font-semibold text-slate-100">{resolvedPostureLabel} — {resolvedStageLabel}</p></li>
          <li className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-200"><p className="inline-flex items-center gap-1.5"><ShieldIcon className="h-3.5 w-3.5" />Call</p><p className="mt-1 text-sm font-semibold text-slate-100">{operatingStanceLine}</p></li>
          <li className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-200"><p className="text-xs font-semibold text-slate-300">Do now:</p><p className="mt-1 text-sm font-semibold text-slate-100">{immediateDecision}</p></li>
          <li className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-200"><p className="mt-1 text-sm font-semibold text-slate-100">Next flip: {regimeDistance.dimensionLabel} {regimeDistance.thresholdDirection === "riseAbove" ? "rises above" : "falls to or below"} {regimeDistance.thresholdValue.toFixed(1)}.</p></li>
        </ol>
        <p className="mt-2 text-xs text-slate-300">What changed this week</p>
        <p className="text-xs text-slate-300">Leadership call</p>
        <p className="text-xs text-slate-300">Confidence</p>
        <p className="text-xs text-slate-300">Primary risk</p>
        {netConstraintSummary ? <p className="text-xs text-slate-300">{netConstraintSummary}</p> : null}
        <div className="flex gap-1 text-xs text-slate-300">{regimeSignalIndicators.map((indicator) => <span key={indicator.key}>{indicator.label} {indicator.valueLabel} {indicator.isFallback ? "" : (indicator.trendArrow ?? "")}</span>)}</div>
      </article>
    </header>
  );
}
