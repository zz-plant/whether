import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { assembleHomePage } from "../../lib/report/homePageAssembler";
import { StartDecisionBlocks } from "./components/startDecisionBlocks";

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
    <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6">
      <section className="weather-panel space-y-2 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Start Here</p>
        <h1 className="text-lg font-semibold text-slate-100">Weekly call, simplified</h1>
        <p className="text-sm text-slate-300">Answer three questions quickly: what changed, what to do now, and where to execute.</p>
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
      description="Use Weekly Brief for the canonical posture call, then jump to Action playbook guardrails. This route remains only for legacy links."
      primaryHref="/"
      primaryLabel="Go to Weekly Brief"
      secondaryHref="/operations"
      secondaryLabel="Go to Action playbook"
      autoForwardSeconds={3}
      moreActionsLabel="More actions"
    />
  );
}
