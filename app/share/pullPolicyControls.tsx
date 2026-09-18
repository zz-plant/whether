"use client";

import { useClipboardCopy } from "../components/useClipboardCopy";
import type { PullPolicyBlock } from "../../lib/report/operatingCalls";
import type { WipGuidance } from "../../lib/report/wipPolicy";

/**
 * Kanban pull policies, as copyable blocks for a board header or wiki.
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
  const { copiedTarget, copyToClipboard } = useClipboardCopy();

  if (blocks.length === 0 && !wipGuidance) return null;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h2 className="type-eyebrow">Pull policies for kanban teams</h2>
        <p className="text-xs leading-relaxed text-slate-300">
          Copy one policy per business area into a board header or wiki. The regime as a pull
          policy: what to keep pulling, when to stop, when to resume, and how many parallel bets
          the cap allows. Pick a runway band on the brief to scale the cap to your cash.
        </p>
      </div>
      {wipGuidance ? (
        <article className="weather-surface space-y-2 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-fluid-xs font-semibold text-slate-100">WIP cap</h3>
            <button
              type="button"
              className="weather-button min-h-[36px] px-3 py-1.5 text-xs font-semibold"
              onClick={() => void copyToClipboard(wipGuidance.markdown, "wip-policy")}
            >
              {copiedTarget === "wip-policy" ? "Copied" : "Copy policy"}
            </button>
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
              <button
                type="button"
                className="weather-button min-h-[36px] px-3 py-1.5 text-xs font-semibold"
                onClick={() => void copyToClipboard(block.markdown, `pull-policy-${block.area}`)}
              >
                {copiedTarget === `pull-policy-${block.area}` ? "Copied" : "Copy policy"}
              </button>
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