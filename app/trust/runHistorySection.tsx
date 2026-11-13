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

type StepDays = NonNullable<Extract<CronRunHistory, { status: "ok" }>["steps"][number]["days"]>;

/*
 * A job's month as one mark per UTC day, oldest on the left (2026-11-10). It took the place
 * of the "Last success" column: a timestamp said when the job last worked, and the strip
 * says that and whether it has worked every day since, which is the question a reader
 * checking the brief brings. A short muted mark for a day that ran clean, a full-height mark
 * in the caveat ink for a day with a failure (height and weight, not the crossed red, which
 * means a line), a hairline for a day nothing ran: a weekly job draws four marks, and that
 * is its schedule, not a gap. The counts stay in the label for a screen reader.
 */
function DayStrip({ days }: { days: StepDays }) {
  const ran = days.filter((day) => day.runs > 0).length;
  const failed = days.filter((day) => day.failures > 0).length;
  const label = `Ran on ${ran} of the last ${days.length} days${failed > 0 ? `, with a failure on ${failed}` : ", without a failure"}.`;
  /* One 3-unit column per day with a 1-unit gap, drawn at that size in CSS pixels so a
     mark stays a mark at every width. */
  const width = days.length * 4 - 1;
  return (
    <svg
      viewBox={`0 0 ${width} 14`}
      width={width}
      height={14}
      aria-label={label}
      className="block shrink-0"
      data-run-strip
    >
      {days.map((day, index) => {
        const state = day.failures > 0 ? "failed" : day.runs > 0 ? "ok" : "none";
        return (
          <rect
            // The index is the day: the array is a fixed window, never reordered.
            key={index}
            data-run-day={state}
            x={index * 4}
            y={state === "none" ? 13 : state === "ok" ? 5 : 0}
            width={3}
            height={state === "none" ? 1 : state === "ok" ? 9 : 14}
            className={
              state === "failed"
                ? "fill-[color:var(--color-caveat-fg)]"
                : state === "ok"
                  ? "fill-[color:var(--app-text-muted)]"
                  : "fill-[color:var(--border-default)]"
            }
          />
        );
      })}
    </svg>
  );
}

export function RunHistorySection({ runHistory }: { runHistory: CronRunHistory }) {
  // Not configured is an internal state, not a claim about the pipeline; render nothing
  // rather than a panel that looks like an outage.
  if (runHistory.status === "unconfigured") return null;

  const windowDays = runHistory.status === "ok" ? runHistory.windowDays : 30;
  const drawsDays = runHistory.status === "ok" && runHistory.steps.every((step) => step.days);

  return (
    <ReportSection
      id="run-history"
      title={`Scheduled runs, last ${windowDays} days`}
      /* The section states the count, and the count is the claim: a brief that
         shows only its successes is asking to be trusted rather than checked.
         The description said what the log was ("read from the log each run
         writes") and never why a reader is being shown it. */
      description="Every job that keeps this brief current, and every run that failed. Published because a brief that shows only its successes is asking to be trusted rather than checked."
    >
      {runHistory.status === "unavailable" ? (
        <p className="text-sm text-slate-300">
          The run log could not be loaded right now. The fault is in reading the log, not in the
          brief: the source dates on this page are unaffected.
        </p>
      ) : runHistory.steps.length === 0 ? (
        <p className="text-sm text-slate-300">
          Nothing ran in this window. Every job records itself, so an empty log means none ran.
          Treat the source dates on this page as the last word on how current the brief is.
        </p>
      ) : (
        <>
          <p className="text-sm text-slate-300 tabular-nums">
            {countFormat.format(runHistory.totalRuns)} runs · {countFormat.format(runHistory.totalFailures)} failed
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--border-subtle)]">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="type-eyebrow text-fluid-nano text-slate-400">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium">Step</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Runs</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Failed</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">{drawsDays ? `Last ${windowDays} days` : "Last success"}</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">Last failure</th>
                </tr>
              </thead>
              <tbody>
                {runHistory.steps.map((step) => (
                  <tr key={step.step} className="border-t border-[color:var(--border-subtle)]">
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
                    <td className="px-3 py-2 align-middle">
                      {drawsDays && step.days ? (
                        <DayStrip days={step.days} />
                      ) : (
                        <span className="font-mono text-slate-300">{formatStamp(step.lastOkAt)}</span>
                      )}
                    </td>
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
