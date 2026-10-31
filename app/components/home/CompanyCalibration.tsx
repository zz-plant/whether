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
 * One control per axis at every width: the tablists show from `sm` up, and on a
 * phone the header's stage and runway pills are the control.
 *
 * Since 2026-10-14 the two tablists fold under one sentence, "Rules for a
 * Series A company with 12–24 months of runway · Change". The 2026-10-09 rule
 * against a sentence over them held while both were always open, because the
 * sentence restated what sat directly beneath it; folded, the sentence is the
 * only statement of whose rules these are. On a phone the section prints only
 * when it has a stage action or a runway note to show, since its controls live
 * in the header.
 */
export function CompanyCalibration({
  stageLabel,
  activeStage,
  activeRunway,
  runwayEmphasis,
  stageAction,
}: {
  /** The chosen stage's name, for the stage line. */
  stageLabel: string;
  activeStage: StartupVariantMode;
  activeRunway?: RunwayBand;
  /** Which constraint binds this week — cash or the lines — once a band reshaped the rule. */
  runwayEmphasis?: string;
  /** The chosen stage's own action; only for a reader who chose one, as a stage line under the headline. */
  stageAction?: string;
}) {
  const hasNote = Boolean(stageAction || runwayEmphasis);
  return (
    <section
      id={HOME_SECTIONS.calibration.id}
      aria-label="Your stage and runway"
      /* Below `sm` the header's pills carry the choices, so the section hides when it
         has no note. A link that targets it (the shared-arrival greeting's "Scale it
         to your stage and runway") shows it and its controls at every width. */
      className={`group/calibration space-y-3 border-t border-[color:var(--border-subtle)] pt-4 target:block ${hasNote ? "" : "max-sm:hidden"}`.trim()}
    >
      {/* Folded to one line (2026-10-14). The two four-key rows stood between
          the call and "What are you deciding?", so the first thing asked of a
          reader was to configure the page. The line says whose rules these are,
          which is the part every reader needs; the keys are one click away. */}
      <details className="group block group-target/calibration:block" data-company-calibration>
        <summary className="weather-hit cursor-pointer list-none text-fluid-xs text-slate-300 [&::-webkit-details-marker]:hidden">
          {/* One span: the site's summary rule lays its children out as a flex row, which spread the sentence's words across the line. */}
          <span>
            Rules for a <span className="font-semibold text-slate-100">{stageLabel}</span> company with{" "}
            <span className="font-semibold text-slate-100">{runwayBandPhrase(activeRunway ?? DEFAULT_RUNWAY_BAND)}</span> of runway
            <span aria-hidden="true"> · </span>
            <span className="text-[var(--accent-action)] underline underline-offset-4 group-open:hidden">Change</span>
            <span className="hidden text-[var(--accent-action)] underline underline-offset-4 group-open:inline">Done</span>
          </span>
        </summary>
        <div className="mt-3 grid gap-3 weather-company-options">
          <StagePersonaSelector activeStage={activeStage} className="sm:grid sm:grid-cols-[6rem_minmax(0,1fr)]" />
          <RunwayPersonaSelector activeRunway={activeRunway} className="sm:grid sm:grid-cols-[6rem_minmax(0,1fr)]" />
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
