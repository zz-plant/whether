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
  // Status labels can carry a stage suffix ("Cloudy — Mid"), which reads badly
  // mid-sentence. Keep only the posture name.
  const postureName = statusLabel?.split("—")[0]?.trim();
  const postureReference = postureName ? `${postureName} conditions` : "this week's market conditions";
  const weekReference = recordDateLabel ? `week ending ${recordDateLabel}` : "this week";
  const postureMode = resolvePlanningPostureMode(statusLabel);

  const snippets = useMemo(
    () => [
      {
        id: "directive",
        label: "Weekly engineering note",
        bestUse: "Best for: engineering standup notes",
        text: postureMode === "expansion"
          ? `Weekly note (${weekReference}): We are operating against ${postureReference}. Push harder on the lanes where demand is already real. Add capacity where milestones are landing, and nowhere else. The stop lines stay visible in execution.`
          : postureMode === "volatile"
            ? `Weekly note (${weekReference}): We are operating against ${postureReference}. Every release ships reversible, with a checkpoint attached. Staffing tracks near-term evidence, and we revisit the milestone gates at next week's review.`
            : postureMode === "scarcity"
              ? `Weekly note (${weekReference}): We are operating against ${postureReference}. Revenue, delivery, and reliability come first. Non-critical expansion is on hold, and every fixed-cost change gets checked against the stop lines before it moves.`
              : `Weekly note (${weekReference}): We are operating against ${postureReference}. Core delivery and reliability keep their commitments. Optional scope narrows, and staffing changes wait for a stop-line check at next week's review.`,
      },
      {
        id: "staff-update",
        label: "Staff update paragraph",
        bestUse: "Best for: leadership/status updates",
        text: postureMode === "expansion"
          ? `For ${weekReference} we are planning against ${postureReference}. Delivery stays predictable, but we are moving faster wherever demand is already showing up. Capacity goes only to lanes with proven conversion, retention, or payback, and the stop line stays in the plan where everyone can see it.`
          : postureMode === "volatile"
            ? `For ${weekReference} we are planning against ${postureReference}. Engineering is holding to predictable delivery, reliability, and checkpointed execution. Roadmap and hiring changes stay tied to near-term evidence until next week's update gives us a cleaner read.`
            : postureMode === "scarcity"
              ? `For ${weekReference} we are planning against ${postureReference}. The work that protects cash — delivery, reliability, revenue — takes priority. Non-essential roadmap and hiring expansion stay on hold until the stop lines clear.`
              : `For ${weekReference} we are planning against ${postureReference}. Engineering is protecting delivery and reliability while keeping headcount use disciplined. Optional roadmap and hiring expansion stay narrow until the stop lines clear or next week's update improves the read.`,
      },
      {
        id: "risk-register",
        label: "Risk register entry",
        bestUse: "Best for: risk review logs",
        text: `Risk: The company plan drifts out of step with ${postureReference}.\nImpact: Missed delivery targets, or spend committed against conditions that have already changed.\nMitigation: Hold the main action to this week's call, keep the stop lines visible, and re-read the plan against fresh signals every week.\nReview schedule: Weekly.`,
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
            <article key={snippet.id} className="rounded-lg border border-slate-800/80 bg-slate-950/80 p-4">
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
