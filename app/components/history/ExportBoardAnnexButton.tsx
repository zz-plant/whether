"use client";

import type { TrackRecord } from "../../../lib/report/trackRecord";
import { ClipboardActionRow } from "../clipboardActionRow";
import { CheckIcon, CopyIcon } from "../uiIcons";
import { getClipboardUiState, useClipboardCopy } from "../useClipboardCopy";
import { describeConditions } from "../../../lib/export/exportTerms";

type Props = {
  record: TrackRecord | null;
  className?: string;
};

/*
 * The copied memo is built from the record and nothing else.
 *
 * It used to be headed "Prepared for the Board of Directors" and carry a section
 * asserting, unconditionally, that "management paced organizational investment
 * according to objective capital cost physics", backfilled revenue-critical roles
 * only, enforced a six-month payback bar on refactors and held an 18-month cash
 * buffer — statements about the reader's company that no reading produced, in a
 * document labelled for their board. With no record it still wrote "4 consecutive
 * months". Every line here now names something the archive holds, and with no
 * record there is no button rather than an invented one.
 */
export const buildRecordSummary = (record: TrackRecord, origin: string) =>
  [
    "# Whether: what the record shows",
    `Prepared from Whether's public record · As of ${record.latestRecordDate}`,
    `Source: Whether (${origin})`,
    "",
    "## The reading",
    `- **Conditions:** ${describeConditions(record.currentRegime, record.currentRegimeLabel)}`,
    `- **Held for:** ${record.currentHoldMonths} consecutive months`,
    `- **Record length:** ${record.monthsCovered} months of public market data`,
    "",
    "## Sources",
    "- Federal Reserve Economic Data (FRED): Treasury yields, the extra interest companies pay to borrow, stock market volatility, and the Chicago Fed financial conditions index.",
    "- US Department of the Treasury: constant-maturity daily rates.",
    `- The full record: ${origin}/history`,
  ].join("\n");

export function ExportBoardAnnexButton({ record, className = "" }: Props) {
  /*
   * This used to be `void navigator.clipboard.writeText(...)` inside a
   * try/catch, then `setCopied(true)` on the next line. `void` discards the
   * promise, so a rejected write is an unhandled rejection rather than a
   * synchronous throw and the catch could never fire — the button said "Board
   * Annex Copied!" for a memo that never reached the clipboard. The shared hook
   * awaits the write and separates "clipboard unavailable" from "write failed".
   */
  const { status, error, activeTarget, copiedTarget, copyToClipboard } = useClipboardCopy({
    resetDelay: 2500,
    commitment: "copied_brief",
  });

  if (!record) return null;

  return (
    <ClipboardActionRow
      label="Copy the record summary"
      state={getClipboardUiState("board-annex", { status, error, activeTarget, copiedTarget })}
      onClick={() => void copyToClipboard(buildRecordSummary(record, window.location.origin), "board-annex")}
      leadingIcon={<CopyIcon />}
      stateIcons={{ copied: <CheckIcon /> }}
      buttonLabels={{ error: "Copy failed — select the page text" }}
      className={className}
      buttonProps={{
        title: "Copy a short memo of what the monthly record shows",
        "aria-label": "Copy the record summary",
      }}
    />
  );
}
