/**
 * The reader's ledger, read back in the browser that wrote it.
 *
 * Client-side because the ledger is owned by a browser: `/api/decision-memory`
 * authorises on `x-whether-client-id`, an opaque id that only exists in local
 * storage, so there is no server render of "your decisions" to be had. The
 * current reading comes the other way — rendered on the server, where the
 * report already is — so the page never asks the browser for a market number.
 */
"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePersistentClientId } from "../components/clientIdentity";
import { publicDecisionLabels } from "../../lib/report/reportFormatting";
import { useHydrated } from "../components/browserSource";
import { fetchDecisionLedger, logDecisionFollowUp, logDecisionSnapshotToLedger } from "../components/decisionLedgerClient";
import { MonthStrip } from "../components/history/monthStrip";
import type { DecisionFollowUpResponse } from "../../lib/decisionFollowUp";
import { FOLLOW_UP_NOTE_MAX_LENGTH } from "../../lib/decisionFollowUp";
import type { DecisionMemorySnapshotPayload } from "../../lib/decisionMemory";
import {
  buildDecisionRecordView,
  RESPONSE_OPTIONS,
  type CurrentConditions,
  type DecisionRecordRow,
  type DecisionRecordView,
} from "../../lib/report/decisionRecordView";

type PanelState =
  | { status: "reading" }
  | { status: "ready"; view: DecisionRecordView }
  | { status: "failed"; reason: string };

const VERDICT_STYLES: Record<DecisionRecordRow["verdict"], string> = {
  STAND: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  WATCH: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  RECONSIDER: "border-rose-400/40 bg-rose-400/10 text-rose-200",
};

/*
 * The marker diamonds take the same verdict hues the badges on this page
 * wear, so a diamond and its row match without a second key: this page has
 * one verdict vocabulary, and the strip borrows it (2026-10-21).
 */
const VERDICT_MARKER_FILL: Record<DecisionRecordRow["verdict"], string> = {
  STAND: "bg-emerald-400/80",
  WATCH: "bg-amber-400/80",
  RECONSIDER: "bg-rose-400/80",
};

/* A filter is a key, not a verdict stamp: it used to wear VERDICT_STYLES' colours
   in the stamp's 2px frame, so the row of filters read as a row of verdicts
   (ui-ux-standards §XXVI, §XXVII). */
const FilterKey = ({ pressed, onPress, children }: { pressed: boolean; onPress: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onPress}
    aria-pressed={pressed}
    className="weather-key weather-focus-ring inline-flex min-h-11 items-center gap-1.5 px-2.5 py-2 text-xs font-semibold"
  >
    <span className="weather-segment-lamp" aria-hidden="true" />
    {children}
  </button>
);

/**
 * What a row's review control needs. Optional on `DecisionLedgerView` so a
 * server render (or a test) that has no browser identity renders the record
 * without the review form.
 */
type ReviewContext = {
  clientId: string;
  current: CurrentConditions;
  /** The reading being reviewed against; a row already reviewed against it shows its response instead of the form. */
  recordDate: string;
  /** Called after a review is recorded, so the panel re-reads the record. */
  onRecorded: () => void;
};

const FollowUpForm = ({ row, review }: { row: DecisionRecordRow; review: ReviewContext }) => {
  const [response, setResponse] = useState<DecisionFollowUpResponse | null>(null);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);
  const [needsChoice, setNeedsChoice] = useState(false);

  const submit = async () => {
    if (!response) {
      setNeedsChoice(true);
      return;
    }
    setState("saving");
    setError(null);
    const result = await logDecisionFollowUp(review.clientId, {
      recordDate: review.recordDate,
      entryId: row.id,
      response,
      note: note.trim() || undefined,
      conditions: { tightness: review.current.tightness, riskAppetite: review.current.riskAppetite },
    });
    if (!result.ok) {
      setState("failed");
      setError(result.reason);
      return;
    }
    review.onRecorded();
  };

  return (
    <form
      className="mt-4 rounded-lg border border-[color:var(--border-subtle)] bg-[var(--bg-nested)] p-3 sm:p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <fieldset>
        <legend className="type-eyebrow text-slate-200">Record your review</legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {RESPONSE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setResponse(option.value);
                setNeedsChoice(false);
              }}
              aria-pressed={response === option.value}
              className="weather-key weather-focus-ring inline-flex min-h-11 items-center gap-1.5 px-2.5 py-2 text-xs font-semibold"
            >
              {option.label}
            </button>
          ))}
        </div>
        {needsChoice ? (
          <p className="mt-2 text-xs leading-5 text-amber-200">Choose Continued, Changed, or Deferred.</p>
        ) : null}
        <label className="mt-3 block">
          <span className="type-eyebrow text-slate-300">Note (optional)</span>
          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What changed, or when to revisit"
            maxLength={FOLLOW_UP_NOTE_MAX_LENGTH}
            className="weather-input weather-focus-ring mt-1 w-full px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={state === "saving"}
            className="weather-button weather-focus-ring weather-press-scale inline-flex min-h-11 items-center px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state === "saving" ? "Recording…" : "Record review"}
          </button>
          {state === "failed" && error ? <p className="type-label text-amber-200">{error}</p> : null}
        </div>
      </fieldset>
      <output className="sr-only" aria-live="polite">
        {state === "saving" ? "Recording your review." : state === "failed" && error ? error : ""}
      </output>
    </form>
  );
};

const RecordRow = ({ row, review }: { row: DecisionRecordRow; review?: ReviewContext }) => (
  <li className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-slate-50">{row.title}</h3>
        <p className="mt-1 text-xs text-slate-400">
          {row.isPostureSnapshot ? "Guidance recorded" : "Decision recorded"} against the {row.recordedOn} reading
        </p>
      </div>
      <span className={`shrink-0 rounded-sm border px-3 py-1 text-xs font-semibold ${VERDICT_STYLES[row.verdict]}`}>
        {row.verdict}
      </span>
    </div>

    <p className="mt-3 text-sm leading-6 text-slate-200">{row.verdictSentence}</p>
    <p className="mt-1 text-sm leading-6 text-slate-400">{row.why}</p>

    {row.moved.length > 0 ? (
      <ul className="mt-3 space-y-1.5 border-l-2 border-slate-800 pl-4">
        {row.moved.map((assumption) => (
          <li key={assumption.dimension} className="text-sm leading-6 text-slate-300">
            <span className="font-medium text-slate-100">{assumption.label}:</span> {assumption.detail}
          </li>
        ))}
      </ul>
    ) : null}

    {row.guardrail || row.reversalTrigger ? (
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {row.guardrail ? (
          <div>
            <dt className="type-eyebrow">{publicDecisionLabels.threshold}</dt>
            <dd className="mt-0.5 text-slate-300">{row.guardrail}</dd>
          </div>
        ) : null}
        {row.reversalTrigger ? (
          <div>
            <dt className="type-eyebrow">{publicDecisionLabels.reversal}</dt>
            <dd className="mt-0.5 text-slate-300">{row.reversalTrigger}</dd>
          </div>
        ) : null}
      </dl>
    ) : null}

    {row.followUp ? (
      <div className="mt-4 rounded-lg border border-[color:var(--border-subtle)] bg-[var(--bg-nested)] px-3 py-2 text-sm leading-6">
        <p className="text-slate-200">
          <span className="font-semibold text-slate-100">
            Reviewed against the {row.followUp.respondedOn} reading:
          </span>{" "}
          {row.followUp.responseSentence}
        </p>
        {row.followUp.note ? <p className="mt-1 text-slate-400">{row.followUp.note}</p> : null}
      </div>
    ) : null}

    {review && row.verdict !== "STAND" && row.followUp?.recordDate !== review.recordDate ? (
      <FollowUpForm row={row} review={review} />
    ) : null}
  </li>
);

type SnapshotContext = {
  clientId: string;
  current: CurrentConditions;
  recordDate: string;
  regime: string;
  /** The week's standing call, company-agnostic — the posture the ledger records. */
  primaryCall: string;
  onRecorded: () => void;
};

const RecordSnapshotControl = ({ snapshot }: { snapshot: SnapshotContext }) => {
  const [state, setState] = useState<"idle" | "saving" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);

  const record = async () => {
    setState("saving");
    setError(null);
    const payload: DecisionMemorySnapshotPayload = {
      kind: "posture-snapshot",
      recordDate: snapshot.recordDate,
      regime: snapshot.regime,
      primaryCall: snapshot.primaryCall,
      tightness: snapshot.current.tightness,
      riskAppetite: snapshot.current.riskAppetite,
    };
    const result = await logDecisionSnapshotToLedger(snapshot.clientId, payload);
    if (!result.ok) {
      setState("failed");
      setError(result.reason);
      return;
    }
    snapshot.onRecorded();
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => void record()}
        disabled={state === "saving"}
        className="weather-button weather-focus-ring weather-press-scale inline-flex min-h-11 items-center px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === "saving" ? "Recording…" : "Record this week's call"}
      </button>
      {state === "failed" && error ? <p className="type-label text-amber-200">{error}</p> : null}
    </div>
  );
};

const EmptyState = ({ snapshot }: { snapshot?: SnapshotContext }) => (
  <div className="space-y-2 rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-sm leading-6 text-slate-300">
    <p className="font-semibold text-slate-100">Nothing recorded from this browser yet.</p>
    <p>
      Run a decision through the{" "}
      <Link href="/operate" className="text-sky-300 underline-offset-2 hover:underline">
        Decision Shield
      </Link>{" "}
      and record it. Each one is stored with the reading it was made against, so a later week can tell you
      whether the conditions it relied on still hold.
    </p>
    {snapshot ? (
      <>
        <p>
          Or record this week's standing call — the company-agnostic posture — and next week's reading checks it.
        </p>
        <RecordSnapshotControl snapshot={snapshot} />
      </>
    ) : null}
  </div>
);

export const DecisionLedgerView = ({
  view,
  record,
  review,
  snapshot,
}: {
  view: DecisionRecordView;
  record?: readonly { recordDate: string; regime: string; tightness?: number; riskAppetite?: number }[];
  review?: ReviewContext;
  snapshot?: SnapshotContext;
}) => {
  const [filter, setFilter] = useState<"all" | "RECONSIDER" | "WATCH" | "STAND">("all");

  if (view.rows.length === 0) {
    return <EmptyState snapshot={snapshot} />;
  }

  const filteredRows = view.rows.filter(
    (row) => filter === "all" || row.verdict === filter,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm leading-6 text-slate-200">{view.headline}</p>
        <fieldset className="flex flex-wrap items-center gap-1.5" aria-label="Filter decisions by status">
          <FilterKey pressed={filter === "all"} onPress={() => setFilter("all")}>
            All ({view.rows.length})
          </FilterKey>
          {view.counts.reconsider > 0 ? (
            <FilterKey pressed={filter === "RECONSIDER"} onPress={() => setFilter("RECONSIDER")}>
              Reconsider ({view.counts.reconsider})
            </FilterKey>
          ) : null}
          {view.counts.watch > 0 ? (
            <FilterKey pressed={filter === "WATCH"} onPress={() => setFilter("WATCH")}>
              Watch ({view.counts.watch})
            </FilterKey>
          ) : null}
          {view.counts.stand > 0 ? (
            <FilterKey pressed={filter === "STAND"} onPress={() => setFilter("STAND")}>
              Stand ({view.counts.stand})
            </FilterKey>
          ) : null}
        </fieldset>
      </div>
      {/* The decisions on the record's timeline: one diamond per decision,
          against the month whose reading it was made in, in the verdict the
          badges below carry. What it encodes is the thing the tags can't show
          at a glance — decided in Sunny, reconsidered now (2026-10-21). */}
      {record && record.length > 0 ? (
        <MonthStrip
          entries={record}
          markers={view.rows.map((row) => ({
            recordDate: row.recordDate,
            label: `${row.title} — recorded against the ${row.recordedOn} reading — ${row.verdict}: ${row.verdictSentence}`,
            fillClassName: VERDICT_MARKER_FILL[row.verdict],
          }))}
          markersLegend="A diamond marks a decision recorded from this browser, against the month whose reading it assumed."
        />
      ) : null}
      <ul className="space-y-3">
        {filteredRows.map((row) => (
          <RecordRow key={row.id} row={row} review={review} />
        ))}
      </ul>
    </div>
  );
};

export const DecisionRecordPanel = ({
  current,
  record,
  recordDate,
  regime,
  primaryCall,
}: {
  current: CurrentConditions;
  record?: readonly { recordDate: string; regime: string; tightness?: number; riskAppetite?: number }[];
  /** The reading being reviewed against; passed through so a review names it. */
  recordDate: string;
  /** The regime key and standing call, for recording this week's posture in an empty ledger. */
  regime?: string;
  primaryCall?: string;
}) => {
  const clientId = usePersistentClientId();
  const hydrated = useHydrated();
  const [state, setState] = useState<PanelState>({ status: "reading" });

  const read = useCallback(
    async (id: string): Promise<PanelState> => {
      const result = await fetchDecisionLedger(id);
      if (!result.ok) return { status: "failed", reason: result.reason };
      return { status: "ready", view: buildDecisionRecordView(result.entries, current, result.followUps) };
    },
    [current],
  );

  /*
   * A network read, which is what an effect is actually for — unlike the eleven
   * conversions docs/agents/lessons/toolchain-and-gates.md records, there is no browser value here to read
   * synchronously through a store. `clientId` is null until hydration, so the
   * first pass does nothing and the second one fetches.
   */
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    void read(clientId).then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [clientId, read]);

  /*
   * Hydrated with no id means storage is blocked or cleared, not that the read
   * is slow. Without this the two are the same screen and a reader who has
   * turned off site data waits forever on "Reading…".
   */
  if (hydrated && !clientId) {
    return (
      <p className="text-sm leading-6 text-slate-300">
        This browser is not storing an identifier, so there is no record to read back. Records are kept per
        browser and never joined to an email address.
      </p>
    );
  }

  if (state.status === "reading") {
    return <p className="text-sm text-slate-400">Reading what this browser has recorded…</p>;
  }

  if (state.status === "failed") {
    return <p className="text-sm leading-6 text-amber-200">{state.reason}</p>;
  }

  return (
    <DecisionLedgerView
      view={state.view}
      record={record}
      review={clientId ? { clientId, current, recordDate, onRecorded: () => void read(clientId).then(setState) } : undefined}
      snapshot={clientId && regime && primaryCall
        ? { clientId, current, recordDate, regime, primaryCall, onRecorded: () => void read(clientId).then(setState) }
        : undefined}
    />
  );
};
