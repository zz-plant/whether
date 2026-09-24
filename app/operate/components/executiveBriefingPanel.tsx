"use client";

import { useMemo } from "react";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import { getRegimePublicLabel } from "../../../lib/regimePresentation";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { insightDatabase } from "../../../data/recommendations";
import { ClipboardActionRow } from "../../components/clipboardActionRow";
import { getClipboardUiState, useClipboardCopy } from "../../components/useClipboardCopy";

type ExecutiveTemplate =
  (typeof insightDatabase.executiveBriefingSuite.regimes)[number];

export const buildExecutiveMemo = (
  assessment: RegimeAssessment,
  recordDateLabel: string,
  template: ExecutiveTemplate | undefined
) => {

  if (!template) {
    return "No memo for this week's guidance.";
  }

  return [
    `Brief — ${recordDateLabel}`,
    `This week's conditions: ${getRegimePublicLabel(assessment.regime)}`,
    "",
    `Summary: ${template.executiveSummary}`,
    "",
    "Pause-if checks:",
    ...template.decisionGuardrails.map((item) => `• ${item}`),
    "",
    "Decision templates:",
    ...template.decisionTemplates.map((item) => `• ${item}`),
    "",
    `${DECISION_CONTRACT_LABELS.watch.postureFlips}:`,
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

/* Three peer lists, one colour. These carried an "Operate / Translate / Watch"
   badge, an emoji, and a sky / emerald / violet tint each — a status legend on
   a page where emerald and amber mean easing and tightening everywhere else
   (see shareCopyControls.tsx, which made the same cut for the same reason). */
const visualSections = [
  {
    key: "decisionGuardrails",
    title: "Pause-if checks",
    subtitle: "Do this by default",
  },
  {
    key: "decisionTemplates",
    title: "Decision guidance",
    subtitle: "Ready-made guidance",
  },
  {
    key: "reversalTriggers",
    title: DECISION_CONTRACT_LABELS.watch.postureFlips,
    // Not `watch.flipWatch` ("What would change the call"): under this title it restated it.
    subtitle: "Watch for either one",
  },
] as const;

/**
 * The body only. `/share` is the one consumer and mounts this under its own
 * h2 ("Brief your team by role") inside its own panel, so the panel, "Brief"
 * label, title, subtitle and lead sentence this used to bring rendered a
 * header under a header and a card inside a card.
 */
export const ExecutiveBriefingPanel = ({
  assessment,
  recordDateLabel,
}: {
  assessment: RegimeAssessment;
  recordDateLabel: string;
}) => {
  const { status, error, activeTarget, copiedTarget, copyToClipboard } =
    useClipboardCopy({ commitment: "copied_brief" });
  const clipboardState = (target: string) =>
    getClipboardUiState(target, { status, error, activeTarget, copiedTarget });

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

  if (!template) {
    return (
      <p className="text-sm text-slate-300">
        No memo for this week&apos;s guidance.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="weather-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-300">
              Summary
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-50">
              {template.executiveSummary}
            </p>
          </div>
          <ClipboardActionRow
            label="Copy memo"
            state={clipboardState("Memo")}
            onClick={() => void copyToClipboard(executiveMemo, "Memo")}
            buttonLabels={{ error: "Copy failed" }}
          />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {visualSections.map((section) => {
          const items = template[section.key];
          return (
            <article key={section.key} className="weather-surface p-4">
              <h3 className="text-sm font-semibold text-slate-50">{section.title}</h3>
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
          <p className="text-xs font-semibold text-slate-400">
            Pause-if checklist
          </p>
          <ClipboardActionRow
            label="Copy checklist"
            state={clipboardState("Checklist")}
            onClick={() => void copyToClipboard(guardrailChecklist, "Checklist")}
            buttonLabels={{ error: "Copy failed" }}
          />
        </div>
      </div>

      <details className="weather-surface weather-auto-chevron p-4">
        <summary className="text-xs font-semibold text-slate-300">
          Full memo
        </summary>
        <pre className="mt-4 whitespace-pre-wrap text-sm text-slate-200">
          {executiveMemo}
        </pre>
      </details>
    </div>
  );
};
