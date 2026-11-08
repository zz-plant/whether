import type { ComponentProps } from "react";
import { WeekStepper } from "./WeekStepper";

type WeekStepperProps = ComponentProps<typeof WeekStepper>;

/**
 * The archived-month stepper above the call: one control, kept out of `app/page.tsx` so
 * the page reads as orchestration rather than a second copy of the stepper's props.
 */
export function PeriodControl({
  previousHref,
  nextHref,
  nextLabel,
  currentDateLabel,
  isHistorical,
  history,
}: Pick<WeekStepperProps, "previousHref" | "nextHref" | "currentDateLabel" | "isHistorical" | "history"> & {
  nextLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
      <WeekStepper
        previousHref={previousHref}
        nextHref={nextHref}
        previousLabel="Previous month"
        nextLabel={nextLabel}
        currentDateLabel={currentDateLabel}
        isHistorical={isHistorical}
        history={history}
      />
    </div>
  );
}
