import type { Metadata } from "next";
import Link from "next/link";
import { loadMarketState, type MarketState } from "../../lib/marketStateModel";
import { ConfidenceBadge } from "../components/ConfidenceBadge";
import { ScoreCard } from "../components/ScoreCard";
import {
  buildMarketMetadata,
  buildMarketFallbackMetadata,
} from "../../lib/seo/marketMetadata";

const REGIME_LABELS: Record<string, string> = {
  SCARCITY: "Scarcity",
  DEFENSIVE: "Defensive",
  VOLATILE: "Uncertain",
  EXPANSION: "Expansion",
};

export const runtime = "edge";
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const state = await loadMarketState();
  if (!state) return buildMarketFallbackMetadata();
  return buildMarketMetadata(state);
}

export default async function StatePage() {
  const state = await loadMarketState();

  if (!state) {
    return <ErrorView />;
  }

  return <MarketStateView state={state} />;
}

function ErrorView() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md space-y-6 text-center">
        <p className="text-fluid-micro font-semibold uppercase tracking-[0.2em] text-slate-400">
          WHETHER
        </p>
        <h1 className="text-fluid-lg font-semibold text-slate-100 font-display">
          Unable to load market data.
        </h1>
        <p className="text-fluid-sm text-slate-400">
          Check back soon. We refresh this page hourly with the latest U.S.
          Treasury signals.
        </p>
        <Link
          href="/"
          className="inline-block rounded-sm border border-sky-500/30 bg-sky-500/10 px-5 py-2.5 font-semibold text-sky-200 hover:bg-sky-500/20 transition-colors no-underline"
        >
          View the weekly brief →
        </Link>
      </div>
    </main>
  );
}

function MarketStateView({ state }: { state: MarketState }) {
  const regimeDisplay = REGIME_LABELS[state.regime] ?? state.regime;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-2xl space-y-6 text-center">
        <p className="text-fluid-micro font-semibold uppercase tracking-[0.2em] text-slate-400">
          WHETHER
        </p>

        <h1 className="text-fluid-xl font-semibold text-slate-100 leading-snug font-display">
          {state.decision}
        </h1>

        <p className="text-fluid-xs font-semibold uppercase tracking-[0.15em] text-sky-200">
          {regimeDisplay}
          {" · "}
          {state.posture}
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <ScoreCard
            label="Credit conditions"
            value={state.tightness}
            delta={state.tightnessDelta}
          />
          <ScoreCard
            label="Investor sentiment"
            value={state.riskAppetite}
            delta={state.riskAppetiteDelta}
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-fluid-micro text-slate-400">
          <ConfidenceBadge label={state.confidenceLabel} />
          <span>Record {state.recordDate}</span>
          <span className="text-slate-400">·</span>
          <span>Refreshed {state.fetchedAt}</span>
        </div>

        <p className="text-fluid-micro text-slate-400">
          Data: FRED · Treasury · Yahoo Finance
        </p>

        <div className="pt-4">
          <Link
            href="/"
            className="inline-block rounded-sm border border-sky-500/30 bg-sky-500/10 px-6 py-3 font-semibold text-sky-200 hover:bg-sky-500/20 transition-colors no-underline"
          >
            Get the full weekly brief →
          </Link>
        </div>

        <p className="text-fluid-micro text-slate-400 max-w-md mx-auto leading-relaxed pt-4">
          Weekly operating brief for startup and product leaders. Based on U.S.
          Treasury data. No signup required.
        </p>
      </div>
    </main>
  );
}
