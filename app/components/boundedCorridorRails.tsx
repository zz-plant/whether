import type { ActionStripItem } from "../../lib/report/operatingCalls";
import { buildSharedCorridorRails } from "../../lib/report/operatingCalls";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import { ThresholdLadder } from "./illustrations/ThresholdLadder";

/**
 * The one corridor every lever shares, drawn once: a rail per composite
 * signal with the reading, the pause line and the re-open line. Every bounded
 * rule is a pair of these four lines, so this is the graphic a rules table
 * refers back to rather than something each row redraws.
 */
export function BoundedCorridorRails({
  items,
  scores,
  idPrefix,
  viewBoxWidth = 420,
}: {
  items: readonly Pick<ActionStripItem, "pauseConditions" | "resumeConditions">[];
  scores?: { tightness: number; riskAppetite: number };
  idPrefix: string;
  viewBoxWidth?: number;
}) {
  const rails = buildSharedCorridorRails(items, scores);
  if (rails.length === 0) return null;

  return (
    <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2" aria-label="Shared corridor for this week's rules">
      {rails.map((rail) => (
        <li key={rail.metric} className="min-w-0">
          <p className="flex items-baseline justify-between gap-2 text-fluid-nano text-slate-400">
            <span>{rail.label}</span>
            <span className="tabular-nums text-slate-200">{rail.current}<span className="text-slate-500">/100</span></span>
          </p>
          <ThresholdLadder
            idPrefix={`${idPrefix}-${rail.metric}`}
            min={0}
            max={100}
            current={rail.current}
            trigger={rail.guardrail}
            triggerLabel={DECISION_CONTRACT_LABELS.threshold.pauseIf}
            reversal={rail.clearsAt}
            reversalLabel={DECISION_CONTRACT_LABELS.reversal.resumeWhen}
            hysteresisBand
            invert={rail.invert}
            signalLabel={rail.label}
            viewBoxWidth={viewBoxWidth}
          />
        </li>
      ))}
    </ul>
  );
}
