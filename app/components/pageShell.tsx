import type { ReactNode } from "react";
import { ClimateBackdrop } from "./climateBackdrop";
import { WebVitalsTracker } from "./webVitalsTracker";
import { DisplayModeManager } from "./displayModeManager";
import { DisplayGuardian } from "./displayGuardian";
import { AnchorFeedback } from "./anchorFeedback";
import { serializeJsonLd } from "../../lib/seo";
import { INTERNAL_USE_LABEL } from "../../lib/exportNotices";
import type { RegimeIconType } from "./regimeIcons";

type PageShellProps = {
  children: ReactNode;
  regime?: RegimeIconType;
  structuredData?: unknown;
  ambientMode?: "standard" | "tv";
  showFooter?: boolean;
  /** Extra classes on the main element */
  className?: string;
  /** Whether to include the hub-style backdrop */
  backdropVariant?: "default" | "hub" | "none";
};

export function PageShell({
  children,
  regime,
  structuredData,
  ambientMode = "standard",
  showFooter = false,
  className = "",
  backdropVariant = "default",
}: PageShellProps) {
  const enableTvAmbientMode = ambientMode === "tv";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={`weather-shell relative isolate min-h-screen overflow-x-clip text-slate-100${className ? ` ${className}` : ""}`}
    >
      {backdropVariant === "hub" ? <div className="weather-hub-backdrop" aria-hidden="true" /> : null}
      {backdropVariant === "default" ? <ClimateBackdrop regime={regime || "NEUTRAL"} /> : null}
      <WebVitalsTracker />
      {structuredData ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} /> : null}
      {enableTvAmbientMode ? <DisplayModeManager /> : null}
      {enableTvAmbientMode ? <AnchorFeedback /> : null}
      {enableTvAmbientMode ? <DisplayGuardian /> : null}

      <div className="tv-rail-safe relative z-10 mx-auto max-w-[88rem] pb-[calc(env(safe-area-inset-bottom)+8rem)] pt-[calc(env(safe-area-inset-top)+0.5rem)] px-[var(--weather-shell-pad-inline)] sm:pb-8 sm:pt-4">
        {children}
      </div>

      {showFooter ? (
        <footer className="mx-auto mt-8 max-w-[88rem] border-t border-white/[0.04] px-[var(--weather-shell-pad-inline)] pt-4 text-fluid-xs font-semibold tracking-[0.18em] text-slate-400 sm:pb-8">
          <p>{INTERNAL_USE_LABEL}</p>
        </footer>
      ) : null}
    </main>
  );
}
