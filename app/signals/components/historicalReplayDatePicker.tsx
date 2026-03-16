"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type HistoricalReplayDatePickerProps = {
  initialDate: string;
  submitHash?: string;
  forceAdvanced?: boolean;
  submitLabel?: string;
};

const toMonthStart = (value: string) => {
  const [year, month] = value.split("-");
  if (!year || !month) {
    return null;
  }
  return { year, month };
};

export const HistoricalReplayDatePicker = ({
  initialDate,
  submitHash,
  forceAdvanced = true,
  submitLabel = "Replay mandate",
}: HistoricalReplayDatePickerProps) => {
  const [value, setValue] = useState(initialDate);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = toMonthStart(value);
        if (!parsed) {
          return;
        }
        const params = new URLSearchParams(searchParams.toString());
        params.set("year", parsed.year);
        params.set("month", String(Number(parsed.month)));
        if (forceAdvanced) {
          params.set("advanced", "1");
        } else {
          params.delete("advanced");
        }
        const hash = submitHash ?? "#time-machine";
        router.push(`${pathname}?${params.toString()}${hash}` as Parameters<typeof router.push>[0]);
      }}
    >
      <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
        Replay date
        <input
          type="date"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="weather-control rounded-md border-slate-700 bg-slate-900"
        />
      </label>
      <button
        type="submit"
        className="weather-button-primary inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.12em]"
      >
        {submitLabel}
      </button>
    </form>
  );
};
