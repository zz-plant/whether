import type { Metadata } from "next";
import { fetchTreasuryData } from "../lib/treasuryClient";
import { snapshotData } from "../lib/snapshot";
import { buildSensorReadings } from "../lib/sensors";
import { evaluateRegime } from "../lib/regimeEngine";
import { getPlaybookGuidance } from "../lib/playbook";
import {
  getLatestTimeMachineSnapshot,
  getTimeMachineCoverage,
  getTimeMachineYears,
  getTimeMachineMonthsByYear,
} from "../lib/timeMachineCache";
import {
  parseTimeMachineRequest,
  resolveTimeMachineSelection,
} from "../lib/timeMachineSelection";
import { macroSeries } from "../lib/macroSnapshot";
import { parseThresholdsFromSearchParams } from "../lib/thresholds";
import { DecisionShieldPanel } from "./components/decisionShieldPanel";
import { DisplayGuardian } from "./components/displayGuardian";
import {
  DataSourcePanel,
  MacroSignalsPanel,
  ExecutiveSnapshotPanel,
  HistoricalBanner,
  LiveTickerPanel,
  CxoFunctionPanel,
  OperatorRequestsPanel,
  PlaybookPanel,
  RegimeAssessmentCard,
  ScoreReadoutPanel,
  SensorArray,
  SignalMatrixPanel,
} from "./components/reportSections";
import { ExportBriefPanel } from "./components/exportBriefPanel";
import { ThresholdsPanel } from "./components/thresholdsPanel";
import { TimeMachinePanel } from "./components/timeMachinePanel";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});
const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const formatDateValue = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : dateFormatter.format(date);
};

const formatTimestampValue = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : timestampFormatter.format(date);
};

const buildYearOptions = (startYear: number, endYear: number) => {
  const years: number[] = [];
  for (let year = endYear; year >= startYear; year -= 1) {
    years.push(year);
  }
  return years;
};

export const generateMetadata = ({
  searchParams,
}: {
  searchParams?: { month?: string; year?: string };
}): Metadata => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://whether.report";
  const siteName = "Whether — Regime Station";
  const siteDescription =
    "Translate Treasury macro signals into plain-English operational constraints for product and engineering leaders.";
  const selection = resolveTimeMachineSelection(searchParams);
  const requestedSelection = parseTimeMachineRequest(searchParams);
  const baseUrl = new URL("/api/og", siteUrl);

  if (selection) {
    baseUrl.searchParams.set("month", String(selection.month));
    baseUrl.searchParams.set("year", String(selection.year));
  } else if (requestedSelection) {
    baseUrl.searchParams.set("month", String(requestedSelection.month));
    baseUrl.searchParams.set("year", String(requestedSelection.year));
    baseUrl.searchParams.set("status", "invalid");
  }

  const titleSuffix = selection?.banner ?? (requestedSelection ? "Time Machine Preview" : "Live");
  const title = `Whether Report — ${titleSuffix}`;
  const imageUrl = baseUrl.toString();

  return {
    title,
    description: siteDescription,
    openGraph: {
      type: "website",
      url: siteUrl,
      title,
      description: siteDescription,
      siteName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `Whether Report ${titleSuffix} Open Graph`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: siteDescription,
      images: [imageUrl],
    },
  };
};

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { month?: string; year?: string; [key: string]: string | undefined };
}) {
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

  const historicalSelection = resolveTimeMachineSelection(searchParams);
  const requestedSelection = parseTimeMachineRequest(searchParams);
  const treasuryPromise = fetchTreasuryData({
    snapshotFallback: snapshotData,
    asOf: historicalSelection?.asOf,
  });
  const liveTreasuryPromise = historicalSelection
    ? fetchTreasuryData({ snapshotFallback: snapshotData })
    : null;
  const now = new Date();
  const latestCache = getLatestTimeMachineSnapshot();
  const defaultMonth = latestCache?.month ?? now.getUTCMonth() + 1;
  const defaultYear = latestCache?.year ?? now.getUTCFullYear();
  const cacheCoverage = getTimeMachineCoverage();
  const cacheYears = getTimeMachineYears();
  const cacheMonthsByYear = getTimeMachineMonthsByYear();
  const invalidHistoricalSelection = Boolean(requestedSelection && !historicalSelection);
  const selectedMonth = requestedSelection?.month ?? defaultMonth;
  const selectedYear = requestedSelection?.year ?? defaultYear;
  const thresholds = parseThresholdsFromSearchParams(searchParams);
  const treasury = await treasuryPromise;
  const liveTreasury = liveTreasuryPromise ? await liveTreasuryPromise : treasury;
  const recordDateLabel = formatDateValue(treasury.record_date);
  const fetchedAtLabel = formatTimestampValue(treasury.fetched_at);
  const sensors = buildSensorReadings(treasury);
  const assessment = evaluateRegime(treasury, thresholds);
  const liveAssessment = historicalSelection ? evaluateRegime(liveTreasury, thresholds) : null;
  const { playbook, startItems, stopItems } = getPlaybookGuidance(assessment.regime);
  const fenceItems = assessment.constraints;
  const treasuryProvenance = {
    sourceLabel: "US Treasury Fiscal Data API",
    sourceUrl: treasury.source,
    timestampLabel: fetchedAtLabel,
    statusLabel: treasury.isLive ? "Live" : "Offline",
  };
  const macroProvenance = {
    sourceLabel: "FRED & US Treasury",
    sourceUrl: macroSeries[0]?.sourceUrl,
    timestampLabel: formatTimestampValue(macroSeries[0]?.fetched_at ?? treasury.fetched_at),
    statusLabel: macroSeries.some((signal) => signal.isLive) ? "Live" : "Offline",
  };
  const internalProvenance = {
    sourceLabel: "Whether internal backlog",
    timestampLabel: "Static catalog",
    statusLabel: "Offline",
  };
  const statusLabel = historicalSelection
    ? "Historical"
    : treasury.isLive
      ? "Live"
      : "Offline / Simulated";
  const historicalComparison =
    historicalSelection && liveAssessment
      ? {
          then: {
            regime: assessment.regime,
            recordDate: treasury.record_date,
            baseRate: assessment.scores.baseRate,
            curveSlope: assessment.scores.curveSlope,
            tightness: assessment.scores.tightness,
            riskAppetite: assessment.scores.riskAppetite,
          },
          now: {
            regime: liveAssessment.regime,
            recordDate: liveTreasury.record_date,
            baseRate: liveAssessment.scores.baseRate,
            curveSlope: liveAssessment.scores.curveSlope,
            tightness: liveAssessment.scores.tightness,
            riskAppetite: liveAssessment.scores.riskAppetite,
          },
        }
      : null;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <DisplayGuardian />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[680px] -translate-x-1/2 rounded-full bg-sky-500/10 blur-[180px]" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-[520px] w-[520px] rounded-full bg-indigo-500/10 blur-[200px]" />
      <div className="mx-auto max-w-6xl px-6 py-12 display-drift">
        <header className="relative flex flex-col gap-6 border-b border-slate-800/70 pb-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0 space-y-4">
              <p className="type-label text-slate-400">Regime Station</p>
              <div className="space-y-3">
                <h1 className="type-headline text-slate-100">Whether Report</h1>
                <p className="max-w-2xl type-data text-slate-300">
                  A deep-realist operating brief that translates Treasury signals into constraints you can
                  execute. Every output is sourced and time-stamped for traceability.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 rounded-3xl border border-slate-800/80 bg-slate-900/60 px-5 py-4 shadow-[0_0_0_1px_rgba(15,23,42,0.6)]">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Signal status</p>
              <span className="rounded-full border border-slate-700 px-4 py-1 text-xs uppercase tracking-[0.2em] text-slate-200">
                {statusLabel}
              </span>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-800/70 bg-slate-950/70 px-5 py-4 shadow-[0_0_0_1px_rgba(15,23,42,0.6)]">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Record date</p>
              <p className="mono mt-3 text-sm text-slate-100">{recordDateLabel}</p>
            </div>
            <div className="rounded-3xl border border-slate-800/70 bg-slate-950/70 px-5 py-4 shadow-[0_0_0_1px_rgba(15,23,42,0.6)]">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Fetched at</p>
              <p className="mono mt-3 text-sm text-slate-100">{fetchedAtLabel}</p>
            </div>
            <div className="rounded-3xl border border-slate-800/70 bg-slate-950/70 px-5 py-4 shadow-[0_0_0_1px_rgba(15,23,42,0.6)]">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Source</p>
              <a
                href={treasury.source}
                target="_blank"
                rel="noreferrer"
                className="touch-target mt-3 inline-flex min-h-[44px] items-center text-xs text-slate-300 underline decoration-slate-700 underline-offset-4 hover:text-slate-100"
              >
                US Treasury Fiscal Data API
              </a>
            </div>
          </div>
          <nav aria-label="Report sections" className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Jump to</p>
            <ul className="flex flex-wrap gap-3">
              {[
                { href: "#executive-snapshot", label: "Executive snapshot" },
                { href: "#regime-assessment", label: "Regime assessment" },
                { href: "#signal-matrix", label: "Signal matrix" },
                { href: "#data-source", label: "Data source" },
                { href: "#sensor-array", label: "Sensor array" },
                { href: "#macro-signals", label: "Macro signals" },
                { href: "#thresholds", label: "Thresholds" },
                { href: "#playbook", label: "Playbook" },
                { href: "#decision-shield", label: "Decision shield" },
                { href: "#export-briefs", label: "Export briefs" },
                { href: "#time-machine", label: "Time machine" },
                { href: "#cxo-functions", label: "CXO outputs" },
                { href: "#operator-requests", label: "Operator requests" },
              ].map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="inline-flex min-h-[44px] items-center rounded-full border border-slate-800/70 bg-slate-950/60 px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          {historicalSelection ? <HistoricalBanner banner={historicalSelection.banner} /> : null}
        </header>

        <ExecutiveSnapshotPanel
          treasury={treasury}
          assessment={assessment}
          provenance={treasuryProvenance}
        />

        <section className="mt-10 grid gap-6 lg:grid-cols-[2.2fr,1fr]">
          <RegimeAssessmentCard assessment={assessment} provenance={treasuryProvenance} />
          <div className="grid gap-6">
            <LiveTickerPanel treasury={treasury} assessment={assessment} provenance={treasuryProvenance} />
            <ScoreReadoutPanel assessment={assessment} provenance={treasuryProvenance} />
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr,1fr]">
          <SignalMatrixPanel assessment={assessment} provenance={treasuryProvenance} />
          <DataSourcePanel treasury={treasury} provenance={treasuryProvenance} />
        </section>

        <SensorArray sensors={sensors} provenance={treasuryProvenance} />

        <MacroSignalsPanel series={macroSeries} provenance={macroProvenance} />

        <ThresholdsPanel currentThresholds={assessment.thresholds} provenance={treasuryProvenance} />

        <PlaybookPanel
          playbook={playbook}
          stopItems={stopItems}
          startItems={startItems}
          fenceItems={fenceItems}
          provenance={treasuryProvenance}
        />

        <DecisionShieldPanel assessment={assessment} provenance={treasuryProvenance} />

        <ExportBriefPanel
          assessment={assessment}
          treasury={treasury}
          sensors={sensors}
          macroSeries={macroSeries}
          provenance={treasuryProvenance}
        />

        <TimeMachinePanel
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          years={cacheYears.length ? cacheYears : buildYearOptions(2000, defaultYear)}
          isHistorical={Boolean(historicalSelection)}
          latestRecordDate={treasury.record_date}
          cacheCoverage={cacheCoverage}
          monthsByYear={cacheMonthsByYear}
          invalidSelection={invalidHistoricalSelection}
          provenance={treasuryProvenance}
          historicalRegime={historicalSelection ? assessment.regime : null}
          historicalSummary={historicalSelection ? assessment.description : null}
          comparison={historicalComparison}
        />

        <CxoFunctionPanel provenance={internalProvenance} />

        <OperatorRequestsPanel provenance={internalProvenance} />

        <footer className="mt-12 border-t border-slate-800/70 pt-6 text-xs uppercase tracking-[0.3em] text-slate-500">
          Not Financial Advice.
        </footer>
      </div>
    </main>
  );
}
