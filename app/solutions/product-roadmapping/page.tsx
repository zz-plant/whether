import type { Metadata } from "next";
import { ActionLink } from "../../components/ui/actionLink";
import { buildPageMetadata } from "../../../lib/seo";
import { SeoPostureSnapshot } from "../components/seoPostureSnapshot";
import { SecondarySurfaceStartBlock } from "../../components/secondarySurfaceStartBlock";

export const metadata: Metadata = buildPageMetadata({
  title: "Treasury yield curve signals for product roadmapping — Whether",
  description:
    "Downstream product roadmap helper playbook for converting weekly brief posture into keep/pause/accelerate sequencing calls.",
  path: "/solutions/product-roadmapping",
  imageAlt: "Treasury signals for product roadmapping",
  imageParams: {
    template: "solutions",
    eyebrow: "Solution · Product roadmapping",
    title: "Roadmap with macro-aware conviction",
    subtitle:
      "Sequence bets using Treasury signal posture so priorities survive market pressure shifts.",
    kicker: "Whether solutions for product leaders.",
  },
});

const roadmapMoves = [
  "Prioritize retention and expansion work when conditions tighten.",
  "Break launches into smaller steps when markets are volatile.",
  "Protect reliability and activation before long-horizon bets.",
] as const;

const boundedRules = [
  {
    action: "Ship roadmap items that can show customer value within six weeks.",
    trigger: "Use this when risk appetite drops below its threshold.",
    reversal: "Re-open exploratory bets after two improving weekly briefs in a row.",
  },
  {
    action: "Require an exec checkpoint before starting new platform projects.",
    trigger: "Use this when tightness rises above its threshold.",
    reversal: "Remove the checkpoint after tightness stays normal for one month.",
  },
  {
    action: "Run weekly PM reviews with clear keep/pause/accelerate calls.",
    trigger: "Use this when momentum is mixed or worsening.",
    reversal: "Return to biweekly reviews once momentum is stable and the review flag is off.",
  },
] as const;

const connectedPages = [
  {
    title: "Engineering capacity",
    description: "Keep roadmap commitments and engineering staffing plans synchronized to the same market assumptions.",
    href: "/solutions/engineering-capacity",
    cta: "Open engineering capacity",
  },
  {
    title: "Career paths",
    description: "Give PMs and product leaders role-based guidance to apply this posture in weekly execution.",
    href: "/solutions/career-paths",
    cta: "Open career paths",
  },
  {
    title: "Market regime playbook",
    description: "Escalate roadmap pivots into executive-level keep, pause, and accelerate calls.",
    href: "/solutions/market-regime-playbook",
    cta: "Open regime playbook",
  },
] as const;

export default async function ProductRoadmappingPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <SecondarySurfaceStartBlock surface="solutions" />
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Product planning in this market
        </p>
        <h1 className="max-w-3xl text-2xl font-semibold text-slate-100 sm:text-3xl">
          How to plan your roadmap with the latest market signals.
        </h1>
        <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
          Use this page to make clearer weekly roadmap calls—what to ship now, what to pause, and what to reopen later.
        </p>
      </section>

      <SeoPostureSnapshot
        route="/solutions/product-roadmapping"
        immediateImplication="Bias toward near-term customer value and de-risk roadmap sequencing before committing to long-horizon expansions."
      />

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">How to apply macro signals this quarter</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          {roadmapMoves.map((move) => (
            <li key={move} className="weather-surface px-4 py-3">
              {move}
            </li>
          ))}
        </ul>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Roadmap rules for this week</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {boundedRules.map((rule) => (
            <article key={rule.action} className="weather-surface space-y-2 px-4 py-4 text-sm">
              <p className="font-semibold text-slate-100">Action: {rule.action}</p>
              <p className="text-rose-200">Trigger: {rule.trigger}</p>
              <p className="text-emerald-200">Reversal: {rule.reversal}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Use this page with the live report</h2>
        <p className="text-sm text-slate-300">
          Start with the weekly brief, then align your roadmap decisions to the current posture and evidence.
        </p>
        <div className="flex flex-wrap gap-3">
          <ActionLink href="/">
            Open weekly brief
          </ActionLink>
          <ActionLink href="/signals">
            Review signal matrix
          </ActionLink>
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Connect this page to adjacent workflows</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {connectedPages.map((page) => (
            <article key={page.href} className="weather-surface flex h-full flex-col gap-3 px-4 py-4">
              <h3 className="text-base font-semibold text-slate-100">{page.title}</h3>
              <p className="text-sm text-slate-300">{page.description}</p>
              <ActionLink
                href={page.href}
                className="mt-auto justify-center"
              >
                {page.cta}
              </ActionLink>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
