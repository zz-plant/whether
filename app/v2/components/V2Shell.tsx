"use client";

import { useState, type ReactNode } from "react";
import { ShareRail } from "../../components/shareRail";

export function V2Shell({
  children,
  loading,
  regime,
}: {
  children?: ReactNode;
  loading?: boolean;
  regime?: string;
}) {
  const [showShare, setShowShare] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-body)] flex items-center justify-center">
        <div className="h-2 w-2 rounded-full bg-sky-400/60 animate-pulse" />
      </div>
    );
  }

  const regimeLower = (regime ?? "").toLowerCase();
  const atmosphereGradient = regimeLower === "expansion" ? "from-emerald-950/40 via-slate-950 to-slate-950"
    : regimeLower === "defensive" ? "from-amber-950/30 via-slate-950 to-slate-950"
    : regimeLower === "scarcity" ? "from-rose-950/40 via-slate-950 to-slate-950"
    : regimeLower === "volatile" ? "from-sky-950/30 via-slate-950 to-slate-950"
    : "";

  return (
    <div className={`min-h-screen bg-[var(--bg-body)] text-[var(--app-text)] ${atmosphereGradient ? `bg-gradient-to-b ${atmosphereGradient}` : ""}`}>
      <main id="main-content" className="mx-auto max-w-[72rem] px-4 py-6 sm:py-8">
        {children}
      </main>

      {showShare ? <ShareRail onClose={() => setShowShare(false)} /> : null}
    </div>
  );
}
