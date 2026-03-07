"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDateUTC, formatTimestampUTC } from "../../../lib/formatters";
import type { DecisionMemoryEntry } from "../../../lib/decisionMemory";
import { ClipboardActionRow } from "../../components/clipboardActionRow";
import { useClipboardCopy } from "../../components/useClipboardCopy";

type DecisionMemoryResponse = {
  entries: DecisionMemoryEntry[];
  count: number;
};

const buildEntryCopyText = (entry: DecisionMemoryEntry) =>
  [
    "Whether Decision Memory",
    `Captured: ${formatTimestampUTC(entry.createdAt)}`,
    `Regime: ${entry.regime.label} (${formatDateUTC(entry.context.recordDate)})`,
    `Decision: ${entry.decision.lifecycle} · ${entry.decision.category} · ${entry.decision.action}`,
    `Verdict: ${entry.outcome.verdict}`,
    `Summary: ${entry.outcome.summary}`,
    `Guardrail: ${entry.outcome.guardrail}`,
    `Reversal trigger: ${entry.outcome.reversalTrigger}`,
    `Sources: ${entry.sources.join(", ") || "None"}`,
  ].join("\n");

export const DecisionMemoryPanel = () => {
  const [entries, setEntries] = useState<DecisionMemoryEntry[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const { copyToClipboard, status, activeTarget, copiedTarget } = useClipboardCopy();

  useEffect(() => {
    let active = true;
    void fetch("/api/decision-memory")
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as DecisionMemoryResponse;
        if (active) {
          setEntries(payload.entries);
        }
      })
      .catch(() => {
        if (active) {
          setStatusMessage("Unable to load Decision Memory right now.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const latestEntry = entries[0] ?? null;

  const csvDownloadHref = useMemo(() => {
    if (entries.length === 0) {
      return null;
    }
    return "/api/decision-memory?format=csv";
  }, [entries.length]);

  return (
    <section id="decision-memory" aria-labelledby="decision-memory-title" className="mt-10">
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Decision Memory</p>
            <h3 id="decision-memory-title" className="type-section text-slate-100">
              Immutable audit trail for decision runs
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Each saved Decision Shield run stores inputs, verdict, thresholds, and source links.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {csvDownloadHref ? (
              <a
                href={csvDownloadHref}
                className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200"
              >
                Export CSV
              </a>
            ) : null}
            {latestEntry ? (
              <ClipboardActionRow
                label="Copy latest JSON"
                state={status === "copying" && activeTarget === "json" ? "copying" : status === "copied" && copiedTarget === "json" ? "copied" : "idle"}
                buttonVariant="pill"
                buttonLabels={{ copied: "JSON copied" }}
                onClick={() => void copyToClipboard(JSON.stringify(latestEntry, null, 2), "json")}
              />
            ) : null}
          </div>
        </div>

        {statusMessage ? <p className="mt-4 text-sm text-amber-200">{statusMessage}</p> : null}

        {entries.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/50 p-4">
            <p className="text-sm text-slate-300">
              No Decision Memory entries yet. Save a Decision Shield verdict to start the audit trail.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {entries.slice(0, 8).map((entry) => (
              <div key={entry.id} className="weather-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                      Captured {formatTimestampUTC(entry.createdAt)}
                    </p>
                    <p className="mt-2 text-sm text-slate-100">
                      {entry.decision.lifecycle} · {entry.decision.category} · {entry.decision.action}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {entry.regime.label} regime · verdict {entry.outcome.verdict}
                    </p>
                  </div>
                  <ClipboardActionRow
                    label="Copy entry"
                    state={status === "copying" && activeTarget === entry.id ? "copying" : status === "copied" && copiedTarget === entry.id ? "copied" : "idle"}
                    buttonVariant="pill"
                    compact
                    onClick={() => void copyToClipboard(buildEntryCopyText(entry), entry.id)}
                  />
                </div>
                <p className="mt-3 text-sm text-slate-300">{entry.outcome.summary}</p>
                <p className="mt-2 text-xs text-slate-400">Guardrail: {entry.outcome.guardrail}</p>
                <p className="mt-1 text-xs text-slate-500">Reversal: {entry.outcome.reversalTrigger}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
