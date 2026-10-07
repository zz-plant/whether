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
 * here; the copy controls follow that order. The body only: `/share`'s format
 * picker names it and says what it is for.
 */
const isLever = (value: string): value is BusinessAreaKey =>
  Object.prototype.hasOwnProperty.call(operatingLeverToDecisionArea, value);

const areaOfBlock = (block: GuardrailTagBlock): DecisionArea | null =>
  isLever(block.area) ? operatingLeverToDecisionArea[block.area] : null;

export function GuardrailTagControls({ blocks, rows }: { blocks: GuardrailTagBlock[]; rows: AreaRowText[] }) {
  const { status, error, activeTarget, copiedTarget, copyToClipboard } = useClipboardCopy({ commitment: "copied_brief" });
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
    /* Each copy button in the row it copies. They were a row of five under the
       table, so the button for a row sat a table's height from it. */
    <AreaTable
      rows={rows.map((row) => {
        const match = ordered.find(({ area }) => area === row.area);
        return match
          ? {
              ...row,
              action: (
                <ClipboardActionRow
                  compact
                  label={`Copy ${decisionAreaLabel(match.area)} tag`}
                  state={clipboardState(`guardrail-${match.block.area}`)}
                  onClick={() => void copyToClipboard(match.block.markdown, `guardrail-${match.block.area}`)}
                  buttonLabels={{ error: "Copy failed" }}
                />
              ),
            }
          : row;
      })}
      caption="This week's rule, pause line and resume line for each area, as the tags carry them"
      signalLinkBase="/"
    />
  );
}
