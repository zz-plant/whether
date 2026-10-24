import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/seo";
import { noindexRobots } from "../../../lib/seo/indexationPolicy";
import { ContentPageShell } from "../../components/ui/contentPageShell";
import { ActionLink } from "../../components/ui/actionLink";
import { loadPostureLine } from "../postureLine";

export const runtime = "edge";
export const revalidate = 21600;

export const metadata: Metadata = buildPageMetadata({
  title: "Decision Shield",
  description:
    "Decision Shield checks a plan against this week's guidance and returns Safe, Risky or Dangerous — with the guardrail to hold and the reversal that would change the call.",
  path: "/resources/decision-shield-overview",
  imageAlt: "Decision Shield overview",
});

metadata.robots = noindexRobots;

export default async function DecisionShieldOverviewPage() {
  const pagePath = "/resources/decision-shield-overview";
  /* The week the reader is in, before the explanation (AGENTS.md, "Thin SEO page"). */
  const { reportData, postureSummary } = await loadPostureLine(pagePath);

  return (
    <ContentPageShell measure="prose">
      <section className="weather-panel space-y-4 px-6 max-sm:px-0 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Decision Shield</h1>
        <p className="text-sm text-slate-200">
          Decision Shield checks a plan against this week&apos;s guidance and returns one verdict —
          Safe, Risky or Dangerous — with the guardrail to hold and the reversal that would change
          the guidance. It records what you decided.
        </p>
        <div className="space-y-1 border-l-2 border-[var(--border-subtle)] pl-3">
          <p className="type-eyebrow">This week</p>
          <p className="text-sm text-slate-200">{postureSummary}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
            <span>Data as of {reportData.recordDateLabel}</span>
            <ActionLink href="/" variant="inline">
              Open this week&apos;s brief
            </ActionLink>
          </p>
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 max-sm:px-0 py-6">
        <h2 className="text-lg font-semibold text-slate-100">What it returns</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-slate-500">•</span>
            <span>
              <span className="font-semibold text-slate-100">A verdict.</span> Safe, Risky or
              Dangerous, from the current conditions and your stage, category and action.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-slate-500">•</span>
            <span>
              <span className="font-semibold text-slate-100">A guardrail.</span> The condition to
              hold while you proceed — phase hiring in tranches, ship milestones, cap the discount
              window.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-slate-500">•</span>
            <span>
              <span className="font-semibold text-slate-100">A reversal.</span> The condition that
              would change the guidance, so the decision carries a stop rather than a one-time
              guess.
            </span>
          </li>
        </ul>
      </section>

      <section className="weather-panel space-y-4 px-6 max-sm:px-0 py-6">
        <h2 className="text-lg font-semibold text-slate-100">The three verdicts</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-slate-500">•</span>
            <span>
              <span className="font-semibold text-slate-100">Safe.</span> The move fits this
              week&apos;s conditions. Proceed with the guardrail.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-slate-500">•</span>
            <span>
              <span className="font-semibold text-slate-100">Risky.</span> The move cuts against
              conditions somewhere. Reduce its size or stage it, and hold the guardrail.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-slate-500">•</span>
            <span>
              <span className="font-semibold text-slate-100">Dangerous.</span> The move works
              against the conditions. Wait for the reversal, or find a smaller version.
            </span>
          </li>
        </ul>
      </section>

      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Run it on this week&apos;s plan</h2>
        <p className="text-sm text-slate-200">
          Decision Shield lives in the plan&apos;s &ldquo;Test a decision&rdquo; step. Type a plan and it
          returns the verdict against this week&apos;s guidance, your runway and how hard the move is
          to undo.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <ActionLink href="/operate#ops-decision-shield" variant="primary">
            Open Decision Shield
          </ActionLink>
          <ActionLink href="/decisions" variant="pill">
            Your decision record
          </ActionLink>
        </div>
      </section>
    </ContentPageShell>
  );
}