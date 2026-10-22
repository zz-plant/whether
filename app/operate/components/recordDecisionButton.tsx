/**
 * Records the verdict on screen into the ledger that already existed to hold it.
 *
 * The Decision Shield computed a verdict, a guardrail and a reversal trigger
 * against a specific reading, offered to copy them, and then dropped them. The
 * store for exactly this — append-only, owned by the browser, exportable in a
 * citable record shape — has been behind `/api/decision-memory` the whole time
 * with no writer in the app and no reader either. This is the writer;
 * `/decisions` is the reader.
 *
 * Nothing here re-derives anything. Every field is what the panel is already
 * rendering, which is what makes the stored assumption snapshot honest: the
 * conditions recorded are the conditions the reader was looking at.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePersistentClientId } from "../../components/clientIdentity";
import { logDecisionToLedger } from "../../components/decisionLedgerClient";
import type { DecisionMemoryPayload } from "../../../lib/decisionMemory";

type RecordState = "idle" | "saving" | "saved" | "failed";

export const RecordDecisionButton = ({ buildPayload }: { buildPayload: () => DecisionMemoryPayload }) => {
  const clientId = usePersistentClientId();
  const [state, setState] = useState<RecordState>("idle");
  const [error, setError] = useState<string | null>(null);

  const record = async () => {
    if (!clientId) return;
    setState("saving");
    setError(null);
    const result = await logDecisionToLedger(clientId, buildPayload());
    if (result.ok) {
      setState("saved");
      return;
    }
    setState("failed");
    setError(result.reason);
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void record()}
        disabled={!clientId || state === "saving"}
        className="weather-button weather-focus-ring weather-press-scale inline-flex min-h-[44px] items-center px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === "saving" ? "Recording…" : state === "saved" ? "Recorded" : "Record this decision"}
      </button>
      {/* Where it went is the half that makes recording worth doing; a
          confirmation that names no destination is a dead end. */}
      {state === "saved" ? (
        <p className="type-label text-slate-400">
          In{" "}
          <Link href="/decisions" className="text-sky-300 underline-offset-2 hover:underline">
            your decision record
          </Link>
        </p>
      ) : null}
      {state === "failed" && error ? <p className="type-label text-amber-200">{error}</p> : null}
      <output className="sr-only" aria-live="polite">
        {state === "saved" ? "Decision recorded to your decision record." : state === "failed" ? error : ""}
      </output>
    </div>
  );
};
