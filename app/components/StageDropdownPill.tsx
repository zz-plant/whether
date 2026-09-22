"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { StartupVariantMode } from "../../lib/report/boundedDecisionRules";
import {
  DEFAULT_OPERATOR_STAGE,
  OPERATOR_STAGE_OPTIONS,
  operatorStageForVariantMode,
  type OperatorStage,
} from "../../lib/report/operatorStage";
import { persistOperatorStage, useOperatorStage } from "./useOperatorStage";
import { HeaderChoicePill } from "./HeaderChoicePill";

interface StageDropdownPillProps {
  /**
   * The stage the server calibrated the page against. Left unset (the global
   * header mounts the pill with no page model in reach), the pill reads the
   * cookie itself, so an operator who chose Seed sees "Seed" here rather than
   * the default the brief below is no longer calibrated to.
   */
  activeStage?: StartupVariantMode;
  className?: string;
}

/** The stage choice at phone width. The control itself is `HeaderChoicePill`. */
export function StageDropdownPill({
  activeStage,
  className = "",
}: StageDropdownPillProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { stage: storedStage } = useOperatorStage();

  // The hook's server value is null, so the first render matches the server's
  // markup (the default) and the cookie's answer arrives through hydration.
  const selectedStageKey = activeStage
    ? operatorStageForVariantMode(activeStage)
    : storedStage ?? DEFAULT_OPERATOR_STAGE;

  const handleSelectStage = (stage: OperatorStage) => {
    persistOperatorStage(stage);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (stage === DEFAULT_OPERATOR_STAGE) {
      params.delete("stage");
    } else {
      params.set("stage", stage);
    }
    const query = params.toString();
    // `replace`, like the sm+ selector for the same setting: this is the same
    // choice at a different width, and the two must not disagree about Back.
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  return (
    <HeaderChoicePill
      label="Stage"
      options={OPERATOR_STAGE_OPTIONS}
      value={selectedStageKey}
      onSelect={handleSelectStage}
      className={className}
    />
  );
}
