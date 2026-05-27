"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLocalStorageState } from "../../../lib/hooks/useLocalStorageState";

const FIRST_VISIT_KEY = "whether_first_visit_dismissed";
const VISIT_COUNT_KEY = "whether_visit_count";

export function FirstVisitBanner() {
  const [dismissed, setDismissed] = useLocalStorageState<boolean>(FIRST_VISIT_KEY, false);
  const [visitCount, setVisitCount] = useLocalStorageState<number>(VISIT_COUNT_KEY, 0);
  const [setupDone] = useLocalStorageState<boolean>("whether_setup_done", false);

  useEffect(() => {
    if (visitCount === 0) setVisitCount(1);
    else if (visitCount === 1) setVisitCount(2);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = !dismissed && visitCount <= 2 && !setupDone;

  if (!visible) return null;

  const dismiss = () => setDismissed(true);

  return (
    <div className={`mx-auto mb-4 max-w-3xl rounded-lg border px-4 py-3 text-sm sm:px-5 ${
      visitCount <= 1
        ? "border-sky-500/30 bg-sky-950/30 text-sky-100"
        : "border-slate-700/60 bg-slate-950/40 text-slate-200"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          {visitCount <= 1 ? (
            <>
              <p className="font-semibold text-sky-100">
                This is your weekly operating brief.
              </p>
              <p className="text-sm leading-relaxed text-sky-200/80">
                U.S. macro signals → one weekly decision:{" "}
                <strong className="text-sky-100">what to do, what to watch, when to flip.</strong>
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-slate-100">
                Welcome back — the brief has updated.
              </p>
              <p className="text-sm leading-relaxed text-slate-300">
                The <strong>decision card</strong> above is this week&apos;s call. Head to <strong>Evidence</strong> to see what changed.
              </p>
            </>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href="/trust"
              className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 px-3 py-1 text-fluid-xs font-semibold text-sky-200 no-underline hover:bg-sky-500/10"
            >
              How it works
            </Link>
            <Link
              href="/evidence"
              className="inline-flex items-center gap-1 rounded-full border border-slate-700/70 px-3 py-1 text-fluid-xs font-semibold text-slate-300 no-underline hover:bg-slate-800/50"
            >
              See the evidence
            </Link>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="flex-shrink-0 rounded-full px-3 py-1 text-fluid-xs font-semibold uppercase tracking-[0.08em] text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-200"
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
