"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { StartupVariantMode } from "../../lib/report/boundedDecisionRules";

export interface StagePersonaOption {
  key: StartupVariantMode;
  label: string;
  sublabel: string;
}

export const STAGE_PERSONA_OPTIONS: StagePersonaOption[] = [
  { key: "seed", label: "Seed", sublabel: "Runway & Proof" },
  { key: "series-a", label: "Series A", sublabel: "Payback & GTM" },
  { key: "series-b", label: "Series B+", sublabel: "Operating Leverage" },
  { key: "bootstrapped", label: "Bootstrapped", sublabel: "Cash Flow Defense" },
];

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

  const handleSelectStage = (stage: StartupVariantMode) => {
    const params = new URLSearchParams(searchParams.toString());
    if (stage === "series-a") {
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
        {STAGE_PERSONA_OPTIONS.map((option) => {
          const isSelected = activeStage === option.key;
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
