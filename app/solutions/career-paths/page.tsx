import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../../lib/seo";
import { roleLandings } from "./roleLandingData";

export const metadata: Metadata = buildPageMetadata({
  title: "Career paths for product leaders — Whether",
  description:
    "Choose a product leadership career path and use market-regime signals to sharpen planning, trade-offs, and promotion-ready operating habits.",
  path: "/solutions/career-paths",
  imageAlt: "Career paths for product leaders",
  imageParams: {
    template: "solutions",
    eyebrow: "Solution · Career pathways",
    title: "Market-aware career growth for product leaders",
    subtitle:
      "Pick your current scope and get practical outcomes, proof points, and weekly operating loops.",
    kicker: "Whether career path playbooks.",
  },
});

const operatingRhythm = [
  "Read the weekly climate summary before roadmap or portfolio planning.",
  "Translate the signal posture into one clear keep / pause / accelerate call.",
  "Document trade-offs with confidence levels and trigger conditions.",
  "Share concise updates leadership can review without custom slide work.",
] as const;

const levelingUpReasons = [
  {
    title: "Make stronger calls under pressure",
    description:
      "Whether gives you confidence-scored context so your prioritization and staffing decisions stay durable in leadership review.",
  },
  {
    title: "Show strategic judgment, not just delivery",
    description:
      "Use regime-aware narratives to explain why you changed course, what risks you accepted, and what signal would trigger your next move.",
  },
  {
    title: "Build a promotion-ready operating cadence",
    description:
      "Turn weekly market evidence into crisp updates that demonstrate judgment, communication quality, and cross-functional alignment.",
  },
] as const;

export default function CareerPathsPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Career growth playbooks
        </p>
        <h1 className="max-w-3xl text-2xl font-semibold text-slate-100 sm:text-3xl">
          Career paths for product leaders operating through market volatility.
        </h1>
        <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
          Each role page translates macro signals into day-to-day operating moves so you can improve
          decision quality, communicate trade-offs clearly, and level up with visible evidence.
        </p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">How Whether helps you level up faster</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {levelingUpReasons.map((reason) => (
            <article key={reason.title} className="weather-surface space-y-2 px-4 py-4">
              <h3 className="text-base font-semibold text-slate-100">{reason.title}</h3>
              <p className="text-sm text-slate-300">{reason.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Choose your current role</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {roleLandings.map((roleLanding) => (
            <article key={roleLanding.slug} className="weather-surface flex h-full flex-col gap-3 px-4 py-4">
              <h3 className="text-base font-semibold text-slate-100">{roleLanding.roleTitle}</h3>
              <p className="text-sm text-slate-300">{roleLanding.hero}</p>
              <p className="text-sm text-slate-300">{roleLanding.summary}</p>
              <Link
                href={`/solutions/career-paths/${roleLanding.slug}`}
                className="weather-pill mt-auto inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
              >
                Open role playbook
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Weekly operating rhythm</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          {operatingRhythm.map((step) => (
            <li key={step} className="weather-surface px-4 py-3">
              {step}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
