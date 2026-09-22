"use client";

import { useMemo } from "react";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import { getRegimePublicLabel } from "../../../lib/regimePresentation";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { insightDatabase } from "../../../data/recommendations";
import { ClipboardActionRow } from "../../components/clipboardActionRow";
import { DataProvenanceStrip, type DataProvenance } from "../../components/dataProvenanceStrip";
import { getClipboardUiState, useClipboardCopy } from "../../components/useClipboardCopy";

type ExecutiveTemplate =
  (typeof insightDatabase.executiveBriefingSuite.regimes)[number];

export const buildExecutiveMemo = (
  assessment: RegimeAssessment,
  recordDateLabel: string,
  template: ExecutiveTemplate | undefined
) => {

  if (!template) {
    return "No memo for this week's call.";
  }

  return [
    `Brief — ${recordDateLabel}`,
    `This week's call: ${getRegimePublicLabel(assessment.regime)}`,
    "",
    `Summary: ${template.executiveSummary}`,
    "",
    "Pause-if checks:",
    ...template.decisionGuardrails.map((item) => `• ${item}`),
    "",
    "Decision templates:",
    ...template.decisionTemplates.map((item) => `• ${item}`),
    "",
    "Change-course signals:",
    ...template.reversalTriggers.map((item) => `• ${item}`),
  ].join("\n");
};

export const buildGuardrailChecklist = (
  assessment: RegimeAssessment,
  template: ExecutiveTemplate | undefined
) => {

  if (!template) {
    return "Pause-if checklist unavailable.";
  }

  return [
    `Pause-if Checklist — ${getRegimePublicLabel(assessment.regime)}`,
    ...template.decisionGuardrails.map((item) => `• ${item}`),
  ].join("\n");
};

const visualSections = [
  {
    key: "decisionGuardrails",
    title: "Pause-if checks",
    subtitle: "Do this by default",
    badge: "Operate",
    icon: "🛡️",
    surfaceClass: "border-sky-400/35 bg-sky-500/10",
  },
  {
    key: "decisionTemplates",
    title: "Decision calls",
    subtitle: "Ready-made calls",
    badge: "Translate",
    icon: "🧭",
    surfaceClass: "border-emerald-400/35 bg-emerald-500/10",
  },
  {
    key: "reversalTriggers",
    title: "Change-course signals",
    subtitle: DECISION_CONTRACT_LABELS.watch.flipWatch,
    badge: "Watch",
    icon: "↩",
    surfaceClass: "border-violet-400/35 bg-violet-500/10",
  },
] as const;

export const ExecutiveBriefingPanel = ({
  assessment,
  recordDateLabel,
  provenance,
  showProvenance = true,
}: {
  assessment: RegimeAssessment;
  recordDateLabel: string;
  provenance: DataProvenance;
  showProvenance?: boolean;
}) => {
  const { status, error, activeTarget, copiedTarget, copyToClipboard } =
    useClipboardCopy();

  const template = useMemo(
    () =>
      insightDatabase.executiveBriefingSuite.regimes.find(
        (entry) => entry.key === assessment.regime
      ),
    [assessment.regime]
  );

  const executiveMemo = useMemo(
    () => buildExecutiveMemo(assessment, recordDateLabel, template),
    [assessment, recordDateLabel, template]
  );
  const guardrailChecklist = useMemo(
    () => buildGuardrailChecklist(assessment, template),
    [assessment, template]
  );


  return (
    <section
      id="executive-briefing"
      aria-labelledby="executive-briefing-title"
      className="mt-10"
    >
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Brief</p>
            <h3 id="executive-briefing-title" className="type-section text-slate-100">
              {insightDatabase.executiveBriefingSuite.title}
            </h3>
            <p className="mt-2 type-data text-slate-300">
              {insightDatabase.executiveBriefingSuite.subtitle}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Turn this week&apos;s call into rules you can share.
            </p>
          </div>
          {showProvenance ? <DataProvenanceStrip provenance={provenance} /> : null}
        </div>
        <div className="mt-6 space-y-4">
          {template ? (
            <>
              <div className="weather-surface border border-sky-400/35 bg-sky-500/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.12em] text-slate-300">
                      Summary
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-50">
                      {template.executiveSummary}
                    </p>
                  </div>
                  <ClipboardActionRow
                    label="Copy memo"
                    state={getClipboardUiState("Memo", { status, error, activeTarget, copiedTarget })}
                    onClick={() => void copyToClipboard(executiveMemo, "Memo")}
                  />
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                {visualSections.map((section) => {
                  const items = template[section.key];
                  return (
                    <article
                      key={section.key}
                      className={`weather-surface border p-4 ${section.surfaceClass}`}
                    >
                      <p className="type-eyebrow text-slate-300">
                        {section.badge}
                      </p>
                      <h4 className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-50">
                        <span aria-hidden="true">{section.icon}</span>
                        {section.title}
                      </h4>
                      <p className="mt-1 text-xs text-slate-300">{section.subtitle}</p>
                      <ul className="mt-3 space-y-2 text-sm text-slate-100">
                        {items.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <span
                              className="mt-[6px] inline-block h-1.5 w-1.5 rounded-full bg-current"
                              aria-hidden="true"
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>

              <div className="weather-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                    Pause-if checklist
                  </p>
                  <ClipboardActionRow
                    label="Copy checklist"
                    state={getClipboardUiState("Checklist", { status, error, activeTarget, copiedTarget })}
                    onClick={() => void copyToClipboard(guardrailChecklist, "Checklist")}
                  />
                </div>
                <p className="mt-4 text-xs text-slate-400">
                  {error
                    ? "Clipboard unavailable in this environment."
                    : copiedTarget
                      ? `${copiedTarget} copied.`
                      : "Ready to share."}
                </p>
              </div>

              <details className="weather-surface weather-auto-chevron p-4">
                <summary className="cursor-pointer text-xs font-semibold tracking-[0.12em] text-slate-300">
                  Full memo
                </summary>
                <pre className="mt-4 whitespace-pre-wrap text-sm text-slate-200">
                  {executiveMemo}
                </pre>
              </details>
            </>
          ) : (
            <div className="weather-surface p-4">
              <p className="text-sm text-slate-300">
                No memo for this week&apos;s call.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
