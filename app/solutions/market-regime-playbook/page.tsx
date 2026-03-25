import type { Metadata } from "next";
import { ActionLink } from "../../components/ui/actionLink";
import { buildPageMetadata } from "../../../lib/seo";
import { SeoPostureSnapshot } from "../components/seoPostureSnapshot";

export const metadata: Metadata = buildPageMetadata({
  title: "Market regime operations playbook — Whether",
  description:
    "Action framework for operating in high, moderate, and low market-stress regimes using Treasury macro signal guidance.",
  path: "/solutions/market-regime-playbook",
  imageAlt: "Market regime operations playbook",
  imageParams: {
    template: "solutions",
    eyebrow: "Solution · Regime playbook",
    title: "Operationalize each market regime",
    subtitle:
      "Move from classification to repeatable guardrails across product, engineering, and finance.",
    kicker: "Whether solutions for operating teams.",
  },
});

const regimeRows = [
  {
    regime: "High stress",
    guidance:
      "Protect cash and delivery reliability first. Delay optional expansion bets.",
    trigger: "Use this when tightness is above threshold or risk appetite is below threshold.",
    reversal: "Re-open expansion pilots after two improving weekly briefs.",
  },
  {
    regime: "Moderate stress",
    guidance:
      "Balance efficiency with selective growth. Gate larger initiatives with tighter milestone checks.",
    trigger: "Use this when momentum is mixed and transition watch is ON.",
    reversal: "Return to normal planning cadence after one stable month.",
  },
  {
    regime: "Low stress",
    guidance:
      "Increase growth pace while keeping hiring and strategic risk controls in place.",
    trigger: "Use this when risk appetite stays above threshold and momentum is stable or improving.",
    reversal: "Switch back to the moderate-stress playbook if either threshold nears a flip.",
  },
] as const;

const connectedPages = [
  {
    title: "Product roadmapping",
    description: "Bring regime posture directly into sequencing decisions and launch pacing.",
    href: "/solutions/product-roadmapping",
    cta: "Open product roadmapping",
  },
  {
    title: "Engineering capacity",
    description: "Tie executive guardrails to staffing risk, reliability trade-offs, and delivery commitments.",
    href: "/solutions/engineering-capacity",
    cta: "Open engineering capacity",
  },
  {
    title: "Career paths",
    description: "Help functional leaders build role-specific habits that reinforce the same market posture.",
    href: "/solutions/career-paths",
    cta: "Open career paths",
  },
] as const;

export default async function MarketRegimePlaybookPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Leadership playbook by market posture
        </p>
        <h1 className="max-w-3xl text-2xl font-semibold text-slate-100 sm:text-3xl">
          How leadership teams should operate in the current market posture.
        </h1>
        <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
          Use these rules to align product, engineering, and finance decisions to this week’s posture.
        </p>
      </section>

      <SeoPostureSnapshot
        route="/solutions/market-regime-playbook"
        immediateImplication="Anchor hiring, spend, and roadmap calls to one shared weekly posture so teams can move together and reverse quickly if needed."
      />

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Operating rules by regime</h2>
        <div className="space-y-3">
          {regimeRows.map((row) => (
            <article key={row.regime} className="weather-surface space-y-2 px-4 py-4">
              <h3 className="text-base font-semibold text-slate-100">{row.regime}</h3>
              <p className="text-sm text-slate-200">Action: {row.guidance}</p>
              <p className="text-xs text-rose-200">Trigger: {row.trigger}</p>
              <p className="text-xs text-emerald-200">Reversal: {row.reversal}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">What to do next</h2>
        <p className="text-sm text-slate-300">
          Confirm the current regime in the weekly brief, then pressure-test assumptions in Method before finalizing plans.
        </p>
        <div className="flex flex-wrap gap-3">
          <ActionLink href="/">
            Open weekly brief
          </ActionLink>
          <ActionLink href="/method">
            Review methodology
          </ActionLink>
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Related pages</h2>
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
