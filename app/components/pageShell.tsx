import type { ReactNode } from "react";
import { ClimateBackdrop } from "./climateBackdrop";
import { WebVitalsTracker } from "./webVitalsTracker";
import { AnchorFeedback } from "./anchorFeedback";
import { serializeJsonLd } from "../../lib/seo";
import type { RegimeKey } from "../../lib/types";
import { regimeAccentStyle } from "../../lib/regimeAccent";

export type RegimeIconType = RegimeKey | "NEUTRAL";

type PageShellProps = {
  children: ReactNode;
  regime?: RegimeIconType;
  structuredData?: unknown;
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
  className = "",
  backdropVariant = "default",
}: PageShellProps) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={`weather-shell weather-page-enter relative isolate flex-1 overflow-x-clip text-slate-100${className ? ` ${className}` : ""}`}
      style={regimeAccentStyle(regime)}
    >
      {backdropVariant === "hub" ? <div className="weather-hub-backdrop" aria-hidden="true" /> : null}
      {backdropVariant === "default" ? <ClimateBackdrop regime={regime || "NEUTRAL"} /> : null}
      <WebVitalsTracker />
      {structuredData ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} /> : null}
      {/* Renders nothing until the hash matches one of its target ids, and it is
          what opens a collapsed panel an anchor points into — the /trust glossary
          is linked from six places. It was once gated on TV ambient mode, which
          made it dead for every ordinary visit. */}
      <AnchorFeedback />

      {/* 2rem, not 8rem. The 8rem reserved room for a fixed bottom bar, but the
          only one is StickyCallStrip on the weekly brief, and that page renders
          through Shell rather than this component — so every PageShell route was
          ending in ~128px of nothing on mobile. */}
      <div className="relative z-10 mx-auto w-full max-w-[96rem] pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-[calc(env(safe-area-inset-top)+0.5rem)] px-[var(--weather-shell-pad-inline)] sm:pb-8 sm:pt-4">
        {children}
      </div>
    </main>
  );
}
