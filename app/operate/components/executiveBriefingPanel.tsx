"use client";

import { useMemo, useState } from "react";
import { ShieldAlert, Compass, RefreshCw, CheckCircle2, Circle } from "lucide-react";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import { getRegimePublicLabel } from "../../../lib/regimePresentation";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { insightDatabase } from "../../../data/recommendations";
import { ClipboardActionRow } from "../../components/clipboardActionRow";
import { getClipboardUiState, useClipboardCopy } from "../../components/useClipboardCopy";
import { SegmentedControl } from "../../components/ui/segmentedControl";

type ExecutiveTemplate =
  (typeof insightDatabase.executiveBriefingSuite.regimes)[number];

export const buildExecutiveMemo = (
  assessment: RegimeAssessment,
  recordDateLabel: string,
  template: ExecutiveTemplate | undefined,
  format: "plain" | "slack" = "plain"
) => {
  if (!template) {
    return "No memo for this week's guidance.";
  }

  if (format === "slack") {
    return [
      `*Weekly Brief — ${recordDateLabel}*`,
      `*This week's conditions:* ${getRegimePublicLabel(assessment.regime)}`,
      "",
      `*Summary:* ${template.executiveSummary}`,
      "",
      "*Pause-if checks:*",
      ...template.decisionGuardrails.map((item) => `• ${item}`),
      "",
      "*Decision templates:*",
      ...template.decisionTemplates.map((item) => `• ${item}`),
      "",
      `*${DECISION_CONTRACT_LABELS.watch.postureFlips}:*`,
      ...template.reversalTriggers.map((item) => `• ${item}`),
    ].join("\n");
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

const visualSections = [
  {
    key: "decisionGuardrails",
    title: "Pause-if checks",
    subtitle: "Do this by default",
    icon: ShieldAlert,
    accent: "text-amber-300",
    badge: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  },
  {
    key: "decisionTemplates",
    title: "Decision guidance",
    subtitle: "Ready-made guidance",
    icon: Compass,
    accent: "text-sky-300",
    badge: "border-sky-400/30 bg-sky-500/10 text-sky-200",
  },
  {
    key: "reversalTriggers",
    title: DECISION_CONTRACT_LABELS.watch.postureFlips,
    subtitle: "Watch for either one",
    icon: RefreshCw,
    accent: "text-violet-300",
    badge: "border-violet-400/30 bg-violet-500/10 text-violet-200",
  },
] as const;

type PreviewMode = "slack" | "memo";

const PREVIEW_OPTIONS = [
  { key: "slack" as const, label: "Slack post" },
  { key: "memo" as const, label: "Executive memo" },
];

/**
 * The body only. `/share` is the one consumer and mounts this under its own
 * h2 ("Brief your team by role") inside its own panel.
 */
export const ExecutiveBriefingPanel = ({
  assessment,
  recordDateLabel,
}: {
  assessment: RegimeAssessment;
  recordDateLabel: string;
}) => {
  const [previewMode, setPreviewMode] = useState<PreviewMode>("slack");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

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
    () => buildExecutiveMemo(assessment, recordDateLabel, template, "plain"),
    [assessment, recordDateLabel, template]
  );
  const slackMemo = useMemo(
    () => buildExecutiveMemo(assessment, recordDateLabel, template, "slack"),
    [assessment, recordDateLabel, template]
  );
  const guardrailChecklist = useMemo(
    () => buildGuardrailChecklist(assessment, template),
    [assessment, template]
  );

  const toggleCheck = (item: string) => {
    setCheckedItems((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  if (!template) {
    return (
      <p className="text-sm text-slate-300">
        No memo for this week&apos;s guidance.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Executive Summary Card with Actions */}
      <div className="weather-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Executive takeaway
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-50 leading-snug">
              {template.executiveSummary}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ClipboardActionRow
              label="Copy for Slack"
              state={clipboardState("Slack")}
              onClick={() => void copyToClipboard(slackMemo, "Slack")}
              buttonLabels={{ error: "Copy failed" }}
            />
            <ClipboardActionRow
              label="Copy memo"
              state={clipboardState("Memo")}
              onClick={() => void copyToClipboard(executiveMemo, "Memo")}
              buttonLabels={{ error: "Copy failed" }}
            />
          </div>
        </div>

        {/* Live WYSIWYG Transmission Preview */}
        <div className="mt-5 border-t border-[color:var(--border-subtle)] pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <p className="text-xs font-medium text-slate-400">
              Live transmission preview:
            </p>
            <SegmentedControl<PreviewMode>
              options={PREVIEW_OPTIONS}
              value={previewMode}
              onSelect={setPreviewMode}
              ariaLabel="Transmission format"
              layout="segmented"
            />
          </div>

          {previewMode === "slack" ? (
            <div className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-nested)] p-4 text-slate-100 shadow-inner">
              <div className="flex items-center gap-2 border-b border-[color:var(--border-subtle)] pb-2 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">#exec-updates</span>
                <span>·</span>
                <span>Slack channel preview</span>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-panel)] font-bold text-slate-100 text-sm">
                  W
                </div>
                <div className="min-w-0 flex-1 space-y-2 text-sm leading-relaxed">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-slate-100">Whether Brief</span>
                    <span className="rounded bg-[color:var(--bg-panel)] px-1 py-0.5 text-[10px] font-mono text-slate-400 uppercase">APP</span>
                    <span className="text-xs text-slate-500">9:00 AM</span>
                  </div>
                  <div className="space-y-2 text-slate-200">
                    <p className="font-bold text-slate-100">Weekly Brief — {recordDateLabel}</p>
                    <p className="text-xs">
                      <span className="font-semibold text-slate-300">This week&apos;s conditions: </span>
                      <span className="inline-block rounded border border-[color:var(--border-default)] bg-[color:var(--bg-panel)] px-1.5 py-0.5 font-semibold text-slate-100">
                        {getRegimePublicLabel(assessment.regime)}
                      </span>
                    </p>
                    <div className="rounded-l border-l-4 border-[color:var(--border-strong)] bg-[color:var(--bg-panel)] p-2.5 my-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Summary</p>
                      <p className="mt-0.5 text-xs font-medium text-slate-100">{template.executiveSummary}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Pause-if checks:</p>
                      <ul className="mt-1 space-y-1 pl-1">
                        {template.decisionGuardrails.map((item) => (
                          <li key={item} className="flex items-start gap-1.5 text-xs text-slate-300">
                            <span className="text-slate-500">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Decision templates:</p>
                      <ul className="mt-1 space-y-1 pl-1">
                        {template.decisionTemplates.map((item) => (
                          <li key={item} className="flex items-start gap-1.5 text-xs text-slate-300">
                            <span className="text-slate-500">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{DECISION_CONTRACT_LABELS.watch.postureFlips}:</p>
                      <ul className="mt-1 space-y-1 pl-1">
                        {template.reversalTriggers.map((item) => (
                          <li key={item} className="flex items-start gap-1.5 text-xs text-slate-300">
                            <span className="text-slate-500">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-nested)] p-4 text-slate-200">
              <div className="border-b border-[color:var(--border-subtle)] pb-2 text-[11px] text-slate-400 font-medium">
                Email / Meeting Pack Memo Format
              </div>
              <pre className="mt-3 whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-300">
                {executiveMemo}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* 3 Dedicated Operating Pillars */}
      <div className="grid gap-3 lg:grid-cols-3">
        {visualSections.map((section) => {
          const items = template[section.key];
          const IconComponent = section.icon;
          return (
            <article key={section.key} className="weather-surface flex flex-col justify-between p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex rounded-md p-1 ${section.badge}`}>
                    <IconComponent className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-50">{section.title}</h3>
                    <p className="text-fluid-nano text-slate-400">{section.subtitle}</p>
                  </div>
                </div>
                <ul className="mt-3.5 space-y-2.5 text-xs leading-snug text-slate-200">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span
                        className={`mt-1 inline-block size-1.5 shrink-0 rounded-full ${section.accent}`}
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 border-t border-[color:var(--border-subtle)] pt-3">
                <ClipboardActionRow
                  label={`Copy ${section.title}`}
                  state={clipboardState(section.key)}
                  onClick={() => {
                    const text = `${section.title}:\n${items.map((it) => `• ${it}`).join("\n")}`;
                    void copyToClipboard(text, section.key);
                  }}
                  buttonLabels={{ error: "Copy failed" }}
                />
              </div>
            </article>
          );
        })}
      </div>

      {/* Interactive Pause-if Meeting Checklist */}
      <div className="weather-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border-subtle)] pb-3">
          <div>
            <p className="text-xs font-semibold text-slate-200">
              Pause-if checklist
            </p>
            <p className="text-fluid-nano text-slate-400">
              Check off items during leadership standup or board alignment
            </p>
          </div>
          <ClipboardActionRow
            label="Copy checklist"
            state={clipboardState("Checklist")}
            onClick={() => void copyToClipboard(guardrailChecklist, "Checklist")}
            buttonLabels={{ error: "Copy failed" }}
          />
        </div>
        <ul className="mt-3 space-y-2">
          {template.decisionGuardrails.map((item) => {
            const isChecked = Boolean(checkedItems[item]);
            return (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => toggleCheck(item)}
                  aria-pressed={isChecked}
                  className={`flex w-full cursor-pointer select-none items-center gap-2.5 rounded-lg border p-2.5 text-left text-xs transition-colors ${
                    isChecked
                      ? "border-emerald-500/30 bg-emerald-950/20 text-slate-300 line-through opacity-75"
                      : "border-[color:var(--border-subtle)] bg-[color:var(--bg-panel)] text-slate-100 hover:border-[color:var(--border-default)]"
                  }`}
                >
                  {isChecked ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-slate-500" />
                  )}
                  <span>{item}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Collapsible raw memo */}
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

