"use client";

import { Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

export const COMPANY_STAGES = [
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
  const [confirmationStage, setConfirmationStage] = useState<string | null>(null);
  const router = useRouter();
  const menuId = useId();
  const labelId = useId();
  const valueId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleSelect = (key: string) => {
    const stageName = COMPANY_STAGES.find(s => s.key === key)?.label ?? key;
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `whether-company-stage=${key};path=/;max-age=31536000`;
    try {
      localStorage.setItem("whether_company_stage", key);
    } catch {
      // Fallback
    }
    setConfirmationStage(stageName);
    setOpen(false);
    setTimeout(() => setConfirmationStage(null), 2000);
    router.refresh();
  };

  const currentLabel = COMPANY_STAGES.find((s) => s.key === currentStage)?.label;
  const selectedIndex = Math.max(
    COMPANY_STAGES.findIndex((s) => s.key === currentStage),
    0,
  );

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const focusItem = (index: number) => {
    itemRefs.current[index]?.focus();
  };

  return (
    <div className="relative inline-block">
      <div
        className="relative inline-block"
        onBlur={(e) => {
          if (open && e.relatedTarget instanceof Node && !e.currentTarget.contains(e.relatedTarget)) {
            setOpen(false);
          }
        }}
      >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
            window.setTimeout(() => focusItem(selectedIndex), 0);
          }
        }}
        title="Your company stage personalizes hiring freeze thresholds, spend limits, and commitment guardrails. Stage changes update these guardrails on the planning page."
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-labelledby={`${labelId} ${valueId}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/[0.12] bg-white/[0.07] px-3.5 py-2 text-left text-fluid-xs font-semibold text-white/75 shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-colors hover:border-white/[0.22] hover:bg-white/[0.1] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
      >
        <span id={labelId} className="text-white/60">Company stage</span>{" "}
        <span id={valueId} className="text-white">{currentLabel ?? "Choose"}</span>
        <ChevronDown aria-hidden="true" className={`size-4 text-white/65 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
 
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div
            id={menuId}
            className="absolute left-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-lg border border-white/[0.14] bg-[color-mix(in_srgb,var(--bg-raised)_94%,white_6%)] p-1.5 shadow-[0_18px_55px_rgba(0,0,0,0.55)] backdrop-blur-xl"
            role="menu"
            aria-label="Company stage"
          >
            {COMPANY_STAGES.map((s) => (
              <button
                key={s.key}
                ref={(node) => {
                  itemRefs.current[COMPANY_STAGES.findIndex((stage) => stage.key === s.key)] = node;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={currentStage === s.key}
                onClick={() => handleSelect(s.key)}
                onKeyDown={(event) => {
                  const currentIndex = COMPANY_STAGES.findIndex((stage) => stage.key === s.key);
 
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    focusItem((currentIndex + 1) % COMPANY_STAGES.length);
                  }
 
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    focusItem((currentIndex - 1 + COMPANY_STAGES.length) % COMPANY_STAGES.length);
                  }
                }}
                className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-fluid-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-300 ${
                  currentStage === s.key
                    ? "bg-sky-400/14 text-sky-100"
                    : "text-white/68 hover:bg-white/[0.10] hover:text-white"
                }`}
              >
                <span>{s.label}</span>
                {currentStage === s.key ? <Check aria-hidden="true" className="size-4 text-sky-300" /> : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
      </div>
      {confirmationStage && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-fluid-nano font-medium whitespace-nowrap animate-in fade-in slide-in-from-top-2 duration-200">
          ✓ Guardrails updated for {confirmationStage}
        </div>
      )}
    </div>
  );
}
