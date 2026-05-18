import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../components/pageShell";
import { buildAgentInterfaceResponse } from "../../lib/agentInterface";

export const runtime = "edge";
export const revalidate = 3600;

export async function generateStaticParams() {
  return [{ regime: "current" }];
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const brief = await buildAgentInterfaceResponse("weekly");
    const summary = (brief as any).summary ?? {};
    const regime = String(summary.regime ?? "Stable");
    const action = String(summary.action ?? "Hold current posture");

    return {
      title: `US Macro Economic Regime: ${regime} — Operating Posture for Startup Leaders`,
      description: `The current macro regime is ${regime}. Recommended action: ${action}. Weekly operating posture based on Treasury yields, credit spreads, inflation, and employment data.`,
      openGraph: {
        title: `US Macro Regime: ${regime} — Whether Operating Brief`,
        description: `Current operating posture: ${action}. Updated weekly from Treasury, FRED, and BLS data.`,
      },
      robots: { index: true, follow: true },
    };
  } catch {
    return {
      title: "Current Macro Regime — Whether Operating Brief",
      description: "Weekly operating posture based on US macro signals.",
    };
  }
}

export default async function CurrentRegimePage() {
  try {
    const brief = await buildAgentInterfaceResponse("weekly");
    const summary = (brief as any).summary ?? {};
    const regime = String(summary.regime ?? "Stable");
    const action = String(summary.action ?? "Hold current posture");
    const recordDate = String(summary.recordDate ?? "");
    const description = (brief as any).assessment?.description ?? "";

    return (
      <PageShell backdropVariant="default" showFooter>
        <article className="weather-panel space-y-6 px-5 py-5">
          <h1 className="text-fluid-2xl font-semibold text-slate-100">
            US Macro Economic Regime: {regime}
          </h1>
          <p className="text-sm text-slate-300">Updated {recordDate}</p>

          <section className="space-y-3">
            <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Current operating posture</h2>
            <div className="weather-surface px-4 py-4 space-y-2">
              <p className="text-sm font-semibold text-slate-100">{action}</p>
              <p className="text-sm text-slate-300">{description}</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">What this means</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              {regime === "SCARCITY" ? "Credit conditions are tight and investor sentiment is cautious. Prioritize cash preservation over growth. Delay non-essential hires and capital expenditures. Fundraising will be challenging." :
               regime === "DEFENSIVE" ? "Credit conditions are tight but investor sentiment remains healthy. Gate new commitments to short-payback work. Fundraising is possible but will require strong unit economics." :
               regime === "VOLATILE" ? "Credit is available but investor sentiment is cautious. Favor reversible decisions with clear exit criteria. Conditions can shift quickly — multiple scenario plans recommended." :
               "Credit is available and investor sentiment is strong. This is a favorable environment for scaling proven bets and fundraising. Maintain milestone-based approval gates."}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">How the regime is determined</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Whether tracks four primary macro indicators: Treasury yields (short and long term), credit spreads (corporate bond yields relative to Treasuries), inflation (CPI), and employment (unemployment rate). These are combined into two scores — credit conditions and investor sentiment — which determine the current quadrant (regime). The methodology is published at whether.work/trust.
            </p>
            <Link href="/trust" className="inline-flex text-fluid-xs font-semibold text-sky-200 hover:text-sky-100 no-underline">Read the full methodology →</Link>
          </section>

          <section className="space-y-3">
            <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Related resources</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/evidence" className="weather-surface no-underline px-4 py-3 space-y-1 block">
                <p className="text-xs font-semibold text-sky-200">Evidence</p>
                <p className="text-xs text-slate-300">See what signals drove this week&apos;s call</p>
              </Link>
              <Link href="/history" className="weather-surface no-underline px-4 py-3 space-y-1 block">
                <p className="text-xs font-semibold text-sky-200">History</p>
                <p className="text-xs text-slate-300">Compare current conditions to past periods</p>
              </Link>
              <Link href="/planning" className="weather-surface no-underline px-4 py-3 space-y-1 block">
                <p className="text-xs font-semibold text-sky-200">Plan</p>
                <p className="text-xs text-slate-300">Turn this brief into operational decisions</p>
              </Link>
              <Link href="/share" className="weather-surface no-underline px-4 py-3 space-y-1 block">
                <p className="text-xs font-semibold text-sky-200">Share</p>
                <p className="text-xs text-slate-300">Share this brief with your team or board</p>
              </Link>
            </div>
          </section>
        </article>
      </PageShell>
    );
  } catch {
    return (
      <PageShell backdropVariant="default" showFooter>
        <div className="weather-panel px-5 py-5">
          <h1 className="text-fluid-2xl font-semibold text-slate-100">Current regime</h1>
          <p className="mt-3 text-sm text-slate-300">Unable to load the current regime data. Please try again later.</p>
        </div>
      </PageShell>
    );
  }
}
