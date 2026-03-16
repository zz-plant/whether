import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { assembleHomePage } from "../../lib/report/homePageAssembler";
import { LegacyRouteBridge } from "../components/legacyRouteBridge";
import { StartDecisionBlocks } from "./components/startDecisionBlocks";

export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Start Here — Weekly decision routing",
  description:
    "Start with what changed since your last review, then execute this week’s bounded decision call.",
  path: "/start",
  imageAlt: "Whether Start Here decision routing",
});

export default async function StartHerePage() {
  const homepage = await assembleHomePage({});
  const { weeklyDecisionCardModel } = homepage;

  return (
    <>
      <main className="weather-page-shell weather-page-shell-narrow">
        <section className="weather-panel grid gap-4 px-5 py-5 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Start Here</p>
            <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Weekly call, simplified</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300">Answer three questions quickly: what changed, what to do now, and where to execute.</p>
          </div>
          <div className="weather-route-card space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-200">Fastest route</p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li>1. Confirm the delta from last review.</li>
              <li>2. Lock the do now, guardrail, and flip condition.</li>
              <li>3. Open the right surface to execute.</li>
            </ul>
          </div>
        </section>

        <StartDecisionBlocks
          sinceLastReview={weeklyDecisionCardModel.sinceLastReview}
          actionNow={weeklyDecisionCardModel.decision.immediateDecision}
          guardrail={weeklyDecisionCardModel.decision.guardrail}
          flipWhen={weeklyDecisionCardModel.decision.reversalTrigger}
          postureLabel={weeklyDecisionCardModel.status.postureWithStageLabel ?? weeklyDecisionCardModel.status.statusLabel}
          confidenceLabel={weeklyDecisionCardModel.status.confidenceLabel}
          trendLabel={weeklyDecisionCardModel.status.trendLabel}
        />
      </main>
      <LegacyRouteBridge
        eyebrow="Legacy route bridge"
        title="Start routing now lives in Weekly Brief"
        description="Use Weekly Brief for the canonical posture call, then jump to Operations for execution guardrails. This route remains only for legacy links."
        primaryHref="/"
        primaryLabel="Go to Weekly Brief"
        secondaryHref="/operations"
        secondaryLabel="Go to Operations"
        autoForwardSeconds={3}
        moreActionsLabel="More actions"
      />
    </>
  );
}
