"use client";

import Link from "next/link";
import { X } from "lucide-react";
import type { RegimeKey } from "../../../lib/regimeEngine";
import { getOrderedRegimeLegend, REGIME_STYLE_TOKENS } from "../../../lib/regimePresentation";
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
 */
export function ConditionsLegend({
  arrival,
  currentRegime,
  thresholds,
}: {
  arrival?: "share";
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
      className={`mb-3 flex items-start justify-between gap-4 border-b border-white/[0.08] pb-3 text-fluid-xs text-slate-300 ${arrival === "share" ? "" : "md:hidden"}`.trim()}
    >
      <p className="min-w-0 leading-relaxed">
        {/* A reader who followed a pasted brief knows who sent it and nothing else. */}
        {arrival === "share" ? <>This is this week&apos;s guidance from Whether. </> : null}
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
                  ? `: ${sides.pressureAbove ? "pricey money" : "cheap money"}, ${sides.appetiteAbove ? "willing investors" : "wary investors"} (${regimeSignalLabel.tightness.toLowerCase()} ${pressure}, ${regimeSignalLabel.riskAppetite.toLowerCase()} ${appetite})`
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
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss the conditions legend"
        className="shrink-0 -mr-2 -mt-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </section>
  );
}
