import type { ReactNode } from "react";
import { FocusModeController } from "./focusModeController";
import { regimeAccentStyle } from "../../lib/regimeAccent";

const shellMainClassName = "mx-auto max-w-[72rem] px-4 py-4 sm:py-5";

export function Shell({
  children,
  loading,
  regime,
}: {
  children?: ReactNode;
  loading?: boolean;
  regime?: string;
}) {
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-body)] text-[var(--app-text)]">
        <main id="main-content" className="mx-auto max-w-[72rem] px-4 py-4 sm:py-5">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem] lg:gap-8">
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

  return (
    <div
      className="min-h-screen bg-[var(--bg-body)] text-[var(--app-text)]"
      style={regimeAccentStyle(regime)}
    >
      <FocusModeController />
      <main id="main-content" data-home-shell-main className={shellMainClassName}>
        {children}
      </main>
    </div>
  );
}
