/**
 * Panel for reviewing logged regime alert changes.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useClipboardCopy } from "./useClipboardCopy";
import { regimeAlertsStorageKey, type RegimeAlertLogEntry } from "./regimeAlertsStorage";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const recordFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

const formatTimestamp = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? value : dateFormatter.format(parsed);
};

const formatRecordDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? value : recordFormatter.format(parsed);
};

const buildAlertCopyText = (entry: RegimeAlertLogEntry) => {
  const { previous, current, reasons, loggedAt } = entry;

  return [
    "Whether Regime Alert Log",
    `Logged at: ${formatTimestamp(loggedAt)}`,
    `Previous record: ${formatRecordDate(previous.recordDate)} — ${previous.assessment.regime}`,
    `Current record: ${formatRecordDate(current.recordDate)} — ${current.assessment.regime}`,
    "Reasons:",
    ...reasons.map((reason) => `• ${reason.message}`),
  ].join("\n");
};

export const RegimeAlertsPanel = () => {
  const [alerts, setAlerts] = useState<RegimeAlertLogEntry[]>([]);
  const { activeTarget, copiedTarget, status, error, copyToClipboard } = useClipboardCopy();

  const loadAlerts = useCallback(() => {
    try {
      const stored = window.localStorage.getItem(regimeAlertsStorageKey);
      if (!stored) {
        setAlerts([]);
        return;
      }
      const parsed = JSON.parse(stored) as RegimeAlertLogEntry[];
      setAlerts(Array.isArray(parsed) ? parsed : []);
    } catch {
      setAlerts([]);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === regimeAlertsStorageKey) {
        loadAlerts();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [loadAlerts]);

  return (
    <section id="regime-alert-log" aria-labelledby="regime-alert-log-title" className="mt-10">
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Regime alert log</p>
            <h3 id="regime-alert-log-title" className="type-section text-slate-100">
              Alert history and copy-ready summaries
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Review regime change alerts detected since your last reads and copy the snapshot for
              sharing.
            </p>
          </div>
        </div>
        {alerts.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/50 p-4">
            <p className="text-sm text-slate-300">
              No alert history yet. Open reports again after a new Treasury record lands to log the
              first alert.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {alerts.map((entry) => {
              const copyText = buildAlertCopyText(entry);
              const isCopying = status === "copying" && activeTarget === entry.id;
              const isCopied = copiedTarget === entry.id && status === "copied";

              return (
                <div key={entry.id} className="weather-surface p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                        Alert logged {formatTimestamp(entry.loggedAt)}
                      </p>
                      <p className="mt-2 text-sm text-slate-100">
                        {entry.previous.assessment.regime} → {entry.current.assessment.regime}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Previous record: {formatRecordDate(entry.previous.recordDate)} · Current
                        record: {formatRecordDate(entry.current.recordDate)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(copyText, entry.id)}
                      aria-busy={isCopying}
                      className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-1 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 touch-manipulation"
                    >
                      {isCopying ? "Copying" : isCopied ? "Copied" : "Copy alert"}
                    </button>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-slate-300">
                    {entry.reasons.map((reason) => (
                      <li key={reason.code} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500" />
                        <span>{reason.message}</span>
                      </li>
                    ))}
                  </ul>
                  {error ? (
                    <p className="mt-3 text-xs text-rose-300">
                      Clipboard access unavailable. Try manually selecting the alert text.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
