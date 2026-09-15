import { ReportSection } from "../components/reportSection";
import type { CronRunHistory } from "../../lib/telemetry/runHistory";

/**
 * What the Worker's scheduled jobs actually did, read back from the telemetry they write.
 *
 * The rest of /trust says how fresh the data is; this says whether the pipeline that
 * keeps it fresh has been running. Both are trust claims, and this is the one that used to
 * have no evidence on the page. Server-rendered, so timestamps are formatted once, in UTC,
 * and never re-derived on the client.
 */

const stampFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const formatStamp = (iso: string | null) => (iso ? `${stampFormat.format(new Date(iso))} UTC` : "—");

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
      description="Read back from the Worker's own telemetry, one row per scheduled step."
    >
      {runHistory.status === "unavailable" ? (
        <p className="text-sm text-slate-300">Run history could not be read right now ({runHistory.reason}).</p>
      ) : runHistory.steps.length === 0 ? (
        <p className="text-sm text-slate-300">
          No scheduled runs recorded in this window. The daily and Monday crons write one row per step, so an empty window means the cron has not fired.
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
                    <td className="px-3 py-2 text-slate-400">
                      {step.lastError ? (
                        <span className="line-clamp-2" title={step.lastError}>{step.lastError}</span>
                      ) : (
                        "—"
                      )}
                    </td>
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
