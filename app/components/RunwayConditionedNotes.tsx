"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { RegimeKey } from "../../lib/regimeEngine";
import type { DecisionArea } from "../../lib/report/boundedDecisionRules";
import { buildRunwayConditionedNotes } from "../../lib/report/runwayConditionedNotes";
import { useOperatorProfile } from "./useOperatorProfile";

const useRunwayNotes = (regime: RegimeKey) => {
  const { profile, setProfileField } = useOperatorProfile();
  const notes = useMemo(
    () =>
      buildRunwayConditionedNotes({
        regime,
        runwayMonths: profile.runwayMonths,
        monthlyBurnUsd: profile.monthlyBurnUsd,
      }),
    [regime, profile.runwayMonths, profile.monthlyBurnUsd],
  );
  return { profile, notes, setRunway: (months: number | undefined) => setProfileField("runwayMonths", months) };
};

/**
 * The weekly call, conditioned on the operator's own runway: the control.
 *
 * The canonical call is server-rendered and company-agnostic; this reads the
 * browser-local operator profile after mount. A missing number never reads as
 * zero, and the brief stays canonical for every other reader of the same URL.
 *
 * Until a runway is stored it offers the four bands instead of nothing. The
 * figure used to be settable only on `/operate`, so the one line on `/` that
 * translates the call to a company was invisible to anyone who had not been
 * there — which is every reader arriving from a shared link. A band is enough
 * to pick the note; the exact figure and burn still live on `/operate`.
 *
 * The notes themselves no longer print here as a list of their own: each one
 * sits under the rule for the area it concerns, in the table this control
 * heads (`RunwayAreaNote`), so a reader finds the runway caveat on the row it
 * qualifies rather than in a second list of the same five areas.
 */
export function RunwayConditionedNotes({ regime }: { regime: RegimeKey }) {
  const { profile, notes, setRunway } = useRunwayNotes(regime);

  /* No picker of its own. It used to carry a second four-button runway control,
     banded at 18 months where the selector heading this section bands at 24,
     so one screen offered two runway controls that disagreed. The selector (the
     header pill on a phone) is the one control; this says what choosing does. */
  if (notes.length === 0) {
    return (
      <div id="runway-notes" className="space-y-1.5">
        <p className="type-eyebrow text-slate-300">What this guidance means at your runway</p>
        <p className="text-fluid-nano text-slate-400">
          Choose your cash runway and each rule below gains a line for the areas it changes: which one
          protects runway fastest, and roughly how many months a 10% burn cut buys.
        </p>
        <p className="text-fluid-nano text-slate-500">
          Nothing leaves this browser, and the guidance does not change; only the notes under it do.
        </p>
      </div>
    );
  }

  return (
    <div id="runway-notes" className="space-y-1.5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="type-eyebrow text-slate-300">
          What this guidance means at {profile.runwayMonths} months of runway
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setRunway(undefined)}
            className="inline-flex min-h-[44px] sm:min-h-9 items-center rounded-sm px-2 text-fluid-micro text-slate-400 underline decoration-slate-600 underline-offset-4 hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
          >
            Clear
          </button>
        </div>
      </div>
      <p className="text-fluid-nano text-slate-500">
        Your figures stay in this browser. These notes translate the guidance; the thresholds above are
        unchanged.{" "}
        <Link href="/operate/financial#ops-runway-inputs" className="text-slate-400 underline decoration-slate-600 underline-offset-4 hover:text-slate-200">
          Enter the exact runway and burn
        </Link>
        .
      </p>
    </div>
  );
}

/**
 * The runway note for one area, under that area's rule. Renders nothing until
 * a band is stored, and nothing for an area the band leaves alone.
 */
export function RunwayAreaNote({ regime, area }: { regime: RegimeKey; area: DecisionArea }) {
  const { notes } = useRunwayNotes(regime);
  const note = notes.find((entry) => entry.area === area);
  if (!note) return null;
  return (
    <p data-testid="runway-area-note" className="mt-1 text-xs leading-5 text-amber-200/90">
      {note.note}
    </p>
  );
}
