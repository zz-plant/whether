"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Hourglass } from "lucide-react";
import { StagePersonaSelector } from "../StagePersonaSelector";
import { RunwayPersonaSelector } from "../RunwayPersonaSelector";
import { HOME_SECTIONS } from "../../../lib/report/home/homeSectionModel";
import type { StartupVariantMode } from "../../../lib/report/boundedDecisionRules";
import { DEFAULT_RUNWAY_BAND, runwayBandPhrase, type RunwayBand } from "../../../lib/report/operatorRunway";

/**
 * Whose lines these are, under the verdict (2026-10-09).
 *
 * The stage and runway controls sat in "What that changes for you", the eighth
 * thing on the page, under the area answers they rescale, and the picker above
 * carried a "Change" link down to them. They lead the areas now, as one sentence
 * and two compact tablists, and nothing lower on the page repeats them.
 *
 * Since 2026-10-14 the two tablists fold under one sentence, "Rules for a
 * Series A company with 12–24 months of runway · Change". Since 2026-10-31 the
 * section renders at every width (the mobile header pills were removed), and
 * clicking the card's stage/runway chip (`#your-stage-and-runway`) opens the
 * disclosure automatically so the reader is not asked to click twice.
 */
export function CompanyCalibration({
  stageLabel,
  activeStage,
  activeRunway,
  runwayEmphasis,
  stageAction,
  horizon,
}: {
  /** The chosen stage's name, for the stage line. */
  stageLabel: string;
  activeStage: StartupVariantMode;
  activeRunway?: RunwayBand;
  /** Which constraint binds this week — cash or the lines — once a band reshaped the rule. */
  runwayEmphasis?: string;
  /** The chosen stage's own action; only for a reader who chose one, as a stage line under the headline. */
  stageAction?: string;
  /**
   * The plan-horizon control, folded here with the other settings (2026-11-03). It sat
   * beside Copy Brief on the card, so every reading of the call passed a control that
   * is set once; setup lives in one place now, one click from the card's chip.
   */
  horizon?: ReactNode;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const targetHash = `#${HOME_SECTIONS.calibration.id}`;
    const openIfTargeted = () => {
      if (window.location.hash === targetHash && detailsRef.current) {
        detailsRef.current.open = true;
      }
    };
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest(`a[href="${targetHash}"]`) : null;
      if (target && detailsRef.current) {
        detailsRef.current.open = true;
      }
    };
    openIfTargeted();
    window.addEventListener("hashchange", openIfTargeted);
    document.addEventListener("click", handleDocumentClick);
    return () => {
      window.removeEventListener("hashchange", openIfTargeted);
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  return (
    <section
      id={HOME_SECTIONS.calibration.id}
      aria-label="Your stage and runway"
      className="group/calibration space-y-3 border-t border-[color:var(--border-subtle)] pt-4 target:block"
    >
      {/* Folded to one line (2026-10-14). The two four-key rows stood between
          the call and "What are you deciding?", so the first thing asked of a
          reader was to configure the page. The line says whose rules these are,
          which is the part every reader needs; the keys are one click away. */}
      <details ref={detailsRef} className="group block group-target/calibration:block" data-company-calibration>
        <summary className="weather-hit cursor-pointer list-none text-fluid-xs text-slate-300 [&::-webkit-details-marker]:hidden">
          {/* One span: the site's summary rule lays its children out as a flex row, which spread the sentence's words across the line. */}
          <span>
            Rules for a <span className="font-semibold text-slate-100">{stageLabel}</span> company with{" "}
            <span className="font-semibold text-slate-100">{runwayBandPhrase(activeRunway ?? DEFAULT_RUNWAY_BAND)}</span> of runway
            <span aria-hidden="true"> · </span>
            <span className="text-[var(--accent-action)] underline underline-offset-4 group-open:hidden">{horizon ? "Change settings" : "Change stage and runway"}</span>
            <span className="hidden text-[var(--accent-action)] underline underline-offset-4 group-open:inline">Done</span>
          </span>
        </summary>
        <div className="mt-3 grid gap-3 weather-company-options">
          <StagePersonaSelector activeStage={activeStage} className="sm:grid sm:grid-cols-[6rem_minmax(0,1fr)]" />
          <RunwayPersonaSelector activeRunway={activeRunway} className="sm:grid sm:grid-cols-[6rem_minmax(0,1fr)]" />
          {horizon ? (
            <div className="flex flex-wrap items-center gap-1.5 sm:grid sm:grid-cols-[6rem_minmax(0,1fr)]" data-plan-horizon>
              <span className="type-eyebrow mr-1">Plan horizon</span>
              {horizon}
            </div>
          ) : null}
          <p className="text-fluid-nano text-slate-400">
            Your stage and runway set when each area pauses and what it allows.
          </p>
        </div>
      </details>
      {stageAction ? (
        <p className="text-fluid-xs text-slate-300" data-stage-action>
          <span className="font-semibold text-slate-100">At {stageLabel}:</span> {stageAction}
        </p>
      ) : null}
      {runwayEmphasis ? (
        <p data-testid="runway-emphasis" className="flex items-start gap-1.5 text-xs leading-snug text-amber-200/90">
          {/* An hourglass for runway: the wallet is Spending's glyph. */}
          <Hourglass size={14} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
          <span>{runwayEmphasis}</span>
        </p>
      ) : null}
    </section>
  );
}
