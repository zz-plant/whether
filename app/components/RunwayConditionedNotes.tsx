"use client";

import { useMemo } from "react";
import type { RegimeKey } from "../../lib/regimeEngine";
import { decisionAreaLabel } from "../../lib/report/boundedDecisionRules";
import { buildRunwayConditionedNotes } from "../../lib/report/runwayConditionedNotes";
import { useOperatorProfile } from "./useOperatorProfile";

/**
 * The weekly call, conditioned on the operator's own runway.
 *
 * The canonical call is server-rendered and company-agnostic; this panel reads
 * the browser-local operator profile after mount and adds translation-only
 * notes beneath it. It renders nothing until the operator has given a runway
 * figure — a missing number never reads as zero, and the brief stays canonical
 * for every other reader of the same URL.
 */
export function RunwayConditionedNotes({ regime }: { regime: RegimeKey }) {
  const { profile } = useOperatorProfile();
  const notes = useMemo(
    () =>
      buildRunwayConditionedNotes({
        regime,
        runwayMonths: profile.runwayMonths,
        monthlyBurnUsd: profile.monthlyBurnUsd,
      }),
    [regime, profile.runwayMonths, profile.monthlyBurnUsd],
  );

  if (notes.length === 0) return null;

  return (
    <aside
      aria-label="Notes conditioned on your runway"
      className="weather-panel mt-4 space-y-2 px-5 py-4"
    >
      <p className="type-eyebrow text-slate-300">Conditioned on your runway — {profile.runwayMonths} months</p>
      <ul className="space-y-1.5 text-fluid-xs text-slate-300">
        {notes.map((note) => (
          <li key={note.area}>
            <span className="font-semibold text-slate-200">{decisionAreaLabel(note.area)}:</span> {note.note}
          </li>
        ))}
      </ul>
      <p className="text-fluid-nano text-slate-500">
        Your figures stay in this browser. These notes translate the call; the thresholds above are unchanged.
      </p>
    </aside>
  );
}
