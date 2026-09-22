"use client";

import { ClipboardActionRow } from "../components/clipboardActionRow";
import { getClipboardUiState, useClipboardCopy } from "../components/useClipboardCopy";
import { AreaTable } from "../components/ui/areaTable";
import type { GuardrailTagBlock } from "../../lib/export/issueTrackerBrief";
import { decisionAreaLabel, decisionAreaOrder, type DecisionArea } from "../../lib/report/boundedDecisionRules";
import { operatingLeverToDecisionArea } from "../../lib/report/businessAreaMap";
import type { BusinessAreaKey } from "../../lib/report/decisionKnobs";
import type { AreaRowText } from "../operate/areaRows";

/**
 * The per-business-area guardrail tags, as copyable blocks for work items.
 *
 * This is the credential-free slice of the Linear/Jira sync: nothing is stored
 * and nothing is written to the tracker. Each block is built server-side from
 * the same bounded-rule fields the hero and Slack brief print, so a card cannot
 * state a threshold the weekly call does not. The operator copies one block per
 * area into the work item description.
 *
 * The preview is the one area table every surface draws, in its one order, so
 * the reader who checks Fundraising on the plan page finds it in the same row
 * here; the copy controls follow that order.
 */
const isLever = (value: string): value is BusinessAreaKey =>
  Object.prototype.hasOwnProperty.call(operatingLeverToDecisionArea, value);

const areaOfBlock = (block: GuardrailTagBlock): DecisionArea | null =>
  isLever(block.area) ? operatingLeverToDecisionArea[block.area] : null;

export function GuardrailTagControls({ blocks, rows }: { blocks: GuardrailTagBlock[]; rows: AreaRowText[] }) {
  const { status, error, activeTarget, copiedTarget, copyToClipboard } = useClipboardCopy();
  const clipboardState = (target: string) =>
    getClipboardUiState(target, { status, error, activeTarget, copiedTarget });

  if (blocks.length === 0) return null;

  const ordered = blocks
    .flatMap((block) => {
      const area = areaOfBlock(block);
      return area ? [{ block, area }] : [];
    })
    .sort((left, right) => decisionAreaOrder.indexOf(left.area) - decisionAreaOrder.indexOf(right.area));

  return (
    <section className="weather-panel space-y-3 px-5 max-sm:px-0 py-5" aria-labelledby="guardrail-tags-heading">
      <div className="space-y-1">
        <h2 id="guardrail-tags-heading" className="type-eyebrow">Pause and resume lines for work items</h2>
        <p className="text-xs leading-relaxed text-slate-300">
          Copy one block per business area into a Linear or Jira card description. No integration,
          no tokens — the card carries this week&apos;s call, its pause line, and what would change it.
        </p>
      </div>
      <AreaTable rows={rows} caption="This week's rule, pause line and resume line for each area, as the tags carry them" />
      <ul className="flex flex-wrap gap-2" aria-label="Copy a tag">
        {ordered.map(({ block, area }) => (
          <li key={block.area}>
            <ClipboardActionRow
              compact
              label={`Copy ${decisionAreaLabel(area)} tag`}
              state={clipboardState(`guardrail-${block.area}`)}
              onClick={() => void copyToClipboard(block.markdown, `guardrail-${block.area}`)}
              buttonLabels={{ error: "Copy failed" }}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
