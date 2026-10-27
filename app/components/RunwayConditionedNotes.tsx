"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RegimeKey } from "../../lib/regimeEngine";
import type { DecisionArea } from "../../lib/report/boundedDecisionRules";
import { netMonthlyBurnUsd, resolveProfileRunway, resolveProfileRunwayMonths } from "../../lib/operatorProfile";
import { HOME_SECTIONS } from "../../lib/report/home/homeSectionModel";
import { DEFAULT_RUNWAY_BAND, runwayBandLabel } from "../../lib/report/operatorRunway";
import { buildRunwayConditionedNotes, resolveRunwayForNotes } from "../../lib/report/runwayConditionedNotes";
import { useOperatorProfile } from "./useOperatorProfile";
import { persistOperatorRunway, useOperatorRunway } from "./useOperatorRunway";

/*
 * One runway setting, read here rather than chosen here.
 *
 * This panel carried its own four-band picker ("Under 6 · 6–12 · 12–18 ·
 * 18+ mo") directly under the header's and the section's ("<6 · 6–12 · 12–24 ·
 * 24+ mo"): two controls for the same fact, with different bands, stored in two
 * places, neither updating the other. A reader who picked 12–18 here left the
 * guidance above calibrated to whatever the header said. The band control (the
 * calibration section's selector at sm+, the header pill on a phone) is now the
 * only one, and an exact figure entered on /operate moves it.
 */
const useRunwayNotes = (regime: RegimeKey) => {
  const { profile } = useOperatorProfile();
  const { runwayBand } = useOperatorRunway();
  const runway = useMemo(
    () => resolveRunwayForNotes({ exactMonths: resolveProfileRunwayMonths(profile), band: runwayBand }),
    [profile, runwayBand],
  );
  const notes = useMemo(
    () => (runway ? buildRunwayConditionedNotes({ regime, ...runway, netMonthlyBurnUsd: netMonthlyBurnUsd(profile) }) : []),
    [regime, runway, profile],
  );
  // A company whose revenue covers its spending reads as the open-ended band, not as an exact figure,
  // but its figures are entered all the same.
  const figuresGiven = useMemo(() => resolveProfileRunway(profile) !== null, [profile]);
  return { runway, notes, figuresGiven };
};

/** Back to no runway given: the band cookie, the `?runway` param and an entered figure all go. */
function ClearRunwayButton() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setProfileField } = useOperatorProfile();
  return (
    <button
      type="button"
      onClick={() => {
        // Clears a cash figure too: with no band, any runway it implies goes.
        persistOperatorRunway(null);
        setProfileField("runwayMonths", undefined);
        const params = new URLSearchParams(searchParams?.toString() ?? "");
        params.delete("runway");
        const query = params.toString();
        router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
      }}
      className="inline-flex min-h-[44px] sm:min-h-9 items-center rounded-sm px-2 text-fluid-micro text-slate-400 underline decoration-slate-600 underline-offset-4 hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
    >
      Clear
    </button>
  );
}

/**
 * The weekly call, conditioned on the operator's own runway.
 *
 * The canonical call is server-rendered and company-agnostic; this reads the
 * chosen band (or an exact figure) after mount. A missing runway never reads as
 * one, and the brief stays canonical for every other reader of the same URL.
 * The notes themselves sit under the rule for the area they concern
 * (`RunwayAreaNote`); this is the heading and the invitation.
 */
export function RunwayConditionedNotes({ regime }: { regime: RegimeKey }) {
  const { runway, figuresGiven } = useRunwayNotes(regime);

  if (!runway) {
    return (
      <div id="runway-notes" className="space-y-1.5">
        <p className="type-eyebrow text-slate-300">What this guidance means at your runway</p>
        {/* The control is not here. It shows the default until a reader
            chooses, so this says so rather than letting the default read as an
            answer the reader gave. A link rather than "above": these notes sit
            in the area rules, and the calibration section follows them on a
            wide screen while a phone's control is the header pill. The anchor
            opens the section at every width (`AnchorFeedback`). */}
        <p className="text-fluid-nano text-slate-400">
          Showing {runwayBandLabel(DEFAULT_RUNWAY_BAND)} until you{" "}
          <a href={`#${HOME_SECTIONS.calibration.id}`} className="text-[var(--accent-action)] underline underline-offset-4">
            pick your cash runway
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div id="runway-notes" className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="type-eyebrow text-slate-300">What this guidance means at {runway.runwayPhrase} of runway</p>
        <ClearRunwayButton />
      </div>
      <p className="text-fluid-nano text-slate-500">
        Your figures stay in this browser. These notes translate the guidance; the thresholds above are
        unchanged.{" "}
        <Link href="/operate/financial#ops-runway-inputs" className="text-slate-400 underline decoration-slate-600 underline-offset-4 hover:text-slate-200">
          {runway.runwayIsExact || figuresGiven ? "Change your cash, spend and revenue" : "Enter your cash, spend and revenue"}
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
    <p
      data-testid="runway-area-note"
      className="mt-1.5 flex items-start gap-1.5 rounded border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-xs leading-snug text-amber-200/95"
    >
      <span className="shrink-0 rounded bg-amber-400/20 px-1 py-0.5 text-fluid-nano font-bold uppercase tracking-wider text-amber-300">
        Runway
      </span>
      <span>{note.note}</span>
    </p>
  );
}
