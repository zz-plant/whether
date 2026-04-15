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
  const postureReference = statusLabel ? `the current ${statusLabel.toLowerCase()} market setting` : "the current weekly market setting";
  const weekReference = recordDateLabel ? `week ending ${recordDateLabel}` : "this week";
  const postureMode = resolvePlanningPostureMode(statusLabel);

  const snippets = useMemo(
    () => [
      {
        id: "directive",
        label: "Weekly engineering note",
        bestUse: "Best for: engineering standup notes",
        text: postureMode === "expansion"
          ? `Weekly note (${weekReference}): We are operating against ${postureReference}. Move faster on delivery and growth bets that already have real demand, add capacity only where milestones are landing, and keep the current stop lines visible in execution.`
          : postureMode === "volatile"
            ? `Weekly note (${weekReference}): We are operating against ${postureReference}. Ship reversible releases with clear checkpoints, keep staffing tied to near-term evidence, and recheck milestone gates in next week's review.`
            : postureMode === "scarcity"
              ? `Weekly note (${weekReference}): We are operating against ${postureReference}. Protect revenue, delivery, and reliability work, hold non-critical expansion, and review fixed-cost changes against the current stop lines every week.`
              : `Weekly note (${weekReference}): We are operating against ${postureReference}. Prioritize core delivery and reliability commitments, narrow optional scope, and check staffing changes against the current stop lines in next week's review.`,
      },
      {
        id: "staff-update",
        label: "Staff update paragraph",
        bestUse: "Best for: leadership/status updates",
        text: postureMode === "expansion"
          ? `This week, for ${weekReference}, we are planning against ${postureReference}. Engineering is staying focused on predictable delivery while we move faster in lanes that already show demand. We are adding capacity only where conversion, retention, or payback is already proven, with the stop line kept visible in the plan.`
          : postureMode === "volatile"
            ? `This week, for ${weekReference}, we are planning against ${postureReference}. Engineering stays focused on predictable delivery, reliability, and checkpointed execution. We will keep roadmap and hiring changes tied to near-term evidence until next week's update confirms a cleaner read.`
            : postureMode === "scarcity"
              ? `This week, for ${weekReference}, we are planning against ${postureReference}. Engineering stays focused on predictable delivery, reliability, and cash-critical execution. We will hold non-essential roadmap or hiring expansion until the current stop lines clear.`
              : `This week, for ${weekReference}, we are planning against ${postureReference}. Engineering stays focused on predictable delivery, reliability, and disciplined headcount use. We will narrow optional roadmap or hiring expansion until the current stop lines clear or next week's update improves the read.`,
      },
      {
        id: "risk-register",
        label: "Risk register entry",
        bestUse: "Best for: risk review logs",
        text: `Risk: Company plan no longer matches ${postureReference}.\nImpact: Missed delivery targets or overspending if conditions change.\nMitigation: Keep the main action aligned to this week's call, keep stop lines visible, and review the plan each week with the latest signals.\nReview schedule: Weekly.`,
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
