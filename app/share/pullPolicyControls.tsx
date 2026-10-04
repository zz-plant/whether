"use client";

import { ClipboardActionRow } from "../components/clipboardActionRow";
import { getClipboardUiState, useClipboardCopy } from "../components/useClipboardCopy";
import type { PullPolicyBlock } from "../../lib/report/operatingCalls";
import type { WipGuidance } from "../../lib/report/wipPolicy";

/**
 * Kanban pull policies, as copyable blocks for a wiki or a project board.
 *
 * The same pause/resume conditions the weekly call prints, re-verbed for a
 * pull system: what to keep pulling, when to stop, when to resume — plus the
 * regime's numeric WIP cap. No tokens, no integration — the team pastes the
 * policy where the board lives.
 */
export function PullPolicyControls({
  blocks,
  wipGuidance,
}: {
  blocks: PullPolicyBlock[];
  wipGuidance?: WipGuidance;
}) {
  const { status, error, activeTarget, copiedTarget, copyToClipboard } = useClipboardCopy({ commitment: "copied_brief" });
  const clipboardState = (target: string) =>
    getClipboardUiState(target, { status, error, activeTarget, copiedTarget });

  if (blocks.length === 0 && !wipGuidance) return null;

  return (
    <section className="weather-panel weather-section-stack p-0" aria-labelledby="wip-limits-heading">
      <div className="space-y-1">
        <h2 id="wip-limits-heading" className="text-xl font-semibold text-white sm:text-2xl">Work-in-progress limits</h2>
        <p className="text-xs leading-relaxed text-slate-300">
          A work-in-progress limit is how many things a team runs at once. This week&apos;s guidance as
          one: what to keep starting, when to stop, when to resume, and how many bets can run in
          parallel. Copy one block per area into a wiki or a project board; pick a runway band on
          the brief to scale the cap to your cash.
        </p>
      </div>
      {wipGuidance ? (
        <article className="weather-surface space-y-2 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-fluid-xs font-semibold text-slate-100">Work-in-progress cap</h3>
            <ClipboardActionRow
              compact
              label="Copy policy"
              state={clipboardState("wip-policy")}
              onClick={() => void copyToClipboard(wipGuidance.markdown, "wip-policy")}
              buttonLabels={{ error: "Copy failed" }}
            />
          </div>
          <pre className="overflow-auto whitespace-pre-wrap rounded-md border border-slate-800/80 bg-slate-950/80 p-2.5 text-fluid-micro leading-relaxed text-slate-200">
            {wipGuidance.markdown}
          </pre>
        </article>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {blocks.map((block) => (
          <article key={block.area} className="weather-surface space-y-2 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-fluid-xs font-semibold text-slate-100">{block.label}</h3>
              <ClipboardActionRow
                compact
                label="Copy policy"
                state={clipboardState(`pull-policy-${block.area}`)}
                onClick={() => void copyToClipboard(block.markdown, `pull-policy-${block.area}`)}
                buttonLabels={{ error: "Copy failed" }}
              />
            </div>
            <pre className="max-h-48 overflow-auto overscroll-contain whitespace-pre-wrap rounded-md border border-slate-800/80 bg-slate-950/80 p-2.5 text-fluid-micro leading-relaxed text-slate-200">
              {block.markdown}
            </pre>
          </article>
        ))}
      </div>
    </section>
  );
}