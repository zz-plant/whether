"use client";

import { useEffect, useMemo, useState } from "react";
import { usePersistentClientId } from "../clientIdentity";
import type { DecisionMemoryEntry } from "../../../lib/decisionMemory";
import { STORAGE_KEYS } from "../../../lib/storage/keys";
import {
  assessDecisionStaleness,
  stalenessVerdictLabel,
  type CurrentStalenessConditions,
  type StalenessVerdict,
} from "../../../lib/report/decisionStaleness";

const MEMORY_CAP = 16;

const VERDICT_TONE: Record<StalenessVerdict, string> = {
  RECONSIDER: "text-rose-300",
  WATCH: "text-amber-300",
  STAND: "text-emerald-300",
};

const VERDICT_BADGE: Record<StalenessVerdict, string> = {
  RECONSIDER: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  WATCH: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  STAND: "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-200",
};

type StalenessEntry = {
  id: string;
  label: string;
  recordDate: string;
  verdict: StalenessVerdict;
  why: string;
  moved: Array<{ label: string; detail: string }>;
};

const entryLabel = (entry: DecisionMemoryEntry): string => {
  if (entry.decision) {
    return [entry.decision.lifecycle, entry.decision.category, entry.decision.action]
      .filter(Boolean)
      .join(" · ");
  }
  return entry.outcome.summary || "Weekly posture";
};

export function DecisionStalenessPanel({
  conditions,
}: {
  conditions: CurrentStalenessConditions;
}) {
  const clientId = usePersistentClientId();
  const [entries, setEntries] = useState<DecisionMemoryEntry[]>([]);

  useEffect(() => {
    if (!clientId) return;
    try {
      const key = STORAGE_KEYS.decisionMemory(clientId);
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? (JSON.parse(raw) as DecisionMemoryEntry[]) : [];
      setEntries(
        parsed
          .filter((entry) => entry.assumptions)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, MEMORY_CAP),
      );
    } catch {
      setEntries([]);
    }
  }, [clientId]);

  const staleness = useMemo<StalenessEntry[]>(() => {
    return entries.flatMap((entry) => {
      if (!entry.assumptions) return [];
      const result = assessDecisionStaleness(entry.assumptions, conditions);
      if (result.verdict === "STAND") return [];
      return [{
        id: entry.id,
        label: entryLabel(entry),
        recordDate: entry.context.recordDate,
        verdict: result.verdict,
        why: result.why,
        moved: result.moved,
      }];
    });
  }, [entries, conditions]);

  if (entries.length === 0) {
    return (
      <section
        aria-labelledby="decision-staleness-heading"
        className="weather-section rounded-xl border border-slate-800/50 bg-slate-900/30 px-4 py-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="decision-staleness-heading" className="type-section font-semibold tracking-tight text-white/90">
            Decisions to reconsider
          </h2>
          <span className="text-fluid-nano text-slate-400">0 tracked</span>
        </div>
        <p className="mt-1.5 text-fluid-xs text-slate-400">
          No decisions tracked yet. Save this week’s call with <span className="font-medium text-slate-300">Log to Memory</span> above, or a plan verdict with <span className="font-medium text-slate-300">Track in Memory</span>, to watch its assumptions when conditions move. Tracked decisions stay in this browser.
        </p>
      </section>
    );
  }

  const attentionCount = staleness.length;

  return (
    <section
      aria-labelledby="decision-staleness-heading"
      className="weather-section rounded-xl border border-slate-800/70 bg-slate-900/40 p-4"
    >
      {/* The heading names the list; the count and the all-clear live in the badge beside
          it, so a zero state never reads as "decisions need attention". */}
      <div className="flex items-center justify-between gap-3">
        <h2 id="decision-staleness-heading" className="type-section font-semibold tracking-tight text-white">
          Decisions to reconsider
        </h2>
        {attentionCount > 0 ? (
          <span className="text-fluid-nano font-semibold text-amber-300">
            {attentionCount} need{attentionCount === 1 ? "s" : ""} attention
          </span>
        ) : (
          <span className="text-fluid-nano font-semibold text-emerald-300">All on track</span>
        )}
      </div>

      {attentionCount === 0 ? (
        <p className="mt-2 text-fluid-xs leading-5 text-slate-400">
          Your saved decisions still hold: conditions have not moved outside the range recorded when
          each was made.
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {staleness.slice(0, 4).map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-slate-800/60 bg-slate-950/40 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-fluid-xs font-semibold text-slate-100">{item.label}</p>
                <span className={`rounded-sm border px-2 py-0.5 type-badge ${VERDICT_BADGE[item.verdict]}`}>
                  {stalenessVerdictLabel(item.verdict)}
                </span>
              </div>
              <p className="mt-1 text-fluid-xs leading-5 text-slate-300">{item.why}</p>
              <p className={`mt-0.5 text-fluid-nano leading-5 ${VERDICT_TONE[item.verdict]}`}>
                {item.moved.map((assumption) => assumption.detail).join(" ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}