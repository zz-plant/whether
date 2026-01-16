import { fetchTreasuryData } from "../lib/treasuryClient";
import { snapshotData } from "../lib/snapshot";
import { buildSensorReadings } from "../lib/sensors";
import { evaluateRegime } from "../lib/regimeEngine";
import { getPlaybookGuidance } from "../lib/playbook";
import {
  DataSourcePanel,
  LiveTickerPanel,
  PlaybookPanel,
  RegimeAssessmentCard,
  ScoreReadoutPanel,
  SensorArray,
  SignalMatrixPanel,
} from "./components/reportSections";

export default async function HomePage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://whether.report";
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Whether — Regime Station",
    url: siteUrl,
    description:
      "Translate Treasury macro signals into plain-English operational constraints for product and engineering leaders.",
    inLanguage: "en",
    publisher: {
      "@type": "Organization",
      name: "Whether"
    }
  };

  const treasury = await fetchTreasuryData({ snapshotFallback: snapshotData });
  const sensors = buildSensorReadings(treasury);
  const assessment = evaluateRegime(treasury);
  const { playbook, startItems, stopItems } = getPlaybookGuidance(assessment.regime);
  const fenceItems = assessment.constraints;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Regime Station</p>
              <h1 className="text-3xl font-semibold">Whether Report</h1>
            </div>
            <span className="rounded-full border border-slate-700 px-4 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
              {treasury.isLive ? "Live" : "Offline / Simulated"}
            </span>
          </div>
          <p className="max-w-3xl text-slate-300">
            Translate Treasury signals into operational constraints. Every output is sourced and time-stamped
            for traceability.
          </p>
        </header>

        <section className="mt-10 grid gap-6 lg:grid-cols-[2.2fr,1fr]">
          <RegimeAssessmentCard assessment={assessment} />
          <div className="grid gap-6">
            <LiveTickerPanel treasury={treasury} assessment={assessment} />
            <ScoreReadoutPanel assessment={assessment} />
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr,1fr]">
          <SignalMatrixPanel assessment={assessment} />
          <DataSourcePanel treasury={treasury} />
        </section>

        <SensorArray sensors={sensors} />

        <PlaybookPanel
          playbook={playbook}
          stopItems={stopItems}
          startItems={startItems}
          fenceItems={fenceItems}
        />

        <footer className="mt-12 border-t border-slate-800 pt-6 text-xs text-slate-500">
          Not Financial Advice.
        </footer>
      </div>
    </main>
  );
}
