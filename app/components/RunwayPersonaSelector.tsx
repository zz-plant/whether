"use client";

import { useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  DEFAULT_RUNWAY_BAND,
  RUNWAY_BAND_OPTIONS,
  type RunwayBand,
} from "../../lib/report/operatorRunway";
import { persistOperatorRunway } from "./useOperatorRunway";

interface RunwayPersonaSelectorProps {
  activeRunway?: RunwayBand;
  className?: string;
}

export function RunwayPersonaSelector({
  activeRunway,
  className = "",
}: RunwayPersonaSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = activeRunway ?? DEFAULT_RUNWAY_BAND;

  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const lastIndex = RUNWAY_BAND_OPTIONS.length - 1;
    let nextIndex: number | null = null;

    if (event.key === "ArrowLeft") nextIndex = (index - 1 + RUNWAY_BAND_OPTIONS.length) % RUNWAY_BAND_OPTIONS.length;
    else if (event.key === "ArrowRight") nextIndex = (index + 1) % RUNWAY_BAND_OPTIONS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = lastIndex;

    if (nextIndex === null) return;
    event.preventDefault();
    const nextBand = RUNWAY_BAND_OPTIONS[nextIndex]?.key;
    if (!nextBand) return;
    tabsRef.current[nextIndex]?.focus();
    handleSelectRunway(nextBand);
  };

  const handleSelectRunway = (band: RunwayBand) => {
    persistOperatorRunway(band);
    const params = new URLSearchParams(searchParams.toString());
    if (band === DEFAULT_RUNWAY_BAND) {
      params.delete("runway");
    } else {
      params.set("runway", band);
    }
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`);
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1">
        Calibrate Runway:
      </span>
      <div
        role="tablist"
        id="calibrate-runway"
        aria-label="Cash runway band selector"
        className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/80 p-1 backdrop-blur-sm"
      >
        {RUNWAY_BAND_OPTIONS.map((option, index) => {
          const isSelected = selected === option.key;
          return (
            <button
              key={option.key}
              type="button"
              role="tab"
              ref={(el) => {
                tabsRef.current[index] = el;
              }}
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onKeyDown={(event) => handleKeyDown(event, index)}
              onClick={() => handleSelectRunway(option.key)}
              title={`Tailor operating rules for ${option.label} cash runway (${option.sublabel})`}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-all ${
                isSelected
                  ? "border border-amber-500/40 bg-amber-500/15 font-semibold text-amber-200 shadow-sm"
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
