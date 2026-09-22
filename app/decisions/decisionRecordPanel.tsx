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

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePersistentClientId } from "../components/clientIdentity";
import { publicDecisionLabels } from "../../lib/report/reportFormatting";
import { useHydrated } from "../components/browserSource";
import { fetchDecisionLedger } from "../components/decisionLedgerClient";
import {
  buildDecisionRecordView,
  type CurrentConditions,
  type DecisionRecordRow,
  type DecisionRecordView,
} from "../../lib/report/decisionRecordView";
import { DecisionShieldGlyph } from "../components/illustrations/DecisionShieldGlyph";

type PanelState =
  | { status: "reading" }
  | { status: "ready"; view: DecisionRecordView }
  | { status: "failed"; reason: string };

const VERDICT_STYLES: Record<DecisionRecordRow["verdict"], string> = {
  STAND: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  WATCH: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  RECONSIDER: "border-rose-400/40 bg-rose-400/10 text-rose-200",
};

const RecordRow = ({ row }: { row: DecisionRecordRow }) => (
  <li className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-slate-50">{row.title}</h3>
        <p className="mt-1 text-xs text-slate-400">
          {row.isPostureSnapshot ? "Call recorded" : "Decision recorded"} against the {row.recordedOn} reading
        </p>
      </div>
      <span className={`shrink-0 rounded-sm border px-3 py-1 text-xs font-semibold tracking-[0.12em] ${VERDICT_STYLES[row.verdict]}`}>
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
            <dt className="text-xs uppercase tracking-wide text-slate-500">{publicDecisionLabels.threshold}</dt>
            <dd className="mt-0.5 text-slate-300">{row.guardrail}</dd>
          </div>
        ) : null}
        {row.reversalTrigger ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">{publicDecisionLabels.reversal}</dt>
            <dd className="mt-0.5 text-slate-300">{row.reversalTrigger}</dd>
          </div>
        ) : null}
      </dl>
    ) : null}
  </li>
);

const EmptyState = () => (
  <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-sm leading-6 text-slate-300 flex flex-col sm:flex-row items-start gap-4">
    <DecisionShieldGlyph size={48} className="mt-1" />
    <div className="space-y-2">
      <p className="font-semibold text-slate-100">Nothing recorded from this browser yet.</p>
      <p>
        Run a call through the{" "}
        <Link href="/operate" className="text-sky-300 underline-offset-2 hover:underline">
          Decision Shield
        </Link>{" "}
        and record it. Each one is stored with the reading it was made against, so a later week can tell you
        whether the conditions it relied on still hold.
      </p>
    </div>
  </div>
);

export const DecisionRecordPanel = ({ current }: { current: CurrentConditions }) => {
  const clientId = usePersistentClientId();
  const hydrated = useHydrated();
  const [state, setState] = useState<PanelState>({ status: "reading" });

  const read = useCallback(
    async (id: string): Promise<PanelState> => {
      const result = await fetchDecisionLedger(id);
      if (!result.ok) return { status: "failed", reason: result.reason };
      return { status: "ready", view: buildDecisionRecordView(result.entries, current) };
    },
    [current],
  );

  /*
   * A network read, which is what an effect is actually for — unlike the eleven
   * conversions CLAUDE.md records, there is no browser value here to read
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

  if (state.view.rows.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-slate-200">{state.view.headline}</p>
      <ul className="space-y-3">
        {state.view.rows.map((row) => (
          <RecordRow key={row.id} row={row} />
        ))}
      </ul>
    </div>
  );
};
