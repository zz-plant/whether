"use client";

import { useState, type ReactNode } from "react";
import { ShareRail } from "../../components/shareRail";

export function Shell({
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
      <div className="min-h-screen bg-[var(--bg-body)] text-[var(--app-text)]">
        <main id="main-content" className="mx-auto max-w-[72rem] px-4 py-6 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_18rem] lg:gap-8">
            <div className="space-y-6 min-w-0">
              <div className="weather-card">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0 space-y-4">
                    <div className="space-y-2">
                      <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
                      <div className="h-9 w-full max-w-xl rounded bg-white/15 animate-pulse" />
                    </div>
                    <div className="h-4 w-full max-w-md rounded bg-white/10 animate-pulse" />
                    <div className="h-8 w-full max-w-sm rounded bg-white/10 animate-pulse" />
                  </div>
                  <div className="space-y-2 sm:text-right">
                    <div className="h-20 w-20 rounded-full bg-white/15 animate-pulse mx-auto sm:mr-0" />
                    <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="weather-card h-40 animate-pulse" />
              <div className="weather-card h-56 animate-pulse" />
            </div>
            <div className="space-y-4 lg:col-start-2">
              <div className="weather-card h-32 animate-pulse" />
              <div className="weather-card h-48 animate-pulse" />
            </div>
            <div className="space-y-6 min-w-0">
              <div className="weather-card h-64 animate-pulse" />
              <div className="weather-card h-32 animate-pulse" />
            </div>
          </div>
        </main>
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
