import { Wallet } from "lucide-react";
import { StagePersonaSelector } from "../StagePersonaSelector";
import { RunwayPersonaSelector } from "../RunwayPersonaSelector";
import { HOME_SECTIONS } from "../../../lib/report/home/homeSectionModel";
import type { StartupVariantMode } from "../../../lib/report/boundedDecisionRules";
import type { RunwayBand } from "../../../lib/report/operatorRunway";

/**
 * Whose lines these are, under the verdict (2026-10-09).
 *
 * The stage and runway controls sat in "What that changes for you", the eighth
 * thing on the page, under the area answers they rescale, and the picker above
 * carried a "Change" link down to them. They lead the areas now, as one sentence
 * and two compact tablists, and nothing lower on the page repeats them.
 *
 * One control per axis at every width: the tablists show from `sm` up, and on a
 * phone the header's stage and runway pills are the control, so the sentence
 * stands alone there.
 */
export function CompanyCalibration({
  stageLabel,
  runwayPhrase,
  chosen,
  activeStage,
  activeRunway,
  runwayEmphasis,
  stageAction,
}: {
  stageLabel: string;
  runwayPhrase: string;
  /** False while the reader is on the defaults, which the sentence says. */
  chosen: boolean;
  activeStage: StartupVariantMode;
  activeRunway?: RunwayBand;
  /** Which constraint binds this week — cash or the lines — once a band reshaped the rule. */
  runwayEmphasis?: string;
  /** The chosen stage's own action; only for a reader who chose one, as a stage line under the headline. */
  stageAction?: string;
}) {
  return (
    <section
      id={HOME_SECTIONS.calibration.id}
      aria-label="Your stage and runway"
      className="space-y-3 border-t border-slate-800/70 pt-4"
    >
      <p className="text-fluid-sm text-slate-200" data-calibration-note>
        Lines set for <span className="font-semibold text-white">{stageLabel}</span> with{" "}
        <span className="font-semibold text-white">{runwayPhrase}</span> of runway{chosen ? "." : " (the defaults)."}
      </p>
      <div className="hidden sm:grid sm:gap-3 weather-company-options">
        <StagePersonaSelector activeStage={activeStage} className="sm:grid sm:grid-cols-[6rem_minmax(0,1fr)]" />
        <RunwayPersonaSelector activeRunway={activeRunway} className="sm:grid sm:grid-cols-[6rem_minmax(0,1fr)]" />
      </div>
      {stageAction ? (
        <p className="text-fluid-xs text-slate-300" data-stage-action>
          <span className="font-semibold text-slate-100">At {stageLabel}:</span> {stageAction}
        </p>
      ) : null}
      {runwayEmphasis ? (
        <p data-testid="runway-emphasis" className="flex items-start gap-1.5 text-xs leading-snug text-amber-200/90">
          <Wallet size={14} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
          <span>{runwayEmphasis}</span>
        </p>
      ) : null}
    </section>
  );
}
