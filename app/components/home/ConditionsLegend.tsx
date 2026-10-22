"use client";

import Link from "next/link";
import { X } from "lucide-react";
import type { RegimeKey } from "../../../lib/regimeEngine";
import { CONDITION_SIDE_MEANINGS, getOrderedRegimeLegend, REGIME_STYLE_TOKENS } from "../../../lib/regimePresentation";
import { ConditionIcon } from "../ui/conceptIcons";
import { regimeSignalLabel } from "../../../lib/report/signalTranslations";
import { STORAGE_KEYS } from "../../../lib/storage/keys";
import { formatThresholdNumber } from "../../../lib/formatters";
import { createBrowserSource, useBrowserSource } from "../browserSource";

const DISMISS_KEY = STORAGE_KEYS.homeOrientationDismissed;

/* Module-level on purpose: the dismissal writes to the document, which the
   React compiler's immutability rule refuses inside a component body. */
const markOrientationDismissed = () => {
  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Ignore storage errors.
  }
  document.documentElement.dataset.homeOrientationDismissed = "true";
};

const getBootstrappedDismissedState = () => {
  if (typeof document !== "undefined") {
    const bootstrappedDismissed = document.documentElement.dataset.homeOrientationDismissed;
    if (bootstrappedDismissed === "true" || bootstrappedDismissed === "false") {
      return bootstrappedDismissed === "true";
    }
  }

  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};

/* The bootstrap runs before paint and the storage read is the fallback, so both
   are one source. `false` through hydration, because that is what the server
   rendered; the layout's injected style rule keeps a dismissed line from
   flashing in the meantime. */
const dismissedSource = createBrowserSource<boolean>({
  read: getBootstrappedDismissedState,
  serverValue: false,
  refreshOnSubscribe: true,
});

/* Which side of each change line puts a reading in each condition
   (`regimeAtCoordinates`): above the funding-pressure line is tight money, above
   the risk-appetite line is investors funding risk. */
const SIDES: Record<RegimeKey, { pressureAbove: boolean; appetiteAbove: boolean }> = {
  EXPANSION: { pressureAbove: false, appetiteAbove: true },
  DEFENSIVE: { pressureAbove: true, appetiteAbove: true },
  VOLATILE: { pressureAbove: false, appetiteAbove: false },
  SCARCITY: { pressureAbove: true, appetiteAbove: false },
};

/* Sunny, Cloudy, Stormy, Freezing: the two calm states, then the two strained. */
const LEGEND_ORDER: readonly RegimeKey[] = ["EXPANSION", "DEFENSIVE", "VOLATILE", "SCARCITY"];

/**
 * The four conditions in one line, above the week (2026-10-09).
 *
 * It replaced a standfirst and a folded "How to read this page" with three steps,
 * the four conditions and two kinds of line, which sat before the heading and
 * pushed the verdict down. The one thing a first visit cannot decode on the card
 * is the weather word, and the definition that decodes it is two lines and four
 * sides: funding pressure above or below its change line, risk appetite above or
 * below its. It was printed in full only at the foot of /concepts and halfway down
 * /history. Server-rendered; a reader can dismiss it, and the layout hides it for
 * a browser that has rendered the brief before, as it hid the explainer.
 *
 * Below `md` only (2026-10-09). From `md` up the card beside the call draws the
 * conditions map, with each change line's value at its end and the link to how
 * they are set under it, so the same four definitions sat in two elements one
 * above the other. Below `md` the card has no room for the map, and this line is
 * the only definition on the first screen. The share greeting is not a
 * definition, so it stays at every width.
 *
 * Whom the site is for, and what it does, at every width (2026-10-21). The card
 * under this opens on the week's guidance, which says what to do and never what
 * Whether is, so a first visit met a weather word and a headline with no subject.
 * One sentence, the category line, in the slot that already shows only to a first
 * visit; returning readers and a dismissal hide it with the legend.
 */
export function ConditionsLegend({
  arrival,
  orientation,
  currentRegime,
  thresholds,
}: {
  arrival?: "share";
  /** Whom Whether is for and what it does (`homeOrientationLine`), shown at every width. */
  orientation?: string;
  /** This week's conditions, marked in the legend. Left out for an archived week. */
  currentRegime?: RegimeKey;
  /** The two change lines the conditions are cut at (the assessment's thresholds). */
  thresholds: { tightnessRegime: number; riskAppetiteRegime: number };
}) {
  const dismissed = useBrowserSource(dismissedSource);

  if (dismissed) {
    return null;
  }

  const handleDismiss = () => {
    markOrientationDismissed();
    dismissedSource.refresh();
  };

  const pressureLine = formatThresholdNumber(thresholds.tightnessRegime);
  const appetiteLine = formatThresholdNumber(thresholds.riskAppetiteRegime);
  const side = (above: boolean, line: string) => `${above ? "above" : "below"} ${line}`;

  return (
    <section
      data-weather-first-run-orientation="true"
      aria-label="The four conditions"
      data-testid="conditions-legend"
      suppressHydrationWarning
      className={`mb-3 flex items-start justify-between gap-4 border-b border-[color:var(--border-subtle)] pb-3 text-fluid-xs text-slate-300 ${arrival === "share" || orientation ? "" : "md:hidden"}`.trim()}
    >
      <div className="min-w-0 flex-1">
        <p className="min-w-0 leading-relaxed">
        {/* A reader who followed a pasted brief knows who sent it and nothing else. */}
        {arrival === "share" ? <>This is this week&apos;s guidance from Whether. </> : null}
        {/* A block for the eye, a space for a copy or a screen reader, which would
            otherwise read "…and raise.Cloudy this week". */}
        {orientation ? <><span className="block text-slate-100 md:text-fluid-sm" data-orientation-line>{orientation}</span>{" "}</> : null}
        <span className="md:hidden" data-conditions-definitions>
          {/* The first entry names both scores; the rest keep the same order, so
              the line stays short enough to read as one. */}
          {/* On a live week, this week's condition only (2026-10-14): the four
              ran to four lines on a phone, above the week and the call. The
              link names the other three. An archived week, with no condition
              marked, keeps the four. */}
          {LEGEND_ORDER.filter((regime) => !currentRegime || regime === currentRegime).flatMap((regime) => getOrderedRegimeLegend().filter((entry) => entry.regime === regime)).map((entry, index, all) => {
            const sides = SIDES[entry.regime];
            const pressure = side(sides.pressureAbove, pressureLine);
            const appetite = side(sides.appetiteAbove, appetiteLine);
            return (
              <span key={entry.regime}>
                {/* Inline, not a flex pair: the legend is one sentence that wraps. */}
                <ConditionIcon regime={entry.regime} className="mr-1 inline align-[-3px]" />
                <span className={`font-semibold ${REGIME_STYLE_TOKENS[entry.regime].accent.text}`}>{entry.weather}</span>
                {all.length === 1 ? " this week" : null}
                {/* A live week's one condition says what it means before its numbers:
                    the four words do not order themselves (Stormy is not worse than
                    Cloudy, each is hard on one side), so the meaning is the help. */}
                {all.length === 1
                  ? `: ${sides.pressureAbove ? CONDITION_SIDE_MEANINGS.pressureAbove : CONDITION_SIDE_MEANINGS.pressureBelow}, ${sides.appetiteAbove ? CONDITION_SIDE_MEANINGS.appetiteAbove : CONDITION_SIDE_MEANINGS.appetiteBelow} (${regimeSignalLabel.tightness.toLowerCase()} ${pressure}, ${regimeSignalLabel.riskAppetite.toLowerCase()} ${appetite})`
                  : index === 0
                    ? `: ${regimeSignalLabel.tightness.toLowerCase()} ${pressure}, ${regimeSignalLabel.riskAppetite.toLowerCase()} ${appetite}`
                    : `: ${pressure}, ${appetite}`}
                {entry.regime === currentRegime && all.length > 1 ? <span className="text-slate-400"> (this week)</span> : null}
                {index < all.length - 1 ? " · " : ". "}
              </span>
            );
          })}
          <Link
            href="/trust#formula-reference"
            className="weather-hit text-sky-300 underline decoration-sky-700 underline-offset-4 hover:text-sky-200"
          >
            {currentRegime ? "The four conditions and how they are set" : "How they are set"}
          </Link>
        </span>
      </p>
        {/*
          * The card, taught on the card (2026-10-21). A first visit reads the
          * condition, the guidance and the margin as three unrelated blocks; a
          * miniature of the card below, with the three numbered where they sit,
          * is the reading order. Deliberately md+ only — on a phone the band is
          * the one definition of the conditions and must stay one screen — and
          * deliberately inside this band, so the same dismissal hides it and a
          * reader who has seen it never sees it again. Wireframe, not art: grey
          * regions, numbered, no colour and no weather word, because a fake
          * reading in the orientation band would be this week's call with the
          * wrong text.
          */}
        {orientation ? (
          <div className="mt-4 hidden w-full items-start gap-6 md:flex" data-first-run-card-schematic>
            <svg viewBox="0 0 150 96" className="h-auto w-[150px] shrink-0" aria-hidden="true">
              {/* The card's outline. */}
              <rect x="0.5" y="0.5" width="149" height="95" rx="8" className="fill-slate-900/40 stroke-slate-600" />
              {/* 1: the condition stamp. */}
              <rect x="8" y="10" width="48" height="14" rx="3" className="fill-slate-800/60 stroke-slate-500" />
              <text x="32" y="20" textAnchor="middle" fontSize="5.5" letterSpacing="0.5" className="fill-slate-300">
                CONDITION
              </text>
              <circle cx="64" cy="17" r="8" className="fill-slate-900 stroke-slate-400" />
              <text x="64" y="20" textAnchor="middle" fontSize="8" className="fill-slate-200">1</text>
              {/* 2: the guidance, and its longer sentence. */}
              <rect x="8" y="36" width="118" height="10" rx="2" className="fill-slate-700/70" />
              <rect x="8" y="51" width="88" height="10" rx="2" className="fill-slate-700/70" />
              <circle cx="136" cy="41" r="8" className="fill-slate-900 stroke-slate-400" />
              <text x="136" y="44" textAnchor="middle" fontSize="8" className="fill-slate-200">2</text>
              {/* The trust strip under the call. */}
              <line x1="8" y1="68" x2="142" y2="68" className="stroke-slate-700" strokeDasharray="2 2" />
              {/* 3: the margin row. */}
              <rect x="8" y="74" width="134" height="16" rx="4" className="fill-slate-800/40 stroke-slate-600" />
              <text x="16" y="84.5" fontSize="5.5" letterSpacing="0.5" className="fill-slate-400">
                MARGIN
              </text>
              <circle cx="134" cy="82" r="8" className="fill-slate-900 stroke-slate-400" />
              <text x="134" y="85" textAnchor="middle" fontSize="8" className="fill-slate-200">3</text>
            </svg>
            <ol className="space-y-2 text-xs leading-5 text-slate-300">
              {[
                <>The condition &mdash; one word for the readings</>,
                <>This week&rsquo;s guidance &mdash; what to do</>,
                <>Margin &mdash; how far from the line where conditions change</>,
              ].map((label, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-400 text-[10px] font-semibold leading-none text-slate-200"
                  >
                    {index + 1}
                  </span>
                  <span>{label}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={orientation ? "Dismiss this introduction" : "Dismiss the conditions legend"}
        className="shrink-0 -mr-2 -mt-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </section>
  );
}
