/**
 * Buttons, not links, because the export needs a header.
 *
 * `/api/decision-memory` authorises every read on `x-whether-client-id`, so an
 * `<a href>` to it hands the reader a 401 for their own record. The fetch and
 * the blob are in `decisionLedgerClient`; this is the control and its two
 * failure states.
 */
"use client";

import { useState } from "react";
import { usePersistentClientId } from "../components/clientIdentity";
import { downloadDecisionLedger, type LedgerDownloadFormat } from "../components/decisionLedgerClient";

const FORMATS: Array<{ format: LedgerDownloadFormat; label: string }> = [
  { format: "csv", label: "Download as CSV" },
  { format: "records", label: "Download as delegation records" },
];

export const DecisionRecordDownloads = () => {
  const clientId = usePersistentClientId();
  const [busy, setBusy] = useState<LedgerDownloadFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async (format: LedgerDownloadFormat) => {
    if (!clientId) return;
    setBusy(format);
    setError(null);
    const result = await downloadDecisionLedger(clientId, format);
    setBusy(null);
    if (!result.ok) setError(result.reason);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {FORMATS.map(({ format, label }) => (
          <button
            key={format}
            type="button"
            onClick={() => void start(format)}
            disabled={!clientId || busy !== null}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-sky-500/60 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === format ? "Preparing…" : label}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-amber-200">{error}</p> : null}
    </div>
  );
};
