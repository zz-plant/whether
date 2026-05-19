"use client";

import { useEffect, useState } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { useLocalStorageState } from "../../../lib/hooks/useLocalStorageState";

export function HowItWorks() {
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [open, setOpen] = useState(false);
  const [visitCount] = useLocalStorageState<number>("whether_visit_count", 0);

  useEffect(() => {
    if (visitCount <= 1) {
      setIsFirstVisit(true);
      setOpen(true);
    }
  }, [visitCount]);

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <div className={`rounded-lg border px-4 py-3 space-y-2 ${open ? (isFirstVisit ? "border-sky-500/30 bg-sky-950/20" : "border-slate-700/60 bg-slate-950/30") : "border-slate-700/60 bg-slate-950/30"}`}>
        <Collapsible.Trigger className="flex w-full items-center justify-between gap-2 text-left">
          <span className="text-fluid-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
            {isFirstVisit ? "New to Whether? Here's how it works" : open ? "How it works" : "How it works ▸"}
          </span>
          <span className="text-fluid-micro text-slate-500 transition-transform data-[panel-open]:rotate-180">▾</span>
        </Collapsible.Trigger>
        <Collapsible.Panel className="space-y-2">
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            Your weekly operating call — what to do, what would pause it, and what would reverse it — based on U.S. credit conditions and investor sentiment. When credit tightens, preserve cash. When investors pull back, extend runway. When conditions ease, move faster on what's working.
          </p>
          <a href="/trust" className="inline-flex text-fluid-micro font-semibold text-sky-200 hover:text-sky-100 no-underline">
            Read the full methodology →
          </a>
        </Collapsible.Panel>
      </div>
    </Collapsible.Root>
  );
}
