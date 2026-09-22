import type { SignalClusterReading } from "../../../lib/report/signalClusterReading";

/**
 * The reading a signal cluster page is named for.
 *
 * Labelled rows rather than nested cards: the panel already sits inside the page
 * measure, and boxing each fact would put three containment levels around four
 * short lines — the same trade `evidenceDecisionSummary` settled the other way
 * for the same reason. The hue lives on the label, not on a box around it.
 */

const directionClassName: Record<SignalClusterReading["directionTone"], string> = {
  easing: "text-semantic-easing-fg",
  tightening: "text-semantic-tightening-fg",
  unchanged: "text-slate-400",
};

export function SignalReadingPanel({
  reading,
  recordDateLabel,
}: {
  reading: SignalClusterReading;
  recordDateLabel: string;
}) {
  // `displayValue`, never `value` — see SignalClusterReading.displayValue.
  const hasValue = reading.displayValue !== null && reading.unavailableReason === null;

  return (
    <section className="weather-panel space-y-4 px-6 max-sm:px-0 py-6" aria-labelledby="signal-reading-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="signal-reading-heading" className="type-eyebrow type-eyebrow-section">
          {reading.measure} · this week
        </h2>
        <p className="text-xs text-slate-500">As of {recordDateLabel}</p>
      </div>

      {hasValue ? (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {/* tabular-nums so the figure does not reflow between weeks. */}
          <p className="text-4xl font-semibold tabular-nums text-slate-100 sm:text-5xl">
            {reading.displayValue}
          </p>
          <p className="text-sm text-slate-400">{reading.scaleNote}</p>
        </div>
      ) : (
        <p className="text-sm text-slate-300">{reading.unavailableReason}</p>
      )}

      <dl className="space-y-1.5 text-sm text-slate-200">
        {hasValue ? (
          <div className="flex flex-wrap gap-x-2">
            <dt className="shrink-0 font-semibold text-slate-400">Against its threshold</dt>
            <dd className="min-w-0">{reading.distanceLabel}</dd>
          </div>
        ) : null}
        {/* Suppressed with the figure: a week-over-week line under "the spread
            cannot be computed" is two contradictory claims about the same week. */}
        {hasValue ? (
          <div className="flex flex-wrap gap-x-2">
            <dt className="shrink-0 font-semibold text-slate-400">Week over week</dt>
            <dd className={`min-w-0 ${directionClassName[reading.directionTone]}`}>{reading.directionLabel}</dd>
          </div>
        ) : null}
        {reading.inputs.length > 0 ? (
          <div className="flex flex-wrap gap-x-2">
            <dt className="shrink-0 font-semibold text-slate-400">Built from</dt>
            <dd className="min-w-0 tabular-nums">
              {reading.inputs.map((input) => `${input.label} ${input.value}`).join(" · ")}
            </dd>
          </div>
        ) : null}
      </dl>

      {reading.caveat ? (
        <p className="border-l-2 border-semantic-caution-border pl-3 text-sm text-slate-300">
          {reading.caveat}
        </p>
      ) : null}

      <p className="text-sm text-slate-200">
        <span className="font-semibold text-slate-100">What this changes: </span>
        {reading.implication}
      </p>
    </section>
  );
}
