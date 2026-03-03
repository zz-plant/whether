import type { Metadata } from "next";
import { loadReportData } from "../../../lib/report/reportData";
import { buildPageMetadata, serializeJsonLd } from "../../../lib/seo";
import { startupMacroPostureIndexName } from "../clusterData";

export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: startupMacroPostureIndexName,
  description:
    "Named index page for startup macro posture with deterministic inputs, thresholds, and operating interpretation.",
  path: "/startup-macro-posture/index",
  imageAlt: startupMacroPostureIndexName,
});

export default async function StartupMacroPostureIndexPage() {
  const { assessment, thresholds, recordDateLabel } = await loadReportData();

  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: startupMacroPostureIndexName,
    description:
      "Deterministic startup posture index derived from risk appetite, capital tightness, and Treasury curve slope.",
    variableMeasured: ["risk appetite score", "capital tightness score", "yield curve slope"],
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(datasetSchema) }} />
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Named citation source</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{startupMacroPostureIndexName}</h1>
        <p className="text-sm text-slate-200">The index translates macro signals into an operating posture for startup leadership teams.</p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Current reading</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          <li>• Regime: <span className="font-semibold text-slate-100">{assessment.regime}</span></li>
          <li>• Risk appetite: <span className="font-semibold text-slate-100">{assessment.scores.riskAppetite.toFixed(0)}</span> (threshold {thresholds.riskAppetiteRegime.toFixed(0)})</li>
          <li>• Tightness: <span className="font-semibold text-slate-100">{assessment.scores.tightness.toFixed(0)}</span> (threshold {thresholds.tightnessRegime.toFixed(0)})</li>
          <li>• Yield curve slope: <span className="font-semibold text-slate-100">{(assessment.scores.curveSlope ?? 0).toFixed(2)}%</span></li>
        </ul>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Methodology primitives</h2>
        <ol className="space-y-2 text-sm text-slate-200">
          <li>1. Normalize live macro signals into comparable scales.</li>
          <li>2. Evaluate against deterministic thresholds.</li>
          <li>3. Map threshold states into posture regimes.</li>
          <li>4. Publish operating guidance plus trigger reversals.</li>
        </ol>
        <p className="text-xs text-slate-400">Last updated: {recordDateLabel}. Source: US Treasury + FRED + BLS live feeds. Next refresh: 15 minutes.</p>
      </section>
    </main>
  );
}
