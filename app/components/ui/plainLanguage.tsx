import type { RegimeSignalKey } from "../../../lib/report/reportFormatting";
import {
  compositeSignalScales,
  formatSignalReading,
  plainEnglishScoreDescription,
  signalPlainEnglish,
  type CompositeSignalKey,
} from "../../../lib/report/signalTranslations";

/**
 * The plain-English layer, rendered on screen.
 *
 * `lib/report/signalTranslations.ts` has carried operator-readable copy for every
 * signal since it was written, but the only consumer was the exported
 * "Plain-English brief" — so a reader who never clicked export never saw any of
 * it. These are the primitives that put the same strings in front of someone
 * reading the site.
 *
 * All server components: no client JS, no hydration boundary, no layout shift.
 */

const joinClasses = (...values: Array<string | undefined>) => values.filter(Boolean).join(" ");

/**
 * What the current reading means, in operator terms. One sentence, drawn from the
 * band the score falls in.
 */
export function PlainEnglishScoreNote({
  signalKey,
  score,
  lead,
  className,
}: {
  signalKey: RegimeSignalKey;
  score: number;
  /**
   * Optional lead-in. Pass one wherever the week's actual call can diverge from
   * what a single signal suggests — the translation strings are written as
   * instructions ("invest with milestones"), so unlabelled they read as advice
   * competing with the headline rather than as one input to it.
   */
  lead?: string;
  className?: string;
}) {
  return (
    <p className={joinClasses("text-fluid-nano leading-snug text-white/55", className)}>
      {lead ? <span className="text-white/40">{lead}: </span> : null}
      {plainEnglishScoreDescription(signalKey, score)}
    </p>
  );
}

/**
 * A composite score with its meaning attached: "Funding pressure 74/100: money
 * is hard to raise". The rendered twin of `formatSignalReading`, for any surface
 * that would otherwise print a bare number out of 100.
 */
export function SignalReading({
  signalKey,
  score,
  className,
}: {
  signalKey: CompositeSignalKey;
  score: number;
  className?: string;
}) {
  return <span className={className}>{formatSignalReading(signalKey, score)}</span>;
}

/**
 * What the ends of the scale mean. A bare "64" is only readable if you already
 * know which direction is bad.
 */
export function SignalScaleNote({
  signalKey,
  className,
  as: Component = "p",
}: {
  signalKey: CompositeSignalKey;
  className?: string;
  as?: "span" | "p";
}) {
  return (
    <Component className={joinClasses("text-fluid-nano text-white/40", className)}>
      {compositeSignalScales[signalKey].directionLabel}
    </Component>
  );
}

const isCompositeSignalKey = (key: RegimeSignalKey): key is CompositeSignalKey =>
  key === "tightness" || key === "riskAppetite";

/**
 * An expandable plain-English disclosure providing indicator context:
 * what it captures, its active scale/band meaning, historical era anchors,
 * and an operator prompt for leadership planning.
 */
export function SignalContextDetails({
  signalKey,
  score,
  scaleLabel,
  className,
}: {
  signalKey: RegimeSignalKey;
  score?: number | null;
  scaleLabel?: string;
  className?: string;
}) {
  const isComposite = isCompositeSignalKey(signalKey);
  const info = signalPlainEnglish[signalKey];
  if (!info) return null;

  return (
    <details
      className={joinClasses("weather-auto-chevron text-fluid-nano font-normal text-slate-400", className)}
      data-signal-context={signalKey}
    >
      <summary className="cursor-pointer select-none hover:text-slate-200 transition-colors">
        {isComposite ? "What the score means" : "What this signal means"}
      </summary>
      <div className="mt-1 space-y-1.5 rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--bg-nested)] p-2.5 text-fluid-nano">
        <p className="text-slate-300">
          <span className="font-semibold text-slate-200">What it captures: </span>
          {info.whatItMeasures}
        </p>
        {scaleLabel || isComposite ? (
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-slate-400">
            {scaleLabel ? <span className="capitalize">{scaleLabel}</span> : null}
            {scaleLabel && isComposite ? (
              <span aria-hidden="true" className="text-slate-600">·</span>
            ) : null}
            {isComposite ? (
              <SignalScaleNote signalKey={signalKey} as="span" className="inline font-normal text-slate-400" />
            ) : null}
          </div>
        ) : null}
        {isComposite && typeof score === "number" ? (
          <PlainEnglishScoreNote
            signalKey={signalKey}
            score={score}
            className="whitespace-normal font-normal text-slate-300/90"
          />
        ) : null}
        {info.historicalContext ? (
          <p className="text-slate-400">
            <span className="font-medium text-slate-300">Historical context: </span>
            {info.historicalContext}
          </p>
        ) : null}
        {info.operatorPrompt ? (
          <p className="border-t border-[color:var(--border-faint)] pt-1 text-slate-400">
            <span className="font-medium text-slate-200">Ask your team: </span>
            {info.operatorPrompt}
          </p>
        ) : null}
      </div>
    </details>
  );
}
