"use client";

import { Button } from "@base-ui/react/button";
import { useMemo } from "react";
import type { RegimeAssessment } from "../../lib/regimeEngine";
import { insightDatabase } from "../../data/recommendations";
import { DataProvenanceStrip, type DataProvenance } from "./dataProvenanceStrip";
import { useClipboardCopy } from "./useClipboardCopy";

const buildExecutiveMemo = (assessment: RegimeAssessment, recordDateLabel: string) => {
  const template = insightDatabase.executiveBriefingSuite.regimes.find(
    (entry) => entry.key === assessment.regime
  );

  if (!template) {
    return "Executive memo unavailable for current market climate.";
  }

  return [
    `Executive Brief — ${recordDateLabel}`,
    `Market climate: ${assessment.regime}`,
    "",
    `Summary: ${template.executiveSummary}`,
    "",
    "Decision guardrails:",
    ...template.decisionGuardrails.map((item) => `• ${item}`),
    "",
    "Decision templates:",
    ...template.decisionTemplates.map((item) => `• ${item}`),
    "",
    "Reversal triggers:",
    ...template.reversalTriggers.map((item) => `• ${item}`),
  ].join("\n");
};

const buildGuardrailChecklist = (assessment: RegimeAssessment) => {
  const template = insightDatabase.executiveBriefingSuite.regimes.find(
    (entry) => entry.key === assessment.regime
  );

  if (!template) {
    return "Guardrail checklist unavailable.";
  }

  return [
    `Guardrail Checklist — ${assessment.regime}`,
    ...template.decisionGuardrails.map((item) => `• ${item}`),
  ].join("\n");
};

export const ExecutiveBriefingPanel = ({
  assessment,
  recordDateLabel,
  provenance,
}: {
  assessment: RegimeAssessment;
  recordDateLabel: string;
  provenance: DataProvenance;
}) => {
  const { status, error, activeTarget, copiedTarget, copyToClipboard } =
    useClipboardCopy();

  const executiveMemo = useMemo(
    () => buildExecutiveMemo(assessment, recordDateLabel),
    [assessment, recordDateLabel]
  );
  const guardrailChecklist = useMemo(
    () => buildGuardrailChecklist(assessment),
    [assessment]
  );

  const isCopying = status === "copying";

  return (
    <section
      id="executive-briefing"
      aria-labelledby="executive-briefing-title"
      className="mt-10"
    >
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Executive brief</p>
            <h3 id="executive-briefing-title" className="type-section text-slate-100">
              {insightDatabase.executiveBriefingSuite.title}
            </h3>
            <p className="mt-2 type-data text-slate-300">
              {insightDatabase.executiveBriefingSuite.subtitle}
            </p>
          </div>
          <DataProvenanceStrip provenance={provenance} />
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr,0.7fr]">
          <div className="weather-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                Board-ready memo
              </p>
              <Button
                type="button"
                onClick={() => copyToClipboard(executiveMemo, "Memo")}
                disabled={isCopying}
                aria-busy={isCopying}
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
              >
                {isCopying && activeTarget === "Memo" ? "Copying" : "Copy memo"}
              </Button>
            </div>
            <pre className="mt-4 whitespace-pre-wrap text-sm text-slate-200">
              {executiveMemo}
            </pre>
          </div>
          <div className="weather-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                Guardrail checklist
              </p>
              <Button
                type="button"
                onClick={() => copyToClipboard(guardrailChecklist, "Checklist")}
                disabled={isCopying}
                aria-busy={isCopying}
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
              >
                {isCopying && activeTarget === "Checklist"
                  ? "Copying"
                  : "Copy checklist"}
              </Button>
            </div>
            <pre className="mt-4 whitespace-pre-wrap text-sm text-slate-200">
              {guardrailChecklist}
            </pre>
            <p className="mt-4 text-xs text-slate-500">
              {error
                ? "Clipboard unavailable in this environment."
                : copiedTarget
                  ? `${copiedTarget} copied.`
                  : "Ready to share in executive reviews."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
