import type { RegimeSignalKey } from "../../../lib/report/reportFormatting";
import {
  GLOSSARY_HREF,
  classifyScoreBand,
  compositeSignalScales,
  plainEnglishScoreDescription,
  scoreBandReference,
  signalPlainEnglish,
  type CompositeSignalKey,
} from "../../../lib/report/signalTranslations";
import { ActionLink } from "./actionLink";

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
 * Several signals' readings as a labelled list. Each sentence carries its own
 * signal name, so the pairing survives a single-column layout — a bare stack of
 * sentences under a row of cards loses which one belongs to which.
 */
export function SignalMeaningList({
  signals,
  className,
}: {
  signals: ReadonlyArray<{ signalKey: RegimeSignalKey; score: number }>;
  className?: string;
}) {
  return (
    <dl className={joinClasses("grid gap-2 sm:grid-cols-2", className)}>
      {signals.map(({ signalKey, score }) => (
        <div key={signalKey}>
          <dt className="text-fluid-nano font-medium text-slate-300">
            {signalPlainEnglish[signalKey].plainLabel}
          </dt>
          <dd className="mt-0.5 text-fluid-micro leading-snug text-slate-400">
            {plainEnglishScoreDescription(signalKey, score)}
          </dd>
        </div>
      ))}
    </dl>
  );
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

/**
 * The three reading bands with the current one marked, so a reader can place this
 * week's number against the range rather than against nothing.
 */
export function ScoreBandReference({
  signalKey,
  score,
  className,
}: {
  signalKey: RegimeSignalKey;
  score?: number;
  className?: string;
}) {
  const activeBand = typeof score === "number" ? classifyScoreBand(score) : null;
  const rows = scoreBandReference(signalKey);

  return (
    <dl className={joinClasses("space-y-1.5", className)}>
      {rows.map((row) => {
        const isActive = row.band === activeBand;
        return (
          <div key={row.band} className="flex gap-2 text-fluid-nano leading-snug">
            <dt
              className={joinClasses(
                "w-16 shrink-0 tabular-nums font-medium",
                isActive ? "text-sky-200" : "text-white/40",
              )}
            >
              {row.rangeLabel}
              {isActive ? <span className="sr-only"> (this week&rsquo;s reading)</span> : null}
            </dt>
            <dd className={isActive ? "text-white/80" : "text-white/45"}>{row.meaning}</dd>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * The full plain-English readout for one signal: what it measures, where this
 * week sits, and the question to ask yourself about it.
 */
export function SignalMeaningCard({
  signalKey,
  score,
  className,
}: {
  signalKey: RegimeSignalKey;
  score: number;
  className?: string;
}) {
  const entry = signalPlainEnglish[signalKey];

  return (
    <div
      className={joinClasses(
        "rounded-lg border border-slate-800/60 bg-slate-950/30 px-3 py-2.5",
        className,
      )}
    >
      <p className="text-fluid-xs font-semibold text-white/85">{entry.plainLabel}</p>
      <p className="mt-1 text-fluid-nano leading-snug text-white/55">{entry.whatItMeasures}</p>
      <ScoreBandReference signalKey={signalKey} score={score} className="mt-2" />
      <p className="mt-2 border-t border-white/[0.06] pt-2 text-fluid-nano leading-snug text-white/45">
        <span className="font-medium text-white/60">Ask yourself:</span> {entry.operatorPrompt}
      </p>
    </div>
  );
}

/** Link to the canonical glossary. Every unexplained term on a page should reach it. */
export function GlossaryLink({
  children = "Look up a term",
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <ActionLink href={GLOSSARY_HREF} variant="inline" className={className}>
      {children}
    </ActionLink>
  );
}
