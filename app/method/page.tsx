import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Method — transparency and trust",
  description: "Transparency hub for formulas, sources, cadence, and limitations.",
  path: "/method",
  imageAlt: "Whether method and trust hub",
});

export default function MethodPage() {
  const methodAtGlanceSteps = [
    {
      id: "inputs",
      title: "Source inputs",
      description: "Treasury and macro series are ingested with provenance and timestamps.",
      accentClass: "weather-card-accent-sky",
    },
    {
      id: "scoring",
      title: "Score + classify",
      description: "Signals map into the regime model with deterministic thresholds.",
      accentClass: "weather-card-accent-violet",
    },
    {
      id: "translation",
      title: "Translate",
      description: "Regime output becomes plain-language operating constraints.",
      accentClass: "weather-card-accent-amber",
    },
    {
      id: "governance",
      title: "Governance",
      description: "Cadence, limitations, and trust surfaces are exposed for audits.",
      accentClass: "weather-card-accent-teal",
    },
  ] as const;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel-hero space-y-3 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Audit layer</p>
        <h1 className="type-section text-slate-100">Method</h1>
        <p className="text-[15px] text-slate-300 sm:text-base">Use Method as the audit layer only: formulas, definitions, source provenance, cadence, and limitations. It should explain how the system works, not what to do.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/signals" className="weather-button-primary inline-flex items-center justify-center">Review Signals</Link>
          <Link href="/start" className="weather-button inline-flex items-center justify-center">Open Command Center</Link>
        </div>
      </section>
      <section className="weather-panel-quiet space-y-4 px-6 py-5">
        <h2 className="text-xl font-semibold text-slate-100">Method at a glance</h2>
        <ol className="grid gap-3 sm:grid-cols-2">
          {methodAtGlanceSteps.map((step, index) => (
            <li key={step.id} className={`weather-surface weather-card-accent ${step.accentClass} space-y-2 px-4 py-3`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Step {index + 1}</p>
              <h3 className="text-base font-semibold text-slate-100">{step.title}</h3>
              <p className="text-[15px] text-slate-300 sm:text-base">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/methodology" className="weather-panel space-y-2 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-100">Methodology</h2>
          <p className="text-[15px] text-slate-300 sm:text-base">Inspect formulas, assumptions, and source-linked model definitions.</p>
        </Link>
        <Link href="/about" className="weather-panel space-y-2 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-100">About and contact</h2>
          <p className="text-[15px] text-slate-300 sm:text-base">Review sources, FAQ context, updates, and contact details.</p>
        </Link>
      </section>
    </main>
  );
}
