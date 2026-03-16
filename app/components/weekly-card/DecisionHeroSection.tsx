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
  // Kept as a compatibility section for isolated tests; live WeeklyDecisionCard renders RegimeBanner + WeeklyCallModePanel.
  const { resolvedPostureLabel, resolvedStageLabel } = resolvePostureAndStage(props);
  const {
    immediateDecision,
    operatingStanceLine,
    regimeDistance,
    netConstraintSummary,
    regimeSignalIndicators = [],
    confidenceLabel,
    confidencePercent,
    trendLabel,
    transitionWatch,
    fetchedAtLabel,
    freshnessLine,
    weeklyMovement,
    sinceLastReview,
    whyItMattersLine,
    readThisCardItems = [],
    glossaryHref,
  } = props as DecisionHeroSectionProps & {
    netConstraintSummary?: string;
    regimeSignalIndicators?: Array<{ key: string; trendArrow?: string; trendDeltaLabel?: string; label?: string; valueLabel?: string; isFallback?: boolean }>;
  };

  const keySignals = regimeSignalIndicators.filter((indicator) => indicator.label && indicator.valueLabel).slice(0, 3);
  const topDeltaItems = sinceLastReview?.items.slice(0, 2) ?? [];
  const cardReadItems = readThisCardItems as Array<{ label: string; detail: string }>;
  const hasMeaningfulDelta = Boolean(sinceLastReview?.hasMeaningfulDelta && topDeltaItems.length > 0);
  const freshnessLabel = freshnessLine?.trim() || (fetchedAtLabel ? `Updated ${fetchedAtLabel}` : "Update time unavailable");
  const weeklyMovementLabel = weeklyMovement
    ? weeklyMovement.direction === "defensive"
      ? "Conditions tightening"
      : weeklyMovement.direction === "expansionary"
        ? "Conditions easing"
        : "Conditions stable"
    : "Conditions stable";

  return (
    <header className="space-y-4 border-b border-slate-700/80 pb-6" data-testid="weekly-top-fold">
      <article className="weather-panel-static weather-decision-hero rounded-[1.5rem] border-sky-400/25 px-5 py-5 sm:px-6 sm:py-6 lg:px-7">
        <div id="weekly-posture-brief-title" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
            <span className="weather-decision-chip rounded-full border border-sky-400/35 bg-sky-400/10 px-2.5 py-1 text-sky-100" data-priority="true">Weekly operating call</span>
            <span className="weather-decision-chip rounded-full border border-slate-700/70 bg-slate-950/70 px-2.5 py-1 text-slate-200">{resolvedPostureLabel} - {resolvedStageLabel}</span>
            <span className="weather-decision-chip rounded-full border border-slate-700/70 bg-slate-950/70 px-2.5 py-1 text-slate-200">Confidence {confidenceLabel} / {confidencePercent}%</span>
            <span className="weather-decision-chip rounded-full border border-slate-700/70 bg-slate-950/70 px-2.5 py-1 text-slate-200">Trend {trendLabel}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
            <span className="weather-decision-chip rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-emerald-100" data-priority="true">{freshnessLabel}</span>
            {fetchedAtLabel ? (
              <span className="weather-decision-chip rounded-full border border-slate-700/70 bg-slate-950/70 px-2.5 py-1 text-slate-200">
                Data through {fetchedAtLabel}
              </span>
            ) : null}
            <span className="weather-decision-chip rounded-full border border-slate-700/70 bg-slate-950/70 px-2.5 py-1 text-slate-200" data-priority={hasMeaningfulDelta ? "true" : undefined}>{weeklyMovementLabel}</span>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Operating stance</p>
            <h1 className="max-w-4xl text-2xl font-semibold leading-tight text-slate-50 sm:text-[2.15rem]">
              {operatingStanceLine}
            </h1>
            {whyItMattersLine ? (
              <p className="max-w-3xl text-sm text-slate-300">{whyItMattersLine}</p>
            ) : null}
            <p className="max-w-3xl text-sm text-slate-300">
              <span className="font-semibold text-slate-100">Do now:</span> {immediateDecision}
            </p>
            {cardReadItems.length > 0 ? (
              <details className="rounded-lg border border-slate-800/55 bg-slate-950/55 px-3 py-3">
                <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">Read this card</summary>
                <ul className="mt-2 grid gap-1.5 text-xs text-slate-200">
                  {cardReadItems.slice(0, 3).map((item) => (
                    <li key={item.label} className="rounded-md border border-slate-800/60 bg-slate-950/45 px-2.5 py-2">
                      <span className="font-semibold text-slate-100">{item.label}:</span> {item.detail}
                    </li>
                  ))}
                </ul>
                {glossaryHref ? (
                  <a href={glossaryHref} className="mt-2 inline-flex min-h-[44px] items-center text-xs font-semibold text-sky-300 underline underline-offset-2">
                    Open glossary help
                  </a>
                ) : null}
              </details>
            ) : null}
          </div>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.95fr)]">
          <section className="weather-section-stage weather-section-stage--short rounded-xl border border-slate-800/65 bg-slate-950/70 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
              <ShieldIcon className="h-3.5 w-3.5 text-sky-200" />
              <span>Decision summary</span>
            </div>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-800/70 bg-slate-950/55 px-3 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Market posture</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-100">{resolvedPostureLabel} - {resolvedStageLabel}</dd>
              </div>
              <div className="rounded-lg border border-slate-800/70 bg-slate-950/55 px-3 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">What would change this call</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-100">
                  {regimeDistance.dimensionLabel} {regimeDistance.thresholdDirection === "riseAbove" ? "above" : "at or below"} {regimeDistance.thresholdValue.toFixed(1)}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-800/70 bg-slate-950/55 px-3 py-3 sm:col-span-2">
                <dt className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  <CircleTargetIcon className="h-3.5 w-3.5 text-sky-200" />
                  What to watch
                </dt>
                <dd className="mt-1 text-sm text-slate-300">
                  {netConstraintSummary ?? `Transition watch is ${transitionWatch}. Keep this week’s major approvals reversible.`}
                </dd>
              </div>
            </dl>
          </section>
          <section className="weather-section-stage weather-section-stage--medium rounded-xl border border-slate-800/65 bg-slate-950/62 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">What changed this week</p>
              {weeklyMovement ? (
                <span className="weather-decision-chip rounded-full border border-slate-700/70 bg-slate-950/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-200" data-priority={hasMeaningfulDelta ? "true" : undefined}>
                  {weeklyMovement.summary}
                </span>
              ) : null}
            </div>
            {hasMeaningfulDelta ? (
              <div className="weather-list-stagger mt-3 grid gap-2">
                {topDeltaItems.map((item, index) => (
                  <article key={item.id} className="weather-delta-card rounded-lg border border-slate-800/60 bg-slate-950/55 px-3 py-2" data-emphasis={index === 0 ? "true" : undefined}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">{item.label}</p>
                    <p className="mt-1 text-sm text-slate-100">{item.detail}</p>
                  </article>
                ))}
              </div>
            ) : null}
            {keySignals.length > 0 ? (
              <ul className="weather-list-stagger mt-3 grid gap-2 text-sm text-slate-200">
                {keySignals.map((indicator, index) => (
                  <li key={indicator.key} className="weather-delta-card flex items-start justify-between gap-3 rounded-lg border border-slate-800/60 bg-slate-950/55 px-3 py-2" data-emphasis={index === 0 && !hasMeaningfulDelta ? "true" : undefined}>
                    <div>
                      <p className="text-slate-300">{indicator.label}</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {indicator.isFallback ? "No fresh weekly delta yet." : indicator.trendDeltaLabel ?? "Weekly delta unavailable."}
                      </p>
                    </div>
                    <span className="text-right font-semibold text-slate-100">
                      {indicator.valueLabel} {!indicator.isFallback ? indicator.trendArrow ?? "" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-300">
                {hasMeaningfulDelta ? "Signal detail not yet available." : "No fresh signal delta available yet. Hold the existing planning baseline."}
              </p>
            )}
          </section>
        </div>
      </article>
    </header>
  );
}
