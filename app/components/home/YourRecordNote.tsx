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
export function RecordNote({ view, recordDate }: { view: DecisionRecordView; recordDate?: string }) {
  if (view.rows.length === 0) return null;
  const needsAttention = view.counts.watch + view.counts.reconsider > 0;
  /* A decision that needs attention but has no follow-up against this week's
     reading is the actionable gap: the note says how many, rather than leaving
     "conditions moved" as the whole story. */
  const awaitingReview = recordDate
    ? view.rows.filter((row) => row.verdict !== "STAND" && row.followUp?.recordDate !== recordDate).length
    : 0;
  return (
    <div
      data-testid="your-record-note"
      data-needs-attention={needsAttention ? "true" : "false"}
      className={`mt-3 flex flex-wrap items-center justify-between gap-2.5 rounded-lg border px-3.5 py-2 text-fluid-xs leading-5 ${
        needsAttention
          ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
          : "border-[color:var(--border-subtle)] bg-[color:var(--bg-nested)] text-slate-300"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {view.counts.reconsider > 0 ? (
          <span className="inline-flex items-center rounded bg-rose-500/20 px-1.5 py-0.5 text-fluid-nano font-bold uppercase tracking-wider text-rose-300 border border-rose-500/30">
            Reconsider ({view.counts.reconsider})
          </span>
        ) : view.counts.watch > 0 ? (
          <span className="inline-flex items-center rounded bg-amber-500/20 px-1.5 py-0.5 text-fluid-nano font-bold uppercase tracking-wider text-amber-300 border border-amber-500/30">
            Watch ({view.counts.watch})
          </span>
        ) : null}
        <span>
          <span className="font-semibold text-slate-100">Your decisions:</span> {view.headline}
          {awaitingReview > 0 ? (
            <span className="text-amber-200">{" "}· {awaitingReview} await{awaitingReview === 1 ? "s" : ""} this week's review</span>
          ) : null}
        </span>
      </div>
      <Link
        href="/decisions"
        className="shrink-0 whitespace-nowrap text-sky-300 underline decoration-sky-700 underline-offset-4 hover:text-sky-200"
      >
        See your decision record
      </Link>
    </div>
  );
}

export function YourRecordNote({ tightness, riskAppetite, recordDate }: { tightness: number; riskAppetite: number; recordDate?: string }) {
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

  return view ? <RecordNote view={view} recordDate={recordDate} /> : null;
}
