"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type RegimePlaybackScrubberProps = {
  entries: Array<{ label: string; regime: string }>;
  activeIndex: number;
  queryKey?: string;
};

export const RegimePlaybackScrubber = ({
  entries,
  activeIndex,
  queryKey = "playback",
}: RegimePlaybackScrubberProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(activeIndex);
  const [isPending, startTransition] = useTransition();
  const maxIndex = Math.max(entries.length - 1, 0);
  const safeValue = Math.min(Math.max(value, 0), maxIndex);
  const selectedEntry = entries[safeValue];

  useEffect(() => {
    setValue(activeIndex);
  }, [activeIndex]);

  const pushValue = (nextValue: number) => {
    const clamped = Math.min(Math.max(nextValue, 0), maxIndex);
    const params = new URLSearchParams(searchParams.toString());
    if (clamped === maxIndex) {
      params.delete(queryKey);
    } else {
      params.set(queryKey, String(clamped));
    }
    const query = params.toString();
    const href = query ? `${pathname}?${query}#signal-diagnostics` : `${pathname}#signal-diagnostics`;
    startTransition(() => {
      router.replace(href as Parameters<typeof router.replace>[0], { scroll: false });
    });
  };

  if (entries.length <= 1) {
    return <p className="text-xs text-slate-400">Playback requires at least 2 historical points.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-[0.12em] text-slate-300">
          Selected: {selectedEntry?.label ?? "N/A"} · {selectedEntry?.regime ?? "Unknown"}
        </p>
        {isPending ? <p className="text-xs text-slate-400">Applying…</p> : null}
      </div>
      <input
        type="range"
        min={0}
        max={maxIndex}
        step={1}
        value={safeValue}
        onChange={(event) => setValue(Number(event.target.value))}
        className="h-2 w-full cursor-pointer touch-manipulation accent-sky-300"
        aria-label="Historical playback scrubber"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-slate-500">{entries[0]?.label}</p>
        <p className="text-[11px] text-slate-500">{entries[maxIndex]?.label}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            const next = Math.max(safeValue - 1, 0);
            setValue(next);
            pushValue(next);
          }}
          disabled={safeValue <= 0 || isPending}
          className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => pushValue(safeValue)}
          disabled={safeValue === activeIndex || isPending}
          className="weather-button inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply month
        </button>
        <button
          type="button"
          onClick={() => {
            const next = Math.min(safeValue + 1, maxIndex);
            setValue(next);
            pushValue(next);
          }}
          disabled={safeValue >= maxIndex || isPending}
          className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};
