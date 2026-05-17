"use client";

import { useEffect, useState } from "react";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import { formatDateLabel } from "../../../lib/report/signalFormatting";
import { literacyAssistStorageKeys, type LiteracyAssistMode } from "../../../lib/literacyAssist";
import {
  getImpactTone,
  hasAssessmentChanged,
  readStoredSnapshot,
  writeStoredSnapshot,
  type LastReadSnapshot,
} from "./storage";

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
  openPanelLabel = "Open full delta panel",
  focusImpactLinks,
}: {
  assessment: RegimeAssessment;
  recordDate: string;
  impactLinks?: Array<{ label: string; href: string; metric: DeltaMetricKey }>;
  openPanelHref?: string;
  openPanelLabel?: string;
  focusImpactLinks?: Partial<Record<LiteracyAssistMode, Array<{ label: string; href: string; metric: DeltaMetricKey }>>>;
}) => {
  const [previous, setPrevious] = useState<LastReadSnapshot | null>(null);
  const [preferredFocus, setPreferredFocus] = useState<LiteracyAssistMode>("decision");

  useEffect(() => {
    const storedSnapshot = readStoredSnapshot();
    if (storedSnapshot) {
      setPrevious(storedSnapshot);
    }
    try {
      const storedFocus = window.localStorage.getItem(literacyAssistStorageKeys.focus);
      if (
        storedFocus === "decision"
        || storedFocus === "evidence"
        || storedFocus === "trust"
        || storedFocus === "share"
      ) {
        setPreferredFocus(storedFocus);
      }
    } catch {
      // Ignore storage errors.
    }
    writeStoredSnapshot({ assessment, recordDate });
  }, [assessment, recordDate]);

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
  const configuredImpactLinks = (
    focusImpactLinks?.[preferredFocus]
    ?? (impactLinks && impactLinks.length > 0 ? impactLinks : defaultImpactLinks)
  );

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

  const titleByFocus: Record<LiteracyAssistMode, string> = {
    decision: "What changed for your current call.",
    evidence: "What changed in the evidence behind the call.",
    trust: "What changed in reliability and approval confidence.",
    share: "What changed before you re-share this brief.",
  };
  const subtitleByFocus: Record<LiteracyAssistMode, string> = {
    decision: "Use these tags to decide whether this week’s plan should change.",
    evidence: "Use these tags to jump to the signal layer that moved most.",
    trust: "Use these tags to see whether freshness or confidence should change your posture.",
    share: "Use these tags to decide whether the artifact needs a fresh explanation before you send it.",
  };

  return (
    <section
      aria-labelledby="returning-visitor-delta-title"
      className="weather-panel border-sky-500/40 bg-slate-950/90 px-4 py-4 sm:px-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-400">Since your last review</p>
          <h2 id="returning-visitor-delta-title" className="text-base font-semibold text-slate-100 sm:text-lg">
            {titleByFocus[preferredFocus]}
          </h2>
          <p className="text-xs text-slate-300">
            Previous snapshot {formatDateLabel(previous.recordDate)} · now {formatDateLabel(recordDate)}
          </p>
          <p className="text-xs text-slate-400">{subtitleByFocus[preferredFocus]}</p>
        </div>
        <a
          href={openPanelHref}
          className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.12em] text-sky-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
        >
          {openPanelLabel}
        </a>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Returning visitor impact tags">
        {impactItems.map((item) => (
          <li key={item.label}>
            <a
              href={item.href}
              className={`inline-flex min-h-[44px] items-center rounded-full border px-3 py-2 text-xs font-semibold tracking-[0.12em] ${item.tone.className}`}
            >
              {item.label} · {item.tone.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
};
