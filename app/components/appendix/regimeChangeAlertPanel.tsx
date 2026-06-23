import Link from "next/link";
import { formatDateUTC } from "../../../lib/formatters";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import { DataProvenanceStrip, type DataProvenance } from "../dataProvenanceStrip";

type RegimeAlert = {
  changed: boolean;
  currentRegime: RegimeAssessment["regime"];
  previousRegime: RegimeAssessment["regime"];
  currentRecordDate: string;
  previousRecordDate: string;
  reasons: string[];
  summary: string;
};

export const RegimeChangeAlertPanel = ({
  alert,
  provenance,
}: {
  alert: RegimeAlert | null;
  provenance: DataProvenance;
}) => {
  const statusLabel = alert ? (alert.changed ? "Changed" : "Threshold crossed") : "Quiet";
  const statusTone = alert
    ? alert.changed
      ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
      : "border-amber-500/40 bg-amber-500/10 text-amber-100"
    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100";

  return (
    <section id="regime-alerts" aria-labelledby="regime-alerts-title" className="mt-10">
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Capital posture change alerts</p>
            <h3 id="regime-alerts-title" className="type-section text-slate-100">
              Alert preview and response plan
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Monitor climate shifts with a clear before/after snapshot, reason codes, and the next
              action to take.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <span
              className={`weather-pill inline-flex min-h-[44px] items-center px-3 py-1 text-xs font-semibold tracking-[0.12em] ${statusTone}`}
            >
              {statusLabel}
            </span>
            <DataProvenanceStrip provenance={provenance} />
          </div>
        </div>
        {alert ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
            <div className="space-y-4">
              <div className="weather-surface p-4">
                <p className="type-label text-slate-400">Latest alert</p>
                <p className="mt-3 text-sm text-slate-100">{alert.summary}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-slate-800/80 bg-slate-950/50 p-3">
                    <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                      Previous record
                    </p>
                    <p className="mt-2 text-xs text-slate-200">
                      <time dateTime={alert.previousRecordDate}>
                        {formatDateUTC(alert.previousRecordDate)}
                      </time>
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      Regime: <span className="text-slate-200">{alert.previousRegime}</span>
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-800/80 bg-slate-950/50 p-3">
                    <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                      Current record
                    </p>
                    <p className="mt-2 text-xs text-slate-200">
                      <time dateTime={alert.currentRecordDate}>
                        {formatDateUTC(alert.currentRecordDate)}
                      </time>
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      Regime: <span className="text-slate-200">{alert.currentRegime}</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="weather-surface p-4">
                <p className="type-label text-slate-400">Reason codes</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {alert.reasons.map((reason) => (
                    <li key={reason} className="flex gap-2">
                      <span className="text-slate-400">•</span>
                      <span className="break-words">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="space-y-4">
              <div className="weather-surface p-4">
                <p className="type-label text-slate-400">Next actions</p>
                <p className="mt-3 text-sm text-slate-300">
                  Use the Time Machine to replay the prior month and share the shift in your
                  planning review.
                </p>
                <ul className="mt-4 space-y-2 text-xs text-slate-400">
                  <li className="flex gap-2">
                    <span className="text-slate-400">•</span>
                    <span>Re-confirm approvals tied to long payback bets.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-slate-400">•</span>
                    <span>Update leadership briefs before the next planning sync.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-slate-400">•</span>
                    <span>Document the change in the operations log.</span>
                  </li>
                </ul>
                <Link
                  href="/evidence?advanced=1#time-machine"
                  className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-md border border-sky-500/40 bg-slate-950/70 px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100"
                >
                  Open Time Machine
                </Link>
              </div>
              <div className="weather-surface p-4">
                <p className="type-label text-slate-400">Alert discipline</p>
                <p className="mt-2 text-sm text-slate-200">
                  Alerts fire only on regime shifts or threshold crossings to avoid noise.
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Use this section to confirm the new posture before you move backlog approvals.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="weather-surface p-4">
              <p className="type-label text-slate-400">No alert</p>
              <p className="mt-3 text-sm text-slate-300">
                There is no active change alert. Alerts only fire when the regime changes or
                tightness / risk appetite cross a threshold.
              </p>
              <p className="mt-3 text-xs text-slate-400">
                Stay focused on weekly execution until the next signal shift is confirmed.
              </p>
            </div>
            <div className="weather-surface p-4">
              <p className="type-label text-slate-400">What would trigger an alert?</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li className="flex gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Regime flips between Scarcity, Safety, Stability, and Growth.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Tightness or risk appetite crosses the configured threshold.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Material data quality flags force a posture review.</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
