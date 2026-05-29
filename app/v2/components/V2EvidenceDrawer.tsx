import type { ReactNode } from "react";

export function V2EvidenceDrawer({ children }: { children?: ReactNode }) {
  return (
    <details className="group weather-card shadow-[0_2px_8px_rgba(0,0,0,0.2),0_8px_24px_rgba(0,0,0,0.12)]">
      <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold tracking-[0.04em] text-white/40 hover:text-white/70 transition-colors select-none focus-visible:outline-2 focus-visible:outline-sky-400 focus-visible:outline-offset-1 rounded-md">
        <div>
          <span>Evidence &amp; tools</span>
          <span className="ml-2 text-white/20 font-normal">Simulator · Metrics · Trendline · Transition</span>
        </div>
        <span className="text-white/20 group-open:rotate-90 transition-transform">▸</span>
      </summary>
      <div className="px-4 pb-4 space-y-4">
        {children}
      </div>
    </details>
  );
}
