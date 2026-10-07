import { Wallet } from "lucide-react";
import { HomeSection } from "./HomeSection";
import { AreaTable, type AreaRowData } from "../ui/areaTable";
import { StagePersonaSelector } from "../StagePersonaSelector";
import { RunwayPersonaSelector } from "../RunwayPersonaSelector";
import { RunwayAreaNote, RunwayConditionedNotes } from "../RunwayConditionedNotes";
import { CommitmentTestDisclosure } from "./CommitmentTest";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { HOME_SECTIONS, type HomeAreaRow } from "../../../lib/report/home/homeSectionModel";
import type { StartupVariantMode } from "../../../lib/report/boundedDecisionRules";
import type { RunwayBand } from "../../../lib/report/operatorRunway";
import type { RegimeKey } from "../../../lib/regimeEngine";
import { toRoute, type Route } from "../../../lib/navigation/routeType";

/**
 * Consequence, by area: the five areas in their fixed order, each with this
 * week's rule, its pause line and resume line with the distance to each, and
 * what the week's move changed for it. The Actions-this-week card folded into
 * the rule column; the runway notes sit under the row they concern once a
 * band is set. The stage and runway selectors head the table because they are
 * what the rules are written for — "which company", then the rules.
 *
 * No ladders here. The pause/resume rails that /operate draws over its rules
 * table were drawn here too, a section after "What changed" had drawn the same
 * two scores against the same lines (DD-039). Each row already prints its
 * lines and the distance to them, and refers up to those ladders.
 */
export function WhatItChangesSection({
  rows,
  regime,
  activeStage,
  activeRunway,
  runwayEmphasis,
  planHref,
  isHistorical,
}: {
  rows: readonly HomeAreaRow[];
  regime: RegimeKey;
  activeStage: StartupVariantMode;
  activeRunway?: RunwayBand;
  /** Which constraint binds this week — cash or the lines — once a band reshaped the rule. */
  runwayEmphasis?: string;
  planHref: Route;
  /** Live briefs only carry the operator's runway: it dates a company's cash position to today. */
  isHistorical: boolean;
}) {
  const tableRows: AreaRowData[] = rows.map((row) => ({
    area: row.area,
    rule: row.rule,
    pause: row.pause
      ? {
          line: row.pause.line,
          distance: row.pauseQualifier ? `${row.pause.distance} · also if ${row.pauseQualifier}` : row.pause.distance,
        }
      : undefined,
    resume: row.resume
      ? {
          line: row.resume.line,
          distance: row.resumeQualifier ? `${row.resume.distance} · only when ${row.resumeQualifier}` : row.resume.distance,
        }
      : undefined,
    scores: [row.pause?.metric, row.resume?.metric].filter((metric) => metric !== undefined),
    changed: row.changed,
    href: toRoute(`${planHref}#ops-monthly-action-summary`),
    note: isHistorical ? undefined : <RunwayAreaNote regime={regime} area={row.area} />,
  }));

  return (
    <HomeSection
      id={HOME_SECTIONS.consequences.id}
      heading={HOME_SECTIONS.consequences.heading}
      className="order-3"
    >
      {/* Stage and runway: the sm+ tablists. The header carries the phone pills,
          so one control per axis at every width. */}
      <div className={isHistorical && !runwayEmphasis ? "hidden sm:grid sm:gap-6" : "weather-section-stack"}>
        <div id="company-calibration" className={`${runwayEmphasis ? "" : "hidden sm:block"} rounded-xl border border-slate-800/80 bg-slate-950/40 weather-inset space-y-4`.trim()}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800/60 pb-4">
            <p className="type-eyebrow">Company calibration</p>
            <p className="text-fluid-nano text-slate-400">
              Calibrates pause and resume lines to your stage and cash runway
            </p>
          </div>
          <div className="hidden sm:grid sm:gap-4 weather-company-options">
            <StagePersonaSelector activeStage={activeStage} className="sm:grid sm:grid-cols-[6rem_minmax(0,1fr)]" />
            <RunwayPersonaSelector activeRunway={activeRunway} className="sm:grid sm:grid-cols-[6rem_minmax(0,1fr)]" />
          </div>
          {runwayEmphasis ? (
            <p data-testid="runway-emphasis" className="flex items-start gap-1.5 text-xs leading-snug text-amber-200/90 border-t border-slate-800/40 pt-2">
              <Wallet size={14} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
              <span>{runwayEmphasis}</span>
            </p>
          ) : null}
        </div>
        {isHistorical ? null : <RunwayConditionedNotes regime={regime} />}
      </div>

      <AreaTable
        rows={tableRows}
        caption={`${DECISION_CONTRACT_LABELS.action.actionNow}, ${DECISION_CONTRACT_LABELS.threshold.pauseIf} and ${DECISION_CONTRACT_LABELS.reversal.resumeWhen}, by area`}
      />
      {/* Live briefs only, like the runway notes: it reads today's cash. */}
      {isHistorical ? null : <CommitmentTestDisclosure regime={regime} />}
    </HomeSection>
  );
}
