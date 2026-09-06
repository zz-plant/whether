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
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1">
        Calibrate Stage:
      </span>
      <div
        role="tablist"
        aria-label="Startup lifecycle stage selector"
        className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/80 p-1 backdrop-blur-sm"
      >
        {OPERATOR_STAGE_OPTIONS.map((option) => {
          const isSelected = selected === option.key;
          return (
            <button
              key={option.key}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => handleSelectStage(option.key)}
              title={`Tailor operating rules for ${option.label} (${option.sublabel})`}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-all ${
                isSelected
                  ? "border border-sky-500/40 bg-sky-500/15 font-semibold text-sky-200 shadow-sm"
                  : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
              }`}
            >
              <span>{option.label}</span>
              <span className="text-[10px] opacity-60 hidden sm:inline">· {option.sublabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
