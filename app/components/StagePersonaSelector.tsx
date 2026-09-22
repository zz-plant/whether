"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { StartupVariantMode } from "../../lib/report/boundedDecisionRules";
import {
  DEFAULT_OPERATOR_STAGE,
  OPERATOR_STAGE_OPTIONS,
  operatorStageForVariantMode,
  type OperatorStage,
} from "../../lib/report/operatorStage";
import { persistOperatorStage } from "./useOperatorStage";
import { SegmentedControl, type SegmentedOption } from "./ui/segmentedControl";

/** The four stages, from the one module every stage control reads. */
export const STAGE_PERSONA_OPTIONS = OPERATOR_STAGE_OPTIONS;

interface StagePersonaSelectorProps {
  activeStage: StartupVariantMode;
  className?: string;
}

/**
 * Which kind of company the operating rules are written for.
 *
 * It used to declare `role="tablist"` with `aria-selected`, which promises tab
 * panels this control does not have, while the cadence selector beside it — the
 * same control, drawn the same way — declared a `fieldset` with `aria-current`.
 * Both are now the shared radio group, which is what picking one of four
 * actually is.
 *
 * `replace`, not `push`, for the same reason the cadence selector uses it:
 * naming your stage is a setting, and it used to take four Back presses to
 * leave a page after trying the four options.
 *
 * The label is "Stage", not "Calibrate Stage". Nothing is being calibrated —
 * the reader is saying which company they run — and the header pill that offers
 * the same choice on a phone has always just said the stage's name.
 */
export function StagePersonaSelector({
  activeStage,
  className = "",
}: StagePersonaSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = operatorStageForVariantMode(activeStage);

  const options: readonly SegmentedOption<OperatorStage>[] = OPERATOR_STAGE_OPTIONS.map((option) => ({
    key: option.key,
    label: option.label,
    sublabel: option.sublabel,
    title: `Rules for a ${option.label} company (${option.sublabel.toLowerCase()})`,
  }));

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
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Stage
      </span>
      <SegmentedControl
        options={options}
        value={selected}
        onSelect={handleSelectStage}
        ariaLabel="Company stage"
      />
    </div>
  );
}
