import type { Metadata } from "next";
import { buildPageMetadata } from "../seo";
import type { MarketState } from "../marketStateModel";

const REGIME_LABELS: Record<string, string> = {
  SCARCITY: "Scarcity",
  DEFENSIVE: "Defensive",
  VOLATILE: "Volatile",
  EXPANSION: "Expansion",
};

export async function buildMarketMetadata(
  state: MarketState
): Promise<Metadata> {
  const regimeLabel = REGIME_LABELS[state.regime] ?? state.regime;

  return buildPageMetadata({
    title: `US Market Regime: ${regimeLabel} — Whether Weekly Brief`,
    description: `Current operating posture for startup leaders. ${state.decision}. Updated weekly.`,
    path: "/state",
    imageAlt: `Whether market regime: ${regimeLabel} — ${state.decision}`,
    imageParams: { template: "report" },
  });
}

export function buildMarketFallbackMetadata(): Metadata {
  return {
    title: "US Market Regime — Whether Weekly Brief",
    description:
      "Current operating posture for startup and product leaders. Updated weekly. Based on U.S. Treasury data.",
    alternates: { canonical: "/state" },
    openGraph: {
      type: "website",
      title: "US Market Regime — Whether Weekly Brief",
      description:
        "Current operating posture for startup and product leaders. Updated weekly. Based on U.S. Treasury data.",
      images: [
        {
          url: "/api/og?template=report",
          width: 1200,
          height: 630,
          alt: "Whether market regime summary",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "US Market Regime — Whether Weekly Brief",
      description:
        "Current operating posture for startup and product leaders. Updated weekly.",
      images: ["/api/og?template=report"],
    },
  };
}
