import type { Metadata } from "next";
import Link from "next/link";
import { loadMarketState, type MarketState } from "../../lib/marketStateModel";
import { ConfidenceBadge } from "../components/ConfidenceBadge";
import { ScoreCard } from "../components/ScoreCard";
import { SignalMeaningList, SignalScaleNote } from "../components/ui/plainLanguage";
import {
  buildMarketMetadata,
  buildMarketFallbackMetadata,
} from "../../lib/seo/marketMetadata";
import { getRegimePublicLabel } from "../../lib/regimePresentation";

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
    <main className="flex flex-1 flex-col items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md space-y-6 text-center">
        <p className="type-eyebrow text-sky-200">
          WHETHER
        </p>
        <h1 className="text-fluid-lg font-semibold text-slate-100">
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
  const regimeDisplay = getRegimePublicLabel(state.regime);

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-2xl space-y-6 text-center">
        <p className="type-eyebrow text-sky-200">
          WHETHER
        </p>

        <h1 className="text-fluid-xl font-semibold text-slate-100 leading-snug">
          {state.decision}
        </h1>

        <p className="type-eyebrow text-sky-200">
          {regimeDisplay}
          {" · "}
          {state.posture}
        </p>

        {/* This page runs assembleHomePage — the weekly brief's own pipeline — and
            shows a subset of its hero. Saying so stops it reading as a second,
            independently-derived call that might disagree with the brief. */}
        <p className="text-fluid-micro text-slate-400">
          This week&apos;s call from the weekly brief, refreshed on the same cadence.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <ScoreCard
            label="Funding pressure"
            value={state.tightness}
            delta={state.tightnessDelta}
          >
            {/* A bare 0-100 score is only readable if you already know which end
                is bad. The anchor line is the cheapest way to say so. */}
            <SignalScaleNote signalKey="tightness" className="mx-auto mt-1 max-w-[11rem]" />
          </ScoreCard>
          <ScoreCard
            label="Risk appetite"
            value={state.riskAppetite}
            delta={state.riskAppetiteDelta}
            increaseIsPositive
          >
            <SignalScaleNote signalKey="riskAppetite" className="mx-auto mt-1 max-w-[11rem]" />
          </ScoreCard>
        </div>

        {/* Labelled, not two bare sentences under two cards: stacked into one
            column, an unlabelled pair loses which sentence describes which score. */}
        <SignalMeaningList
          className="mx-auto max-w-xl text-left"
          signals={[
            { signalKey: "tightness", score: state.tightness },
            { signalKey: "riskAppetite", score: state.riskAppetite },
          ]}
        />

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-fluid-micro text-slate-400">
          <ConfidenceBadge label={state.confidenceLabel} />
          <span>Record {state.recordDate}</span>
          <span className="text-slate-400">·</span>
          <span>Refreshed {state.fetchedAt}</span>
        </div>

        {/* Yahoo Finance was named here and feeds nothing on this page: it is
            read only by lib/saasMultiples.ts for the SaaS comps on /comps. The
            two scores above come from the Treasury series and the FRED macro
            series the regime engine reads. */}
        <p className="text-fluid-micro text-slate-400">
          Data: U.S. Treasury · FRED
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
