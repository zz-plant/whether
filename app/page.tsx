import { fetchTreasuryData } from "../lib/treasuryClient";
import { snapshotData } from "../lib/snapshot";
import { buildSensorReadings } from "../lib/sensors";
import { evaluateRegime } from "../lib/regimeEngine";
import { getPlaybookGuidance } from "../lib/playbook";
import { formatHistoricalBanner, resolveHistoricalDate } from "../lib/timeMachine";
import {
  getLatestTimeMachineSnapshot,
  hasTimeMachineEntry,
  getTimeMachineCoverage,
  getTimeMachineYears,
  getTimeMachineMonthsByYear,
} from "../lib/timeMachineCache";
import { DecisionShieldPanel } from "./components/decisionShieldPanel";
import { DisplayGuardian } from "./components/displayGuardian";
import {
  DataSourcePanel,
  ExecutiveSnapshotPanel,
  HistoricalBanner,
  LiveTickerPanel,
  PlaybookPanel,
  RegimeAssessmentCard,
  ScoreReadoutPanel,
  SensorArray,
  SignalMatrixPanel,
  TimeMachinePanel,
} from "./components/reportSections";

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

const parseHistoricalSelection = (searchParams?: { month?: string; year?: string }) => {
  if (!searchParams?.month || !searchParams?.year) {
    return null;
  }

  const month = Number(searchParams.month);
  const year = Number(searchParams.year);

  if (!Number.isInteger(month) || !Number.isInteger(year)) {
    return null;
  }

  if (month < 1 || month > 12) {
    return null;
  }

  if (year < 2000) {
    return null;
  }

  if (!hasTimeMachineEntry(year, month)) {
    return null;
  }

  const asOf = resolveHistoricalDate(year, month);
  return {
    month,
    year,
    asOf,
    banner: formatHistoricalBanner(year, month),
  };
};

const parseRequestedSelection = (searchParams?: { month?: string; year?: string }) => {
  if (!searchParams?.month || !searchParams?.year) {
    return null;
  }

  const month = Number(searchParams.month);
  const year = Number(searchParams.year);

  if (!Number.isInteger(month) || !Number.isInteger(year)) {
    return null;
  }

  if (month < 1 || month > 12) {
    return null;
  }

  if (year < 2000) {
    return null;
  }

  return { month, year };
};

const buildYearOptions = (startYear: number, endYear: number) => {
  const years: number[] = [];
  for (let year = endYear; year >= startYear; year -= 1) {
    years.push(year);
  }
  return years;
};

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { month?: string; year?: string };
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

  const now = new Date();
  const latestCache = getLatestTimeMachineSnapshot();
  const defaultMonth = latestCache?.month ?? now.getUTCMonth() + 1;
  const defaultYear = latestCache?.year ?? now.getUTCFullYear();
  const cacheCoverage = getTimeMachineCoverage();
  const cacheYears = getTimeMachineYears();
  const cacheMonthsByYear = getTimeMachineMonthsByYear();
  const historicalSelection = parseHistoricalSelection(searchParams);
  const requestedSelection = parseRequestedSelection(searchParams);
  const invalidHistoricalSelection = Boolean(requestedSelection && !historicalSelection);
  const selectedMonth = requestedSelection?.month ?? defaultMonth;
  const selectedYear = requestedSelection?.year ?? defaultYear;
  const treasury = await fetchTreasuryData({
    snapshotFallback: snapshotData,
    asOf: historicalSelection?.asOf,
  });
  const recordDateLabel = formatDateValue(treasury.record_date);
  const fetchedAtLabel = formatTimestampValue(treasury.fetched_at);
  const sensors = buildSensorReadings(treasury);
  const assessment = evaluateRegime(treasury);
  const { playbook, startItems, stopItems } = getPlaybookGuidance(assessment.regime);
  const fenceItems = assessment.constraints;
  const statusLabel = historicalSelection
    ? "Historical"
    : treasury.isLive
      ? "Live"
      : "Offline / Simulated";

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-slate-950 text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <DisplayGuardian />
      <div className="mx-auto max-w-6xl px-6 py-12 display-drift">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Regime Station</p>
              <h1 className="text-3xl font-semibold">Whether Report</h1>
            </div>
            <span className="rounded-full border border-slate-700 px-4 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
              {statusLabel}
            </span>
          </div>
          <p className="max-w-3xl text-slate-300">
            Translate Treasury signals into operational constraints. Every output is sourced and time-stamped
            for traceability.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Record date</p>
              <p className="mono mt-2 text-sm text-slate-100">{recordDateLabel}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Fetched at</p>
              <p className="mono mt-2 text-sm text-slate-100">{fetchedAtLabel}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Source</p>
              <a
                href={treasury.source}
                target="_blank"
                rel="noreferrer"
                className="touch-target mt-2 block text-xs text-slate-300 underline decoration-slate-700 underline-offset-4 hover:text-slate-100"
              >
                US Treasury Fiscal Data API
              </a>
            </div>
          </div>
          <nav aria-label="Report sections" className="mt-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Jump to</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {[
                { href: "#executive-snapshot", label: "Executive snapshot" },
                { href: "#regime-assessment", label: "Regime assessment" },
                { href: "#signal-matrix", label: "Signal matrix" },
                { href: "#sensor-array", label: "Sensor array" },
                { href: "#playbook", label: "Playbook" },
                { href: "#decision-shield", label: "Decision shield" },
                { href: "#time-machine", label: "Time machine" },
                { href: "#data-source", label: "Data source" },
              ].map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="inline-flex min-h-[44px] items-center rounded-full border border-slate-800 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          {historicalSelection ? <HistoricalBanner banner={historicalSelection.banner} /> : null}
        </header>

        <ExecutiveSnapshotPanel treasury={treasury} assessment={assessment} modeLabel={statusLabel} />

        <section className="mt-10 grid gap-6 lg:grid-cols-[2.2fr,1fr]">
          <RegimeAssessmentCard assessment={assessment} />
          <div className="grid gap-6">
            <LiveTickerPanel treasury={treasury} assessment={assessment} modeLabel={statusLabel} />
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

        <DecisionShieldPanel assessment={assessment} />

        <TimeMachinePanel
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          years={cacheYears.length ? cacheYears : buildYearOptions(2000, defaultYear)}
          isHistorical={Boolean(historicalSelection)}
          latestRecordDate={treasury.record_date}
          cacheCoverage={cacheCoverage}
          monthsByYear={cacheMonthsByYear}
          invalidSelection={invalidHistoricalSelection}
        />

        <footer className="mt-12 border-t border-slate-800 pt-6 text-xs text-slate-500">
          Not Financial Advice.
        </footer>
      </div>
    </main>
  );
}
