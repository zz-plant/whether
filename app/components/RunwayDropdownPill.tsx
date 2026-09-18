"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import {
  DEFAULT_RUNWAY_BAND,
  RUNWAY_BAND_OPTIONS,
  type RunwayBand,
} from "../../lib/report/operatorRunway";
import { persistOperatorRunway, useOperatorRunway } from "./useOperatorRunway";

interface RunwayDropdownPillProps {
  /**
   * The band the server calibrated the page against. Left unset (the global
   * header mounts the pill with no page model in reach), the pill reads the
   * cookie itself, so a returning operator sees the band they chose rather
   * than the default.
   */
  activeRunway?: RunwayBand;
  className?: string;
}

export function RunwayDropdownPill({
  activeRunway,
  className = "",
}: RunwayDropdownPillProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { runwayBand: storedRunway } = useOperatorRunway();

  const selectedRunwayKey = activeRunway ?? storedRunway ?? DEFAULT_RUNWAY_BAND;
  const selectedOption = RUNWAY_BAND_OPTIONS.find((opt) => opt.key === selectedRunwayKey) ?? RUNWAY_BAND_OPTIONS[2];

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && event.target instanceof Node && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectRunway = (band: RunwayBand) => {
    persistOperatorRunway(band);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (band === DEFAULT_RUNWAY_BAND) {
      params.delete("runway");
    } else {
      params.set("runway", band);
    }
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Current cash runway: ${selectedOption.label}. Tap to change runway`}
        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-200 shadow-sm backdrop-blur-md transition-colors hover:border-teal-500/40 hover:bg-slate-800/80 hover:text-white focus-visible:outline-2 focus-visible:outline-teal-400"
      >
        <span>{selectedOption.label}</span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label="Select cash runway band"
          className="absolute right-0 z-50 mt-1.5 w-52 origin-top-right rounded-xl border border-slate-800/90 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur-xl ring-1 ring-white/5 focus:outline-none"
        >
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Cash Runway
          </div>
          {RUNWAY_BAND_OPTIONS.map((option) => {
            const isSelected = selectedRunwayKey === option.key;
            return (
              <button
                key={option.key}
                type="button"
                role="menuitem"
                onClick={() => handleSelectRunway(option.key)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                  isSelected
                    ? "bg-teal-500/15 font-semibold text-teal-300"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <div>
                  <div>{option.label}</div>
                  <div className="text-[10px] text-slate-400">{option.sublabel}</div>
                </div>
                {isSelected ? <Check size={14} className="text-teal-400 shrink-0 ml-2" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
