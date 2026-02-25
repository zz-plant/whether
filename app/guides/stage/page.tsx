import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../../lib/seo";
import { stageGuides } from "../stageGuides";

export const metadata: Metadata = buildPageMetadata({
  title: "Company Stage Guidance — Whether",
  description:
    "See how Whether helps Seed through Series C leadership teams set posture, reduce planning entropy, and improve board-grade communication.",
  path: "/guides/stage",
  imageAlt: "Whether company stage guidance",
  imageParams: {
    template: "guides",
    eyebrow: "Company stage guides",
    title: "Apply Whether by growth stage",
    subtitle:
      "See where macro posture creates leverage from seed through scale-up operating rhythms.",
    kicker: "Stage-specific decision translation.",
  },
});

export default function StageLandingPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Company stage map</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          Who gets the most leverage from Whether at each company stage?
        </h1>
        <p className="text-sm text-slate-300">
          The ROI grows with coordination cost, capital dependence, and board pressure. At early stages,
          the gain is mostly narrative clarity. At later stages, posture becomes operating governance.
        </p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Stage summary table</h2>
        <div className="overflow-x-auto weather-surface px-4 py-4">
          <table className="w-full min-w-[620px] text-left text-sm text-slate-200">
            <thead>
              <tr className="border-b border-slate-700 text-xs uppercase tracking-[0.12em] text-slate-400">
                <th className="py-2 pr-4">Stage</th>
                <th className="py-2 pr-4">Team size</th>
                <th className="py-2 pr-4">Primary value</th>
                <th className="py-2 pr-4">Operational leverage</th>
                <th className="py-2">Narrative leverage</th>
              </tr>
            </thead>
            <tbody>
              {stageGuides.map((stage) => (
                <tr key={stage.slug} className="border-b border-slate-800/80 align-top">
                  <td className="py-3 pr-4 font-semibold text-slate-100">{stage.title}</td>
                  <td className="py-3 pr-4">{stage.teamSize}</td>
                  <td className="py-3 pr-4">{stage.primaryValue}</td>
                  <td className="py-3 pr-4">{stage.operationalLeverage}</td>
                  <td className="py-3">{stage.narrativeLeverage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {stageGuides.map((stage) => (
          <article key={stage.slug} className="weather-panel space-y-3 px-6 py-6">
            <h2 className="text-xl font-semibold text-slate-100">{stage.title}</h2>
            <p className="text-sm text-slate-200">{stage.summary}</p>
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-slate-100">Best use:</span> {stage.bestUse}
            </p>
            <Link
              href={`/guides/stage/${stage.slug}`}
              className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.16em] text-sky-200 underline decoration-slate-500 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
            >
              Open {stage.title} page →
            </Link>
          </article>
        ))}
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Open the live app</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="weather-button-primary inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.12em]"
          >
            Weekly briefing
          </Link>
          <Link
            href="/operations"
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Operations workspace
          </Link>
        </div>
      </section>
    </main>
  );
}
