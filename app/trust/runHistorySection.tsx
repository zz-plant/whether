import { ReportSection } from "../components/reportSection";
import type { CronRunHistory } from "../../lib/telemetry/runHistory";

/**
 * Whether the jobs that keep this brief current have been running.
 *
 * The rest of /trust says how fresh the data is; this says whether the thing that keeps it
 * fresh has been working. Both are trust claims, and this is the one that used to have no
 * evidence on the page. Server-rendered, so timestamps are formatted once, in UTC, and never
 * re-derived on the client.
 *
 * The copy here was written for whoever maintains the pipeline, on the page the IA points a
 * reader to "when you want to sanity-check the brief before a big decision". It named the
 * Worker and its crons, printed the read failure's internal reason, and put a raw error
 * message under a column header promising a time. None of that is something the reader can
 * act on; "the weekly email last succeeded on Sep 15" is.
 */

// Date and time are formatted separately and joined here, because the joiner is the one part
// of this stamp ICU owns: older builds render "Sep 14, 14:00" and ICU 72+ (bun 1.3.x) renders
// "Sep 14 at 14:00". A stamp that changes with the runtime's ICU is not "formatted once".
const stampDateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

const stampTimeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const formatStamp = (iso: string | null) => {
  if (!iso) return "—";
  const at = new Date(iso);
  return `${stampDateFormat.format(at)}, ${stampTimeFormat.format(at)} UTC`;
};

const countFormat = new Intl.NumberFormat("en-US");

export function RunHistorySection({ runHistory }: { runHistory: CronRunHistory }) {
  // Not configured is an internal state, not a claim about the pipeline; render nothing
  // rather than a panel that looks like an outage.
  if (runHistory.status === "unconfigured") return null;

  const windowDays = runHistory.status === "ok" ? runHistory.windowDays : 30;

  return (
    <ReportSection
      id="run-history"
      title={`Scheduled runs, last ${windowDays} days`}
      description="One row per job that keeps this brief current, from the record each run leaves behind."
    >
      {runHistory.status === "unavailable" ? (
        <p className="text-sm text-slate-300">
          This panel could not be loaded right now. That is a fault in reading the record, not in
          the brief above it — the freshness and source dates on this page are unaffected.
        </p>
      ) : runHistory.steps.length === 0 ? (
        <p className="text-sm text-slate-300">
          Nothing ran in this window. Every job records itself, so an empty table means they did
          not run — treat the dates on this page as the last word on how current the brief is.
        </p>
      ) : (
        <>
          <p className="text-sm text-slate-300 tabular-nums">
            {countFormat.format(runHistory.totalRuns)} runs · {countFormat.format(runHistory.totalFailures)} failed
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.10]">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="type-eyebrow text-fluid-nano text-slate-400">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium">Step</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Runs</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Failed</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">Last success</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">Last failure</th>
                </tr>
              </thead>
              <tbody>
                {runHistory.steps.map((step) => (
                  <tr key={step.step} className="border-t border-white/[0.08]">
                    <th scope="row" className="px-3 py-2 text-left font-medium text-slate-100">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`flex h-2 w-2 shrink-0 rounded-full ${step.failures === 0 ? "bg-emerald-400" : "bg-amber-400"}`}
                          aria-hidden="true"
                        />
                        {step.label}
                      </span>
                    </th>
                    <td className="px-3 py-2 text-right font-mono text-slate-200">{countFormat.format(step.runs)}</td>
                    <td className={`px-3 py-2 text-right font-mono ${step.failures === 0 ? "text-slate-400" : "text-amber-200"}`}>
                      {countFormat.format(step.failures)}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-300">{formatStamp(step.lastOkAt)}</td>
                    <td className="px-3 py-2 font-mono text-slate-400">{formatStamp(step.lastFailedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ReportSection>
  );
}
