"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePersistentClientId } from "../clientIdentity";
import { loadRecordNoteView } from "../decisionLedgerClient";
import type { DecisionRecordView } from "../../../lib/report/decisionRecordView";

/**
 * A returning reader's own decisions, against this week's reading, in one line.
 *
 * The brief answers "which of your commitments need reconsidering?" for a company in
 * general, by area, and the decision record answered it for this browser's own — on a
 * page nothing above the footer pointed at, so the two halves of the same question were
 * read in two places by nobody. This is the join: what the record says, in the record's
 * own sentence (`buildDecisionRecordView`'s headline, so it cannot say a different thing
 * here), and the way to the rows.
 *
 * It renders nothing for a browser with no record, on a failed read, and until the read
 * lands. The homepage is the busiest route on the site and almost no browser on it has
 * recorded a decision, so it asks the server only when this browser remembers having done
 * so (`loadRecordNoteView`), and an addition to the brief never puts an error under the call.
 */
export function RecordNote({ view }: { view: DecisionRecordView }) {
  if (view.rows.length === 0) return null;
  const needsAttention = view.counts.watch + view.counts.reconsider > 0;
  return (
    <p
      data-testid="your-record-note"
      data-needs-attention={needsAttention ? "true" : "false"}
      className={`mt-3 text-fluid-xs leading-5 ${needsAttention ? "text-amber-200/90" : "text-slate-400"}`}
    >
      <span className="font-semibold text-slate-100">Your record:</span> {view.headline}{" "}
      <Link
        href="/decisions"
        className="whitespace-nowrap text-sky-300 underline decoration-sky-700 underline-offset-4 hover:text-sky-200"
      >
        See your decision record
      </Link>
    </p>
  );
}

export function YourRecordNote({ tightness, riskAppetite }: { tightness: number; riskAppetite: number }) {
  const clientId = usePersistentClientId();
  const [view, setView] = useState<DecisionRecordView | null>(null);

  /* A network read, which is what an effect is for; `clientId` is null until hydration. */
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    void loadRecordNoteView(clientId, { tightness, riskAppetite }).then((next) => {
      if (!cancelled) setView(next);
    });
    return () => {
      cancelled = true;
    };
  }, [clientId, tightness, riskAppetite]);

  return view ? <RecordNote view={view} /> : null;
}
