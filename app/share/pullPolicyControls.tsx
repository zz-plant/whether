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
 * policy where the board lives. The body only: `/share`'s format picker names
 * it and says what it is for.
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
    <div className="space-y-3">
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
    </div>
  );
}