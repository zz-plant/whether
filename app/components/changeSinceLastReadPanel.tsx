/**
 * Panel for summarizing changes since the last report view.
 * Persists a lightweight snapshot in localStorage for delta comparisons.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import type { RegimeAssessment } from "../../lib/regimeEngine";
import type { LastYearComparison } from "../../lib/report/reportData";
import { buildRegimeChangeReasons } from "../../lib/regimeEngine";
import { formatDateUTC } from "../../lib/formatters";
import { DataProvenanceStrip, type DataProvenance } from "./dataProvenanceStrip";
import { regimeAlertsStorageKey, type RegimeAlertLogEntry } from "./regimeAlertsStorage";

type LastReadSnapshot = {
  recordDate: string;
  assessment: RegimeAssessment;
  readAt: string;
};

export const LAST_READ_SNAPSHOT_STORAGE_KEY = "whether.lastReadSnapshot";

const formatDate = (value: string) => formatDateUTC(value);

const formatDelta = (thenValue: number, nowValue: number, unit = "") => {
  const delta = nowValue - thenValue;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(2)}${unit}`;
};

const formatOptionalDelta = (thenValue: number | null, nowValue: number | null, unit = "") =>
  thenValue === null || nowValue === null ? "—" : formatDelta(thenValue, nowValue, unit);

const getImpactTone = (value: number) => {
  if (value >= 1.5) {
    return { label: "High impact", className: "border-rose-300/80 bg-rose-500/15 text-rose-100" };
  }
  if (value >= 0.75) {
    return { label: "Medium impact", className: "border-amber-300/80 bg-amber-500/15 text-amber-100" };
  }
  return { label: "Low impact", className: "border-emerald-300/80 bg-emerald-500/15 text-emerald-100" };
};

const hasAssessmentChanged = (
  previous: LastReadSnapshot,
  current: RegimeAssessment,
  recordDate: string
) =>
  previous.recordDate !== recordDate ||
  previous.assessment.regime !== current.regime ||
  previous.assessment.scores.tightness !== current.scores.tightness ||
  previous.assessment.scores.riskAppetite !== current.scores.riskAppetite ||
  previous.assessment.scores.baseRate !== current.scores.baseRate ||
  previous.assessment.scores.curveSlope !== current.scores.curveSlope;

export const ChangeSinceLastReadPanel = ({
  assessment,
  lastYearComparison,
  recordDate,
  provenance,
}: {
  assessment: RegimeAssessment;
  lastYearComparison: LastYearComparison | null;
  recordDate: string;
  provenance: DataProvenance;
}) => {
  const [previous, setPrevious] = useState<LastReadSnapshot | null>(null);

  useEffect(() => {
    let storedSnapshot: LastReadSnapshot | null = null;
    try {
      const stored = window.localStorage.getItem(LAST_READ_SNAPSHOT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as LastReadSnapshot;
        if (parsed?.recordDate && parsed?.assessment?.regime) {
          storedSnapshot = parsed;
          setPrevious(parsed);
        }
      }
    } catch {
      // Ignore storage errors to keep console clean.
    }

    const loggedAt = new Date().toISOString();
    const nextSnapshot: LastReadSnapshot = {
      recordDate,
      assessment,
      readAt: loggedAt,
    };

    if (storedSnapshot && hasAssessmentChanged(storedSnapshot, assessment, recordDate)) {
      const reasons = buildRegimeChangeReasons(storedSnapshot.assessment, assessment);
      const alertEntry: RegimeAlertLogEntry = {
        id:
          typeof crypto?.randomUUID === "function"
            ? crypto.randomUUID()
            : `${recordDate}-${loggedAt}`,
        loggedAt,
        previous: {
          recordDate: storedSnapshot.recordDate,
          assessment: storedSnapshot.assessment,
        },
        current: {
          recordDate,
          assessment,
        },
        reasons,
      };

      try {
        const storedAlerts = window.localStorage.getItem(regimeAlertsStorageKey);
        const parsedAlerts = storedAlerts
          ? (JSON.parse(storedAlerts) as RegimeAlertLogEntry[])
          : [];
        const alerts = Array.isArray(parsedAlerts) ? parsedAlerts : [];
        const latest = alerts[0];
        const isDuplicate =
          latest &&
          latest.current.recordDate === alertEntry.current.recordDate &&
          latest.previous.recordDate === alertEntry.previous.recordDate &&
          latest.current.assessment.regime === alertEntry.current.assessment.regime &&
          latest.previous.assessment.regime === alertEntry.previous.assessment.regime;

        if (!isDuplicate) {
          const nextAlerts = [alertEntry, ...alerts].slice(0, 20);
          window.localStorage.setItem(regimeAlertsStorageKey, JSON.stringify(nextAlerts));

          void fetch("/api/regime-alerts", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              previousRecordDate: storedSnapshot.recordDate,
              currentRecordDate: recordDate,
              previousAssessment: storedSnapshot.assessment,
              currentAssessment: assessment,
              reasons,
              sourceUrls: Array.from(
                new Set(
                  [
                    ...storedSnapshot.assessment.inputs.map((input) => input.sourceUrl),
                    ...assessment.inputs.map((input) => input.sourceUrl),
                  ].filter(Boolean),
                ),
              ),
              timeMachineHref: `/signals#time-machine`,
            }),
          }).catch(() => {
            // Ignore network failures and keep local alerting as fallback.
          });
        }
      } catch {
        // Ignore storage errors to keep console clean.
      }
    }

    try {
      window.localStorage.setItem(LAST_READ_SNAPSHOT_STORAGE_KEY, JSON.stringify(nextSnapshot));
    } catch {
      // Ignore storage errors to keep console clean.
    }
  }, [assessment, recordDate]);

  const timeMachineLink = useMemo(() => {
    if (!previous) {
      return "/signals#time-machine";
    }
    const date = new Date(previous.recordDate);
    if (Number.isNaN(date.valueOf())) {
      return "/signals#time-machine";
    }
    const month = date.getUTCMonth() + 1;
    const year = date.getUTCFullYear();
    return `/?month=${month}&year=${year}`;
  }, [previous]);

  const hasChange =
    previous &&
    hasAssessmentChanged(previous, assessment, recordDate);

  const impactItems = previous
    ? [
        {
          label: "Tightness",
          delta: Math.abs(assessment.scores.tightness - previous.assessment.scores.tightness),
          href: "#weekly-action-summary",
        },
        {
          label: "Risk appetite",
          delta: Math.abs(
            assessment.scores.riskAppetite - previous.assessment.scores.riskAppetite,
          ),
          href: "#executive-snapshot",
        },
        {
          label: "Base rate",
          delta: Math.abs(assessment.scores.baseRate - previous.assessment.scores.baseRate),
          href: "#signal-matrix",
        },
      ]
        .map((item) => ({ ...item, tone: getImpactTone(item.delta) }))
        .sort((left, right) => right.delta - left.delta)
    : [];
  const topImpactItems = impactItems.slice(0, 2);

  return (
    <section
      id="change-since-last-read"
      aria-labelledby="change-since-last-read-title"
      className="mt-10"
    >
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">What changed since last read</p>
            <h3 id="change-since-last-read-title" className="type-section text-slate-100">
              Delta snapshot
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Since your last review, these are the highest-impact deltas and where to act first.
            </p>
            {previous ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {topImpactItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className={`inline-flex min-h-[44px] items-center rounded-full border px-3 py-2 text-xs font-semibold tracking-[0.12em] touch-manipulation ${item.tone.className}`}
                  >
                    {item.label}: {item.tone.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
          <DataProvenanceStrip provenance={provenance} />
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Delta signals</p>
            <p className="mt-2 text-sm text-slate-200">
              Previous read:{" "}
              <span className="mono text-slate-100">
                {previous ? formatDate(previous.recordDate) : "—"}
              </span>
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  Regime shift
                </p>
                <p className="mt-2 text-sm text-slate-100">
                  {previous ? `${previous.assessment.regime} → ${assessment.regime}` : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  Tightness delta
                </p>
                <p className="mt-2 text-sm text-slate-100">
                  {previous
                    ? formatDelta(previous.assessment.scores.tightness, assessment.scores.tightness)
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  Risk appetite delta
                </p>
                <p className="mt-2 text-sm text-slate-100">
                  {previous
                    ? formatDelta(
                        previous.assessment.scores.riskAppetite,
                        assessment.scores.riskAppetite
                      )
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  Base rate delta
                </p>
                <p className="mt-2 text-sm text-slate-100">
                  {previous
                    ? formatDelta(previous.assessment.scores.baseRate, assessment.scores.baseRate, "%")
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  Curve slope delta
                </p>
                <p className="mt-2 text-sm text-slate-100">
                  {previous
                    ? formatOptionalDelta(
                        previous.assessment.scores.curveSlope,
                        assessment.scores.curveSlope,
                        "%"
                      )
                    : "—"}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              {previous
                ? `Last read logged ${formatDate(previous.readAt)}.`
                : "No previous read captured yet. Open the report again to view a delta snapshot."}
            </p>
            {previous ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href="#weekly-action-summary"
                  className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 hover:border-sky-400/70 hover:text-slate-100"
                >
                  Jump to action priorities
                </a>
                <a
                  href="#executive-snapshot"
                  className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 hover:border-sky-400/70 hover:text-slate-100"
                >
                  Jump to leadership readout
                </a>
              </div>
            ) : null}
            {hasChange ? (
              <p className="mt-4 text-xs text-emerald-200">
                Changes detected since your last read.
              </p>
            ) : (
              <p className="mt-4 text-xs text-slate-500">
                No detected deltas yet. Keep checking as new Treasury data arrives.
              </p>
            )}
          </div>
          <div className="weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
              Replay the last view
            </p>
            <p className="mt-3 text-sm text-slate-200">
              Use Time Machine to replay the exact month from your previous read and share the
              delta in leadership syncs.
            </p>
            <a
              href={timeMachineLink}
              className="weather-button-primary mt-4 inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.2em] text-slate-100 transition-colors hover:border-sky-300/80 hover:text-white touch-manipulation"
            >
              Open Time Machine
            </a>

            <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                Last-year snapshot (nearest cached)
              </p>
              {lastYearComparison ? (
                <>
                  <p className="mt-2 text-sm text-slate-200">
                    {formatDate(lastYearComparison.prior.recordDate)}: {lastYearComparison.prior.regime}
                    {" "}→ now: {lastYearComparison.current.regime}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    Tightness {formatDelta(lastYearComparison.prior.tightness, lastYearComparison.current.tightness)} · Risk appetite {formatDelta(lastYearComparison.prior.riskAppetite, lastYearComparison.current.riskAppetite)}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  Historical match unavailable for this week in the Time Machine cache.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

type DeltaMetricKey = "tightness" | "riskAppetite" | "baseRate";

const getDeltaValueForMetric = ({
  metric,
  current,
  previous,
}: {
  metric: DeltaMetricKey;
  current: RegimeAssessment;
  previous: RegimeAssessment;
}) => {
  switch (metric) {
    case "tightness":
      return Math.abs(current.scores.tightness - previous.scores.tightness);
    case "riskAppetite":
      return Math.abs(current.scores.riskAppetite - previous.scores.riskAppetite);
    case "baseRate":
      return Math.abs(current.scores.baseRate - previous.scores.baseRate);
    default:
      return 0;
  }
};

export const ReturningVisitorDeltaStrip = ({
  assessment,
  recordDate,
  impactLinks,
  openPanelHref = "#change-since-last-read",
}: {
  assessment: RegimeAssessment;
  recordDate: string;
  impactLinks?: Array<{ label: string; href: string; metric: DeltaMetricKey }>;
  openPanelHref?: string;
}) => {
  const [previous, setPrevious] = useState<LastReadSnapshot | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LAST_READ_SNAPSHOT_STORAGE_KEY);
      if (!stored) {
        return;
      }
      const parsed = JSON.parse(stored) as LastReadSnapshot;
      if (parsed?.recordDate && parsed?.assessment?.regime) {
        setPrevious(parsed);
      }
    } catch {
      // Ignore storage errors to keep console clean.
    }
  }, []);

  if (!previous) {
    return null;
  }

  const hasChange = hasAssessmentChanged(previous, assessment, recordDate);
  if (!hasChange) {
    return null;
  }

  const defaultImpactLinks = [
    { label: "Tightness", href: "#weekly-action-summary", metric: "tightness" as const },
    { label: "Risk appetite", href: "#executive-snapshot", metric: "riskAppetite" as const },
    { label: "Base rate", href: "#signal-matrix", metric: "baseRate" as const },
  ];
  const configuredImpactLinks = impactLinks && impactLinks.length > 0 ? impactLinks : defaultImpactLinks;

  const impactItems = configuredImpactLinks
    .map((item) => ({
      ...item,
      delta: getDeltaValueForMetric({
        metric: item.metric,
        current: assessment,
        previous: previous.assessment,
      }),
    }))
    .map((item) => ({ ...item, tone: getImpactTone(item.delta) }))
    .sort((left, right) => right.delta - left.delta)
    .slice(0, 3);

  return (
    <section
      aria-labelledby="returning-visitor-delta-title"
      className="weather-panel border-sky-500/40 bg-slate-950/90 px-4 py-4 sm:px-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-400">Since your last review</p>
          <h2 id="returning-visitor-delta-title" className="text-base font-semibold text-slate-100 sm:text-lg">
            What changed and where to act first.
          </h2>
          <p className="text-xs text-slate-300">
            Previous snapshot {formatDate(previous.recordDate)} · now {formatDate(recordDate)}
          </p>
        </div>
        <a
          href={openPanelHref}
          className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.12em] text-sky-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
        >
          Open full delta panel
        </a>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Returning visitor impact tags">
        {impactItems.map((item) => (
          <li key={item.label}>
            <a
              href={item.href}
              className={`inline-flex min-h-[44px] items-center rounded-full border px-3 py-2 text-xs font-semibold tracking-[0.12em] touch-manipulation ${item.tone.className}`}
            >
              {item.label} · {item.tone.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
};
