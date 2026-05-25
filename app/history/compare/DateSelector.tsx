"use client";

import { useRouter, useSearchParams } from "next/navigation";

export interface DateOption {
  year: number;
  month: number;
  label: string;
}

interface DateSelectorProps {
  label: string;
  paramPrefix: string;
  options: DateOption[];
  currentYear: number;
  currentMonth: number;
}

export function DateSelector({
  label,
  paramPrefix,
  options,
  currentYear,
  currentMonth,
}: DateSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (val) {
      const [year, month] = val.split("-");
      params.set(`year${paramPrefix}`, year);
      params.set(`month${paramPrefix}`, month);
    } else {
      params.delete(`year${paramPrefix}`);
      params.delete(`month${paramPrefix}`);
    }
    router.push(`/history/compare?${params.toString()}`);
  };

  const val = currentYear && currentMonth ? `${currentYear}-${currentMonth}` : "";

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </label>
      <select
        value={val}
        onChange={handleChange}
        className="weather-input min-h-[44px] w-full px-3 py-2 text-sm bg-slate-950 text-slate-100 border border-slate-800 rounded-md focus:border-sky-500 focus:outline-none cursor-pointer"
      >
        <option value="">Latest (Current week)</option>
        {options.map((opt) => (
          <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
