import type { RegimeSignalKey } from "../../../lib/report/reportFormatting";
import {
  compositeSignalScales,
  formatSignalReading,
  plainEnglishScoreDescription,
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
}: {
  signalKey: CompositeSignalKey;
  className?: string;
}) {
  return (
    <p className={joinClasses("text-fluid-nano text-white/40", className)}>
      {compositeSignalScales[signalKey].directionLabel}
    </p>
  );
}
