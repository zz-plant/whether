"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { RegimeKey } from "../../lib/regimeEngine";
import type { DecisionArea } from "../../lib/report/boundedDecisionRules";
import {
  RUNWAY_QUICK_PICKS,
  buildRunwayConditionedNotes,
  findRunwayQuickPick,
} from "../../lib/report/runwayConditionedNotes";
import { useOperatorProfile } from "./useOperatorProfile";
import { SegmentedControl } from "./ui/segmentedControl";

/**
 * The runway bands.
 *
 * It was the third hand-rolled version of one control: a `fieldset` with
 * `aria-pressed` and no keyboard movement at all, beside a cadence selector
 * using `aria-current` and a stage selector claiming `role="tablist"`. It reads
 * the shared radio group now, so the arrows work here too.
 */
const RunwayQuickPicks = ({
  activeMonths,
  onPick,
}: {
  activeMonths: number | undefined;
  onPick: (months: number) => void;
}) => {
  const active = findRunwayQuickPick(activeMonths);
  const options = RUNWAY_QUICK_PICKS.map((pick) => ({ key: pick.label, label: pick.label }));

  return (
    <SegmentedControl
      options={options}
      value={active?.label}
      onSelect={(label) => {
        const pick = RUNWAY_QUICK_PICKS.find((candidate) => candidate.label === label);
        if (pick) onPick(pick.months);
      }}
      ariaLabel="Cash runway"
    />
  );
};

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

  if (notes.length === 0) {
    return (
      <div id="runway-notes" className="space-y-1.5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="type-eyebrow text-slate-300">What this call means at your runway</p>
          {/* Deliberately nothing selected. The operator has not said what their
              runway is, and a default would be this panel inventing one — the
              same rule the note builder keeps ("a missing runway never reads
              like zero"). What was missing is not a default but the invitation
              below: the panel used to offer four unexplained buttons over a
              sentence about browser storage, so the first thing a reader was
              told about a control they had no reason to touch was where the
              value would be kept. */}
          <RunwayQuickPicks activeMonths={undefined} onPick={setRunway} />
        </div>
        <p className="text-fluid-nano text-slate-400">
          Pick a band and this week&rsquo;s call gains a line per decision it changes: which area
          protects runway fastest, and roughly how many months a 10% burn cut buys.
        </p>
        <p className="text-fluid-nano text-slate-500">
          Nothing leaves this browser, and the call above does not change; only the notes under it do.
        </p>
      </div>
    );
  }

  return (
    <div id="runway-notes" className="space-y-1.5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="type-eyebrow text-slate-300">
          What this call means at {profile.runwayMonths} months of runway
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <RunwayQuickPicks activeMonths={profile.runwayMonths} onPick={setRunway} />
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
        Your figures stay in this browser. These notes translate the call; the thresholds above are
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
