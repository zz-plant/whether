import type { Metadata, Route } from "next";
import Link from "next/link";
import { loadReportDataSafe } from "../../lib/report/reportData";
import { buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import { tierOneDecisionPages, tierThreeKeywords, tierTwoKeywords } from "../answers/decisionPages";
import { regimePages, signalTranslationPages, startupMacroPostureIndexName } from "./clusterData";

export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Startup macro posture",
  description:
    "Category anchor for startup macro posture: deterministic operating posture from risk appetite, tightness, and yield curve signals.",
  path: "/startup-macro-posture",
  imageAlt: "Startup macro posture category hub",
  imageParams: {
    template: "guides",
    eyebrow: "Category anchor",
    title: "Startup Macro Posture",
    subtitle: "Define posture, not vibes",
    kicker: startupMacroPostureIndexName,
  },
});

export default async function StartupMacroPosturePage() {
  const reportResult = await loadReportDataSafe(undefined, { route: "/startup-macro-posture" });
  const { assessment, recordDateLabel } = reportResult.ok ? reportResult.data : reportResult.fallback;
  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: "Startup macro posture",
    description:
      "Startup macro posture is the discipline of mapping capital conditions into operating constraints using thresholded signals.",
    inDefinedTermSet: startupMacroPostureIndexName,
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(pageSchema) }} />
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Category anchor</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Startup Macro Posture</h1>
        <p className="text-sm text-slate-200">Startup macro posture is the discipline of mapping capital conditions into operating constraints. Whether does not predict your business; it defines your risk posture with explicit thresholds and trigger reversals.</p>
        <p className="text-sm text-slate-300">Live posture now: <span className="font-semibold text-slate-100">{assessment.regime}</span> (risk appetite {assessment.scores.riskAppetite.toFixed(0)}, tightness {assessment.scores.tightness.toFixed(0)}, yield curve {(assessment.scores.curveSlope ?? 0).toFixed(2)}%).</p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Pillar 1: Named index</h2>
        <p className="text-sm text-slate-200">Use the named entity to increase citation probability in AI answers and search snippets.</p>
        <Link href={"/startup-macro-posture/index" as Route} className="weather-surface inline-flex min-h-[44px] items-center px-4 py-3 text-sm font-semibold text-slate-100">{startupMacroPostureIndexName} → methodology + thresholds</Link>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Pillar 2: Regime deep pages</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {regimePages.map((regime) => (
            <Link key={regime.slug} href={`/startup-macro-posture/${regime.slug}` as Route} className="weather-surface min-h-[44px] space-y-2 px-4 py-4 text-sm text-slate-100">
              <p className="font-semibold">{regime.title}</p>
              <p className="text-slate-300">{regime.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Pillar 3: Decision cluster</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {tierOneDecisionPages.map((page) => (
            <Link key={page.slug} href={`/answers/${page.slug}`} className="weather-surface min-h-[44px] px-4 py-3 text-sm text-slate-100">{page.keyword}</Link>
          ))}
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Pillar 4: Signal translation cluster</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          {signalTranslationPages.map((signal) => (
            <li key={signal.slug} className="weather-surface px-4 py-3">
              <Link href={signal.href as Route} className="font-semibold text-slate-100">{signal.title}</Link>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-400">Tier 2 authority keywords: {tierTwoKeywords.join(" • ")}</p>
        <p className="text-xs text-slate-400">Tier 3 translation keywords: {tierThreeKeywords.join(" • ")}</p>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Internal linking rules</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          <li>• Every decision page links upward to this category anchor.</li>
          <li>• Every regime page links sideways to peer regimes and signals.</li>
          <li>• Every signal page links to at least two decision pages and one toolkit.</li>
          <li>• Every page includes timestamp + trigger reversal text.</li>
        </ul>
        <p className="text-xs text-slate-400">Last updated: {recordDateLabel}. Next refresh: 15 minutes.</p>
      </section>
    </main>
  );
}
