import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";
import { TimeMachineCalendarPicker } from "../TimeMachineCalendarPicker";

type StepProps = { href: string | null; label: string; direction: "previous" | "next" };

/**
 * One end of the stepper. A live end is a key standing in the well; the end with no week
 * beyond it sinks flat and unlit (ui-ux-standards §XXVI), where it used to draw a faded copy
 * of the same box, which read as a key that had failed to load.
 */
const StepKey = ({ href, label, direction }: StepProps) => {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  if (!href) {
    return (
      <span className="weather-step-key" aria-disabled="true" title={`No ${direction} week`}>
        <Icon size={16} aria-hidden="true" />
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className="weather-step-key weather-hit-box no-underline">
      <Icon size={16} aria-hidden="true" />
    </Link>
  );
};

/**
 * The week stepper above the call: a well with the earlier and later week as keys at
 * either end and the calendar picker between them, so the three read as one control
 * rather than two buttons and a heading.
 */
export function WeekStepper({
  previousHref,
  nextHref,
  ...picker
}: {
  previousHref: string | null;
  nextHref: string | null;
} & ComponentProps<typeof TimeMachineCalendarPicker>) {
  return (
    <div className="weather-segment-track inline-flex items-center gap-1">
      <StepKey href={previousHref} label="Previous week" direction="previous" />
      {/* Navigation coverage stays unfiltered: an archived month is a filtered chart, not a
          filtered calendar. Passing the aligned series here removed every period after the
          archived month. */}
      <TimeMachineCalendarPicker {...picker} />
      <StepKey href={nextHref} label="Next week" direction="next" />
    </div>
  );
}
