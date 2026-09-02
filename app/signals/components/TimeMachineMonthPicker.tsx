import type { RefObject } from "react";
import { Field } from "@base-ui/react/field";
import { Popover } from "@base-ui/react/popover";

type MonthOption = {
  value: number;
  label: string;
};

type TimeMachineMonthPickerProps = {
  calendarMonths: number[];
  calendarYear: number;
  coverageMax?: string;
  coverageMin?: string;
  errorId: string;
  isInvalid: boolean;
  maxYear: number;
  minYear: number;
  month: number;
  monthOptions: ReadonlyArray<MonthOption>;
  monthRef: RefObject<HTMLButtonElement | null>;
  onCalendarYearChange: (nextYear: number) => void;
  onSelectMonth: (nextYear: number, nextMonth: number) => void;
  onUnavailableSelection: () => void;
  selectedLabel: string;
  year: number;
};

const yearStepperButtonClass =
  "weather-button inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center px-0 py-0 text-xs font-semibold text-slate-300 disabled:cursor-not-allowed disabled:border-slate-800/70 disabled:text-slate-400";

const monthOptionBaseClass =
  "inline-flex min-h-[44px] items-center justify-center rounded-md border px-2 py-2 text-fluid-xs font-semibold tracking-[0.12em] transition-colors";

export const TimeMachineMonthPicker = ({
  calendarMonths,
  calendarYear,
  coverageMax,
  coverageMin,
  errorId,
  isInvalid,
  maxYear,
  minYear,
  month,
  monthOptions,
  monthRef,
  onCalendarYearChange,
  onSelectMonth,
  onUnavailableSelection,
  selectedLabel,
  year,
}: TimeMachineMonthPickerProps) => (
  <Field.Root className="space-y-2 text-xs font-semibold tracking-[0.12em] text-slate-300">
    <Field.Label>Month</Field.Label>
    <Popover.Root>
      <Popover.Trigger
        ref={monthRef}
        id="time-machine-month"
        type="button"
        aria-invalid={isInvalid}
        aria-describedby={isInvalid ? errorId : undefined}
        className="weather-input inline-flex min-h-[44px] w-full items-center justify-between gap-3 px-3 py-2 text-base transition-colors hover:border-sky-500/70"
      >
        <span>{selectedLabel}</span>
        <span className="text-xs text-slate-400">Pick month</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={10}>
          <Popover.Popup className="weather-panel-static w-72 rounded-lg border border-slate-800/80 bg-slate-950/95 p-4 text-xs text-slate-300 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onCalendarYearChange(Math.max(minYear, calendarYear - 1))}
                disabled={calendarYear <= minYear}
                className={yearStepperButtonClass}
              >
                ‹
              </button>
              <div className="text-center">
                <p className="type-label text-slate-400">Calendar year</p>
                <span className="mt-1 block text-sm font-semibold text-slate-100">{calendarYear}</span>
              </div>
              <button
                type="button"
                onClick={() => onCalendarYearChange(Math.min(maxYear, calendarYear + 1))}
                disabled={calendarYear >= maxYear}
                className={yearStepperButtonClass}
              >
                ›
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {monthOptions.map((option) => {
                const isAvailable = calendarMonths.length > 0 && calendarMonths.includes(option.value);
                const isActive = calendarYear === year && option.value === month;

                return (
                  <Popover.Close
                    key={`${calendarYear}-${option.value}`}
                    type="button"
                    onClick={() => {
                      if (isAvailable) {
                        onSelectMonth(calendarYear, option.value);
                      } else {
                        onUnavailableSelection();
                      }
                    }}
                    disabled={!isAvailable}
                    className={`${monthOptionBaseClass} ${
                      isActive
                        ? "border-sky-400/70 bg-sky-500/12 text-slate-100 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.08)]"
                        : "border-slate-800/70 bg-slate-950/55 text-slate-300"
                    } ${
                      isAvailable
                        ? "hover:border-sky-400/70 hover:text-slate-100"
                        : "cursor-not-allowed bg-slate-950/20 text-slate-400"
                    }`}
                  >
                    {option.label.slice(0, 3)}
                  </Popover.Close>
                );
              })}
            </div>
            <div className="weather-surface mt-3 rounded-md px-3 py-2">
              <p className="type-label text-slate-400">Available range</p>
              <p className="mt-1 text-fluid-xs text-slate-300">
                {coverageMin && coverageMax ? `${coverageMin} → ${coverageMax}` : "No cache loaded yet."}
              </p>
            </div>
            <Popover.Arrow className="h-3 w-3 translate-y-[1px] rotate-45 rounded-[3px] bg-slate-950/95" />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  </Field.Root>
);
