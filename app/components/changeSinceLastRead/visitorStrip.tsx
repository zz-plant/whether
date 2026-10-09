"use client";

import { useEffect } from "react";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import { formatDateLabel } from "../../../lib/report/signalFormatting";
import { TrendGlyph, describeTrend, trendDirectionFromDelta } from "../illustrations/TrendGlyph";
import { useBrowserSource } from "../browserSource";
import {
  getImpactTone,
  hasAssessmentChanged,
  lastReadSnapshotSource,
  rememberReadSnapshot,
} from "./storage";

type DeltaMetricKey = "tightness" | "riskAppetite" | "baseRate";

/**
 * Which way counts as favourable per metric. Tightness and base rate rise when
 * capital gets more expensive; risk appetite rises when it loosens.
 */
const METRIC_INCREASE_IS_POSITIVE: Record<DeltaMetricKey, boolean> = {
  tightness: false,
  riskAppetite: true,
  baseRate: false,
};

/**
 * Signed, deliberately. This used to return `Math.abs(...)`, which meant the
 * one panel whose whole job is "what moved since you last looked" could never
 * say which way anything moved.
 */
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
      return current.scores.tightness - previous.scores.tightness;
    case "riskAppetite":
      return current.scores.riskAppetite - previous.scores.riskAppetite;
    case "baseRate":
      return current.scores.baseRate - previous.scores.baseRate;
    default:
      return 0;
  }
};

/*
 * `impactLinks` and `openPanelHref` were optional, with defaults pointing at
 * `#weekly-action-summary`, `#executive-snapshot`, `#signal-matrix` and
 * `#change-since-last-read`. None of those four ids is rendered anywhere in the
 * app. The one caller passes its own links, so the fallback never shipped — it
 * was a set of dead anchors kept alive by never being reached, and the next
 * caller to leave the prop off would have shipped three links to nowhere.
 * Required now: a link target is the caller's to know.
 */
export const ReturningVisitorDeltaStrip = ({
  assessment,
  recordDate,
  impactLinks,
  openPanelHref,
  openPanelLabel = "Open full delta panel",
}: {
  assessment: RegimeAssessment;
  recordDate: string;
  impactLinks: Array<{ label: string; href: string; metric: DeltaMetricKey }>;
  openPanelHref: string;
  openPanelLabel?: string;
}) => {
  const previous = useBrowserSource(lastReadSnapshotSource);

  useEffect(() => {
    rememberReadSnapshot({ assessment, recordDate });
  }, [assessment, recordDate]);

  if (!previous) {
    return null;
  }

  const hasChange = hasAssessmentChanged(previous, assessment, recordDate);
  if (!hasChange) {
    return null;
  }

  const impactItems = impactLinks
    .map((item) => ({
      ...item,
      delta: getDeltaValueForMetric({
        metric: item.metric,
        current: assessment,
        previous: previous.assessment,
      }),
    }))
    .map((item) => ({
      ...item,
      tone: getImpactTone(item.delta, {
        increaseIsPositive: METRIC_INCREASE_IS_POSITIVE[item.metric],
      }),
    }))
    // Rank by size of move; the sign is carried by the tag, not by the order.
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
    .slice(0, 3);

  /*
   * This heading and subtitle used to be one of four pairs, chosen by a
   * `preferredFocus` read from `whether.literacy.focus`. Nothing in the repo
   * ever wrote that key, and the impact links it also selected came from a
   * `focusImpactLinks` prop no caller passed — so the decision pair below is
   * what every visitor has always seen. The other three went with the key.
   */

  return (
    <section
      aria-labelledby="returning-visitor-delta-title"
      className="weather-panel border-sky-500/40 bg-slate-950/90 px-4 py-4 sm:px-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          {/* "Since your last review" was a kicker over "What changed for your
              current guidance."; the heading says it in one line (2026-10-09). */}
          <h2 id="returning-visitor-delta-title" className="text-base font-semibold text-slate-100 sm:text-lg">
            What changed since your last review
          </h2>
          <p className="text-xs text-slate-300">
            Previous snapshot {formatDateLabel(previous.recordDate)} · now {formatDateLabel(recordDate)}
          </p>
        </div>
        <a
          href={openPanelHref}
          className="inline-flex min-h-[44px] items-center text-xs font-semibold text-sky-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
        >
          {openPanelLabel}
        </a>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Returning visitor impact tags">
        {impactItems.map((item) => (
          <li key={item.label}>
            <a
              href={item.href}
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-sm border px-3 py-2 text-xs font-semibold ${item.tone.className}`}
            >
              <TrendGlyph direction={trendDirectionFromDelta(item.delta)} className="h-3.5 w-3.5 shrink-0" />
              <span aria-hidden="true">
                {item.label} · {item.tone.label}
              </span>
              <span className="sr-only">
                {describeTrend({
                  label: item.label,
                  delta: item.delta,
                  period: "since your last review",
                })}{" "}
                {item.tone.impactLabel}.
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
};
