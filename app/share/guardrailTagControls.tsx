"use client";

import { useClipboardCopy } from "../components/useClipboardCopy";
import type { GuardrailTagBlock } from "../../lib/export/issueTrackerBrief";

/**
 * The per-business-area guardrail tags, as copyable blocks for work items.
 *
 * This is the credential-free slice of the Linear/Jira sync: nothing is stored
 * and nothing is written to the tracker. Each block is built server-side from
 * the same bounded-rule fields the hero and Slack brief print, so a card cannot
 * state a threshold the weekly call does not. The operator copies one block per
 * area into the work item description.
 */
export function GuardrailTagControls({ blocks }: { blocks: GuardrailTagBlock[] }) {
  const { copiedTarget, copyToClipboard } = useClipboardCopy();

  if (blocks.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h2 className="type-eyebrow">Guardrail tags for work items</h2>
        <p className="text-xs leading-relaxed text-slate-300">
          Copy one block per business area into a Linear or Jira card description. No integration,
          no tokens — the card carries this week&apos;s posture, pause trigger, and flip condition.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {blocks.map((block) => (
          <article key={block.area} className="weather-surface space-y-2 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-fluid-xs font-semibold text-slate-100">
                {block.label}
                {block.ownerLabel ? (
                  <span className="ml-2 text-fluid-micro font-normal text-slate-400">{block.ownerLabel}</span>
                ) : null}
              </h3>
              <button
                type="button"
                className="weather-button min-h-[36px] px-3 py-1.5 text-xs font-semibold"
                onClick={() => void copyToClipboard(block.markdown, `guardrail-${block.area}`)}
              >
                {copiedTarget === `guardrail-${block.area}` ? "Copied" : "Copy tag"}
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