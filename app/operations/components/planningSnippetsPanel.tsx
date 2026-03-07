"use client";

import { useMemo } from "react";
import { ClipboardActionRow } from "../../components/clipboardActionRow";
import { useClipboardCopy } from "../../components/useClipboardCopy";
import { WorkAppLabel } from "../../components/workAppIcon";

type PlanningSnippetsPanelProps = {
  statusLabel: string;
  recordDateLabel: string;
};

export function PlanningSnippetsPanel({
  statusLabel,
  recordDateLabel,
}: PlanningSnippetsPanelProps) {
  const snippets = useMemo(
    () => [
      {
        id: "directive",
        label: "Weekly engineering directive",
        bestUse: "Best for: engineering standup notes",
        text: `Weekly directive (${recordDateLabel}): Operate in ${statusLabel} posture. Prioritize core delivery and reliability commitments, defer speculative scope, and re-validate staffing changes at the next weekly check-in.`,
      },
      {
        id: "staff-update",
        label: "Staff update paragraph",
        bestUse: "Best for: leadership/status updates",
        text: `This week we are operating in ${statusLabel} posture based on Treasury curve signals refreshed ${recordDateLabel}. Engineering focus remains on delivery predictability, reliability protection, and disciplined capacity allocation. We will avoid irreversible roadmap or hiring expansion until the next refresh confirms sustained improvement.`,
      },
      {
        id: "risk-register",
        label: "Risk register entry",
        bestUse: "Best for: risk review logs",
        text: `Risk: Posture mismatch to macro regime (${statusLabel}).\nImpact: Missed delivery targets or excess spend under changing conditions.\nMitigation: Gate speculative work, enforce reliability guardrails, and re-evaluate posture weekly with latest signals.\nReview cadence: Weekly.`,
      },
    ],
    [recordDateLabel, statusLabel],
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
          const isCopying = status === "copying" && activeTarget === snippet.id;
          const copied = copiedTarget === snippet.id;

          return (
            <article key={snippet.id} className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">{snippet.label}</h3>
                  <p className="text-xs text-slate-400">{snippet.bestUse}</p>
                </div>
                <ClipboardActionRow
                  label="Copy"
                  state={isCopying ? "copying" : copied ? "copied" : error ? "error" : "idle"}
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
