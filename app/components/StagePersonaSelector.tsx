"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { StartupVariantMode } from "../../lib/report/boundedDecisionRules";
import {
  DEFAULT_OPERATOR_STAGE,
  OPERATOR_STAGE_OPTIONS,
  operatorStageForVariantMode,
  type OperatorStage,
  type OperatorStageOption,
} from "../../lib/report/operatorStage";
import { persistOperatorStage } from "./useOperatorStage";
import { SegmentGroup } from "./ui/segmentGroup";

export type StagePersonaOption = OperatorStageOption;

/** The four stages, from the one module every stage control reads. */
export const STAGE_PERSONA_OPTIONS = OPERATOR_STAGE_OPTIONS;

export interface StagePersonaSelectorProps {
  activeStage: StartupVariantMode;
  className?: string;
}

export function StagePersonaSelector({
  activeStage,
  className = "",
}: StagePersonaSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = operatorStageForVariantMode(activeStage);

  const handleSelectStage = (stage: OperatorStage) => {
    // The cookie is what makes the choice survive this page: the settings panel,
    // the runway planner, and the stress tests all read it, and the server
    // renders the next visit from it. The URL still carries it for shared links.
    persistOperatorStage(stage);
    const params = new URLSearchParams(searchParams.toString());
    if (stage === DEFAULT_OPERATOR_STAGE) {
      params.delete("stage");
    } else {
      params.set("stage", stage);
    }
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`);
  };

  return (
    <div id="calibrate-stage" className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`}>
      {/* Sentence case, and no colon. Uppercase is the page's section-header
          voice; a control label inside a card borrowing it made the card read
          as a new section every time one appeared. */}
      <span className="text-fluid-nano font-medium text-slate-400">Stage</span>
      <SegmentGroup
        options={OPERATOR_STAGE_OPTIONS.map((option) => ({
          key: option.key,
          label: option.label,
          sublabel: option.sublabel,
          title: `Tailor operating rules for ${option.label} (${option.sublabel})`,
        }))}
        activeKey={selected}
        onSelect={(key) => {
          const option = OPERATOR_STAGE_OPTIONS.find((entry) => entry.key === key);
          if (option) handleSelectStage(option.key);
        }}
        ariaLabel="Startup lifecycle stage"
      />
    </div>
  );
}
