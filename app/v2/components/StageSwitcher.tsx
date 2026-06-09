"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STAGES = [
  { key: "pre-seed", label: "Pre-seed" },
  { key: "seed", label: "Seed" },
  { key: "series-a", label: "Series A" },
  { key: "series-b-plus", label: "Series B+" },
  { key: "public", label: "Public" },
] as const;

export function StageSwitcher({
  currentStage,
}: {
  currentStage?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSelect = (key: string) => {
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `whether-company-stage=${key};path=/;max-age=31536000`;
    setOpen(false);
    router.refresh();
  };

  const currentLabel = STAGES.find((s) => s.key === currentStage)?.label;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={currentLabel ? `Company stage: ${currentLabel}` : "Choose company stage"}
        className="inline-flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-fluid-nano font-medium text-white/40 hover:text-white/60 hover:border-white/[0.1] transition-colors"
      >
        Viewing as{currentLabel ? <span className="text-white/60 ml-1">{currentLabel}</span> : "…"}
        <span className={`text-white/20 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 mt-1 z-50 w-36 rounded-lg border border-white/[0.08] bg-[var(--bg-raised)] py-1 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl"
            role="menu"
            aria-label="Company stage"
          >
            {STAGES.map((s) => (
              <button
                key={s.key}
                type="button"
                role="menuitem"
                onClick={() => handleSelect(s.key)}
                className={`w-full text-left px-3 py-1.5 text-fluid-micro transition-colors ${
                  currentStage === s.key
                    ? "text-sky-300 bg-sky-500/10"
                    : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
