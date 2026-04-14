"use client";

import { useMemo } from "react";
import { ClipboardActionRow } from "../../components/clipboardActionRow";
import { getClipboardUiState, useClipboardCopy } from "../../components/useClipboardCopy";
import { WorkAppLabel } from "../../components/workAppIcon";

type PlanningSnippetsPanelProps = {
  statusLabel?: string;
  recordDateLabel?: string;
};

const resolvePlanningPostureMode = (statusLabel?: string) => {
  const normalized = statusLabel?.toLowerCase() ?? "";

  if (normalized.includes("expansion") || normalized.includes("risk-on")) {
    return "expansion";
  }

  if (normalized.includes("volatile")) {
    return "volatile";
  }

  if (normalized.includes("scarcity")) {
    return "scarcity";
  }

  return "defensive";
};

export function PlanningSnippetsPanel({
  statusLabel,
  recordDateLabel,
}: PlanningSnippetsPanelProps) {
  const postureReference = statusLabel ? `the ${statusLabel} posture` : "the current weekly brief posture";
  const weekReference = recordDateLabel ? `week ending ${recordDateLabel}` : "this week";
  const postureMode = resolvePlanningPostureMode(statusLabel);

  const snippets = useMemo(
    () => [
      {
        id: "directive",
        label: "Weekly engineering directive",
        bestUse: "Best for: engineering standup notes",
        text: postureMode === "expansion"
          ? `Weekly directive (${weekReference}): Operate in ${postureReference}. Press proven delivery and growth lanes, add capacity only where milestones already have demand proof, and keep the current stop lines visible in execution.`
          : postureMode === "volatile"
            ? `Weekly directive (${weekReference}): Operate in ${postureReference}. Advance reversible releases with explicit checkpoints, keep staffing tied to near-term proof, and recheck milestone gates at the next weekly review.`
            : postureMode === "scarcity"
              ? `Weekly directive (${weekReference}): Operate in ${postureReference}. Protect revenue, delivery, and reliability work, hold non-critical expansion, and review fixed-cost changes against the current stop lines each week.`
              : `Weekly directive (${weekReference}): Operate in ${postureReference}. Prioritize core delivery and reliability commitments, narrow optional scope, and re-validate staffing changes against the current stop lines at the next weekly check-in.`,
      },
      {
        id: "staff-update",
        label: "Staff update paragraph",
        bestUse: "Best for: leadership/status updates",
        text: postureMode === "expansion"
          ? `This week we are operating in ${postureReference} for ${weekReference}. Engineering focus remains on delivery predictability while we increase pace in validated lanes. We are adding capacity only where conversion, retention, or payback proof already exists, with the stop line kept visible in the plan.`
          : postureMode === "volatile"
            ? `This week we are operating in ${postureReference} for ${weekReference}. Engineering focus remains on delivery predictability, reliability protection, and checkpointed execution. We will keep roadmap and hiring changes tied to near-term proof until the next weekly refresh confirms a cleaner read.`
            : postureMode === "scarcity"
              ? `This week we are operating in ${postureReference} for ${weekReference}. Engineering focus remains on delivery predictability, reliability protection, and cash-critical execution. We will hold non-essential roadmap or hiring expansion until the current stop lines clear.`
              : `This week we are operating in ${postureReference} for ${weekReference}. Engineering focus remains on delivery predictability, reliability protection, and disciplined capacity allocation. We will narrow optional roadmap or hiring expansion until the current stop lines clear or the next refresh improves the read.`,
      },
      {
        id: "risk-register",
        label: "Risk register entry",
        bestUse: "Best for: risk review logs",
        text: `Risk: Posture mismatch to regime and environment (${postureReference}).\nImpact: Missed delivery targets or excess spend under changing conditions.\nMitigation: Keep the main action aligned to this week's posture, preserve visible stop lines, and re-evaluate the plan weekly with the latest signals.\nReview cadence: Weekly.`,
      },
    ],
    [postureMode, postureReference, weekReference],
  );

  const { activeTarget, copiedTarget, status, error, copyToClipboard } = useClipboardCopy();

  return (
    <section className="weather-panel-static space-y-4 px-6 py-6" aria-label="Planning snippets">
      <h2 className="text-xl font-semibold text-slate-50">Copy-ready planning snippets</h2>
      <p className="text-sm text-slate-300">
        Reuse these snippets in <WorkAppLabel app="jira" label="Jira" />, <WorkAppLabel app="notion" label="Notion" />, or weekly leadership updates.
      </p>
      <div className="space-y-3">
        {snippets.map((snippet) => {
          const clipboardState = getClipboardUiState(snippet.id, {
            status,
            error,
            activeTarget,
            copiedTarget,
          });

          return (
            <article key={snippet.id} className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">{snippet.label}</h3>
                  <p className="text-xs text-slate-400">{snippet.bestUse}</p>
                </div>
                <ClipboardActionRow
                  label="Copy"
                  state={clipboardState}
                  compact
                  onClick={() => void copyToClipboard(snippet.text, snippet.id)}
                  buttonLabels={{ copying: "Copying…" }}
                />
              </div>
              <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-200">{snippet.text}</pre>
            </article>
          );
        })}
      </div>
      {error ? (
        <p className="text-xs text-rose-300">
          Clipboard access failed. Select the snippet text and copy manually.
        </p>
      ) : null}
    </section>
  );
}
