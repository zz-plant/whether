"use client";

import { useCallback, useEffect, useState } from "react";
import { usePersistentClientId } from "../../components/clientIdentity";
import { formatDateUTC, formatTimestampUTC } from "../../../lib/formatters";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import {
  type DecisionMemoryEntry,
  evaluateDecisionAssumptionHealth,
} from "../../../lib/decisionMemory";
import { ClipboardActionRow } from "../../components/clipboardActionRow";
import { DECISION_MEMORY_UPDATED_EVENT } from "../../components/decisionMemoryLocalCache";
import { CopyIcon, DownloadIcon } from "../../components/uiIcons";
import { STORAGE_KEYS } from "../../../lib/storage/keys";
import { getClipboardUiState, useClipboardCopy } from "../../components/useClipboardCopy";

type DecisionMemoryResponse = {
  entries: DecisionMemoryEntry[];
  count: number;
};

// Posture snapshots carry no decision triple and no verdict, so those lines are
// dropped rather than printed as "undefined".
const buildEntryCopyText = (entry: DecisionMemoryEntry) =>
  [
    "Whether Saved Decisions",
    `Captured: ${formatTimestampUTC(entry.createdAt)}`,
    `Regime: ${entry.regime.label} (${formatDateUTC(entry.context.recordDate)})`,
    entry.decision
      ? `Decision: ${entry.decision.lifecycle} · ${entry.decision.category} · ${entry.decision.action}`
      : "Decision: Weekly operating posture",
    entry.outcome.verdict ? `Verdict: ${entry.outcome.verdict}` : null,
    `Summary: ${entry.outcome.summary}`,
    entry.outcome.guardrail ? `${DECISION_CONTRACT_LABELS.threshold.guardrail}: ${entry.outcome.guardrail}` : null,
    entry.outcome.reversalTrigger ? `${DECISION_CONTRACT_LABELS.reversal.reversal} trigger: ${entry.outcome.reversalTrigger}` : null,
    `Sources: ${entry.sources.join(", ") || "None"}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

export const DecisionMemoryPanel = ({
  currentTightness,
  currentRiskAppetite,
}: {
  currentTightness?: number;
  currentRiskAppetite?: number;
}) => {
  const [entries, setEntries] = useState<DecisionMemoryEntry[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const { copyToClipboard, status, activeTarget, copiedTarget } = useClipboardCopy();
  const clientId = usePersistentClientId();

  const fetchEntries = useCallback(() => {
    if (!clientId) {
      return;
    }
    setStatusMessage(null);
    void fetch(`/api/decision-memory?clientId=${encodeURIComponent(clientId)}`, {
      headers: { "x-whether-client-id": clientId },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("HTTP error");
        }
        const payload = (await response.json()) as DecisionMemoryResponse;
        
        // Load local storage entries and merge
        const localKey = STORAGE_KEYS.decisionMemory(clientId);
        const localRaw = window.localStorage.getItem(localKey);
        const localEntries: DecisionMemoryEntry[] = localRaw ? JSON.parse(localRaw) : [];

        const mergedMap = new Map<string, DecisionMemoryEntry>();
        localEntries.forEach((entry) => mergedMap.set(entry.id, entry));
        // Server entries win: they are the authoritative copy of the same id.
        payload.entries.forEach((entry) => mergedMap.set(entry.id, entry));

        const sortedEntries = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        // Write the merged set back
        window.localStorage.setItem(localKey, JSON.stringify(sortedEntries.slice(0, 64)));

        setEntries(sortedEntries);
      })
      .catch(() => {
        // Fallback to local storage only
        const localKey = STORAGE_KEYS.decisionMemory(clientId);
        const localRaw = window.localStorage.getItem(localKey);
        if (localRaw) {
          try {
            const localEntries = JSON.parse(localRaw);
            setEntries(localEntries);
          } catch {
            setStatusMessage("Your decision history couldn't load — browser cache may be corrupted. Clear browser data and refresh.");
            setEntries([]);
          }
        } else {
          setStatusMessage("No saved decisions yet. Start with Log to Memory in the weekly brief.");
          setEntries([]);
        }
      });
  }, [clientId]);

  useEffect(() => {
    fetchEntries();
    
    const handleUpdate = () => {
      fetchEntries();
    };
    window.addEventListener(DECISION_MEMORY_UPDATED_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(DECISION_MEMORY_UPDATED_EVENT, handleUpdate);
    };
  }, [clientId, fetchEntries]);

  const latestEntry = entries[0] ?? null;

  const downloadCsv = () => {
    if (entries.length === 0) return;
    const header = [
      "id",
      "createdAt",
      "clientId",
      "recordDate",
      "regime",
      "verdict",
      "lifecycle",
      "category",
      "action",
      "summary",
      "guardrail",
      "reversalTrigger",
      "sources",
    ];

    const escapeCsvCell = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const rows = entries.map((entry) => [
      entry.id,
      entry.createdAt,
      entry.context.clientId,
      entry.context.recordDate,
      entry.regime.label,
      entry.outcome.verdict ?? "",
      entry.decision?.lifecycle ?? "",
      entry.decision?.category ?? "",
      entry.decision?.action ?? "",
      entry.outcome.summary,
      entry.outcome.guardrail,
      entry.outcome.reversalTrigger,
      entry.sources.join(" | "),
    ]);

    const csvContent = [header, ...rows].map((row) => row.map((value) => escapeCsvCell(String(value))).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "decision-memory.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section id="decision-memory" aria-labelledby="decision-memory-title" className="mt-10">
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Saved decisions</p>
            <h3 id="decision-memory-title" className="type-section text-slate-100">
              Saved history for decision checks
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Each saved decision check stores the inputs, result, stop line, and source links.
            </p>
            <p className="mt-1 text-fluid-xs text-slate-400">
              Saved decisions are tied to this browser. Clearing site data or switching devices starts a new history; export CSV to keep a copy.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {entries.length > 0 ? (
              <button
                type="button"
                onClick={downloadCsv}
                className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 hover:border-sky-400/50 hover:text-slate-100 transition-colors"
                data-premium-intent="team_workflow"
                data-premium-cta="export_decision_memory_csv"
              >
                <span className="inline-flex items-center gap-1.5"><DownloadIcon className="h-3.5 w-3.5" aria-hidden="true" />Export CSV</span>
              </button>
            ) : null}
            {latestEntry ? (
              <ClipboardActionRow
                label={<span className="inline-flex items-center gap-1.5"><CopyIcon className="h-3.5 w-3.5" aria-hidden="true" />Copy latest JSON</span>}
                state={getClipboardUiState("json", { status, error: false, activeTarget, copiedTarget }, { includeError: false, requireCopiedStatus: true })}
                buttonVariant="pill"
                buttonLabels={{ copied: <span className="inline-flex items-center gap-1.5"><CopyIcon className="h-3.5 w-3.5" aria-hidden="true" />JSON copied</span> }}
                onClick={() => void copyToClipboard(JSON.stringify(latestEntry, null, 2), "json")}
                buttonProps={{
                  "data-premium-intent": "team_workflow",
                  "data-premium-cta": "copy_decision_memory_json",
                }}
              />
            ) : null}
          </div>
        </div>

        {statusMessage ? <p className="mt-4 text-sm text-amber-200">{statusMessage}</p> : null}

        {!clientId ? (
          <div className="mt-6 rounded-lg border border-dashed border-slate-800/80 bg-slate-950/50 p-4">
            <p className="text-sm text-slate-300">
              Loading your operator audit trail.
            </p>
          </div>
        ) : entries.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-slate-800/80 bg-slate-950/50 p-4">
            <p className="text-sm text-slate-300">
              No saved decisions yet. On the weekly brief, click <span className="font-semibold text-slate-100">Log to Memory</span> to save this week&apos;s call, or <span className="font-semibold text-slate-100">Track in Memory</span> under a plan stress test verdict.
            </p>
          </div>
        ) : (
          <div className="mt-6 relative border-l-2 border-slate-800/80 ml-4 pl-6 space-y-8">
            {entries.slice(0, 8).map((entry) => {
              const health = currentTightness !== undefined && currentRiskAppetite !== undefined
                ? evaluateDecisionAssumptionHealth({ entry, currentTightness, currentRiskAppetite })
                : null;

              const healthBadgeClass =
                health?.verdict === "RECONSIDER"
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                  : health?.verdict === "WATCH"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";

              return (
                <div key={entry.id} className="relative">
                  <div className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-2 border-slate-900 bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
                  
                  <div className="weather-surface p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                            Captured {formatTimestampUTC(entry.createdAt)}
                          </p>
                          {health ? (
                            <span className={`inline-flex items-center rounded border px-2 py-0.5 text-fluid-nano font-semibold tracking-wider ${healthBadgeClass}`}>
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
                        label={<span className="inline-flex items-center gap-1"><CopyIcon className="h-3.5 w-3.5" aria-hidden="true" />Copy entry</span>}
                        state={getClipboardUiState(entry.id, { status, error: false, activeTarget, copiedTarget }, { includeError: false, requireCopiedStatus: true })}
                        buttonVariant="pill"
                        compact
                        onClick={() => void copyToClipboard(buildEntryCopyText(entry), entry.id)}
                      />
                    </div>
                    {health?.reason ? (
                      <p className="mt-2 text-xs text-slate-400 italic">
                        {health.reason}
                      </p>
                    ) : null}
                    <p className="mt-3 text-sm text-slate-300 break-words leading-relaxed">{entry.outcome.summary}</p>
                    <div className="mt-4 pt-3 border-t border-slate-800/50 grid gap-2 text-xs">
                      <p className="text-slate-400"><span className="font-medium text-slate-400">{DECISION_CONTRACT_LABELS.threshold.guardrail}:</span> {entry.outcome.guardrail}</p>
                      <p className="text-slate-400"><span className="font-medium text-slate-400">{DECISION_CONTRACT_LABELS.reversal.reversal}:</span> {entry.outcome.reversalTrigger}</p>
                      {entry.sources.length > 0 && (
                        <p className="text-slate-400 break-all">
                          <span className="font-medium">Sources:</span>{" "}
                          {entry.sources.map((src, i) => (
                            <a key={src} href={src} target="_blank" rel="noreferrer" className="text-sky-400/80 hover:text-sky-300 hover:underline mr-2">
                              [{i + 1}]
                            </a>
                          ))}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
