"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export function CollapsibleGroup({
  storageKey,
  label,
  defaultOpen = true,
  children,
}: {
  storageKey: string;
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "0") setOpen(false);
    } catch {}
  }, [storageKey]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(storageKey, next ? "1" : "0");
    } catch {}
  };

  return (
    <div className={`rounded-lg border border-slate-700/60 px-4 py-3 space-y-3 ${open ? "bg-slate-950/40" : "bg-slate-950/20"}`}>
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-500">
          {label}
        </span>
        <span className={`text-fluid-micro text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open ? children : null}
    </div>
  );
}
