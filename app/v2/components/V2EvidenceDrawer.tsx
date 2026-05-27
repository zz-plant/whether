import type { ReactNode } from "react";

export function V2EvidenceDrawer({ children }: { children?: ReactNode }) {
  return (
    <details className="group weather-card">
      <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold tracking-[0.04em] text-slate-400 hover:text-slate-200 select-none">
        Evidence &amp; tools ▸
      </summary>
      <div className="px-4 pb-4 space-y-4">
        {children}
      </div>
    </details>
  );
}
