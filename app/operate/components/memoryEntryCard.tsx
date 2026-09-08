"use client";

import { formatTimestampUTC } from "../../../lib/formatters";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import {
  type DecisionMemoryEntry,
  evaluateDecisionAssumptionHealth,
} from "../../../lib/decisionMemory";
import { ClipboardActionRow } from "../../components/clipboardActionRow";
import { CopyIcon } from "../../components/uiIcons";
import type { ClipboardCopyStatus } from "../../components/useClipboardCopy";

/**
 * One entry in the decision-memory timeline.
 *
 * This was sixty lines inside a `.map()` in `decisionMemoryPanel`, which is
 * where that file's fifteen levels of nesting came from — six bare `<div>`s
 * stacked with nothing between them, purely to arrange a flex row. As its own
 * component the card starts at depth one and the panel's map body is four lines.
 *
 * The verdict class was a three-branch ternary; `DecisionStalenessPanel` already
 * keys the same three verdicts off a record, which is the shape a lookup should
 * have in both places.
 */

const VERDICT_BADGE_CLASS: Record<string, string> = {
  RECONSIDER: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  WATCH: "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

const STANDING_BADGE_CLASS = "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";

export function MemoryEntryCard({
  entry,
  currentTightness,
  currentRiskAppetite,
  clipboardState,
  onCopy,
}: {
  entry: DecisionMemoryEntry;
  currentTightness?: number;
  currentRiskAppetite?: number;
  clipboardState: ClipboardCopyStatus;
  onCopy: () => void;
}) {
  const health =
    currentTightness !== undefined && currentRiskAppetite !== undefined
      ? evaluateDecisionAssumptionHealth({ entry, currentTightness, currentRiskAppetite })
      : null;
  const healthBadgeClass = health
    ? VERDICT_BADGE_CLASS[health.verdict] ?? STANDING_BADGE_CLASS
    : STANDING_BADGE_CLASS;

  return (
    <div className="relative">
      {/* The timeline dot, positioned against the panel's left rule. */}
      <div className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-2 border-slate-900 bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.5)]" />

      <div className="weather-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                Captured {formatTimestampUTC(entry.createdAt)}
              </p>
              {health ? (
                <span
                  className={`inline-flex items-center rounded border px-2 py-0.5 text-fluid-nano font-semibold tracking-wider ${healthBadgeClass}`}
                >
                  {health.verdict}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-100">
              {entry.decision
                ? `${entry.decision.lifecycle} · ${entry.decision.category} · ${entry.decision.action}`
                : "Weekly operating posture"}
            </p>
            <p className="mt-1 text-xs text-sky-200">
              {entry.regime.label} regime
              {entry.outcome.verdict ? (
                <> · verdict: <span className="font-semibold">{entry.outcome.verdict}</span></>
              ) : null}
            </p>
          </div>
          <ClipboardActionRow
            label={
              <span className="inline-flex items-center gap-1">
                <CopyIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Copy entry
              </span>
            }
            state={clipboardState}
            buttonVariant="pill"
            compact
            onClick={onCopy}
          />
        </div>
        {health?.reason ? (
          <p className="mt-2 text-xs text-slate-400 italic">{health.reason}</p>
        ) : null}
        <p className="mt-3 text-sm text-slate-300 break-words leading-relaxed">
          {entry.outcome.summary}
        </p>
        <div className="mt-4 pt-3 border-t border-slate-800/50 grid gap-2 text-xs">
          <p className="text-slate-400">
            <span className="font-medium text-slate-400">
              {DECISION_CONTRACT_LABELS.threshold.guardrail}:
            </span>{" "}
            {entry.outcome.guardrail}
          </p>
          <p className="text-slate-400">
            <span className="font-medium text-slate-400">
              {DECISION_CONTRACT_LABELS.reversal.reversal}:
            </span>{" "}
            {entry.outcome.reversalTrigger}
          </p>
          {entry.sources.length > 0 ? (
            <p className="text-slate-400 break-all">
              <span className="font-medium">Sources:</span>{" "}
              {entry.sources.map((src, index) => (
                <a
                  key={src}
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400/80 hover:text-sky-300 hover:underline mr-2"
                >
                  [{index + 1}]
                </a>
              ))}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
