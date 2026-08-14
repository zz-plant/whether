import type { ActionStripItem } from "../../lib/report/operatingCalls";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";

const STATE_TONE: Record<NonNullable<ActionStripItem["currentStateLabel"]>, string> = {
  Closed: "text-semantic-tightening-fg",
  Guarded: "text-semantic-caution-fg",
  Staged: "text-semantic-unchanged-fg",
  Open: "text-semantic-easing-fg",
};

export function ThreeWhethersCard({ items }: { items: ActionStripItem[] }) {
  const decisions = items.slice(0, 3);
  if (decisions.length === 0) return null;

  return (
    <section className="weather-section" aria-labelledby="three-whethers-heading">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 id="three-whethers-heading" className="type-section font-semibold tracking-tight text-white">
          This week&apos;s bounded decisions
        </h3>
        <span className="text-fluid-nano font-mono uppercase tracking-wider text-slate-400">Canonical rules</span>
      </div>

      {/* A ledger, not a card grid: these are standing rules with a current state,
          so they read down a shared column of conditions rather than as three
          equal floating panels. Rows carry the state and distance the model
          already computes — the previous layout dropped both for an icon. */}
      <dl className="border-t border-slate-800/60">
        {decisions.map((item) => (
          <div
            key={item.lever}
            className="grid gap-x-6 gap-y-2 border-b border-slate-800/60 py-4 sm:grid-cols-[minmax(11rem,15rem)_minmax(0,1fr)]"
          >
            <div className="min-w-0">
              <dt className="text-sm font-semibold tracking-tight text-white">{item.label}</dt>
              {/* State only. tightenDistanceLabel is derived from the shared lane
                  state, so it renders the same sentence on every lever — three
                  identical copies of "Cash availability 0.0 pts to caution."
                  reads as boilerplate rather than as data. */}
              {item.currentStateLabel ? (
                <p className={`mt-1 text-fluid-nano font-semibold ${STATE_TONE[item.currentStateLabel]}`}>
                  {item.currentStateLabel}
                </p>
              ) : null}
            </div>

            <dd className="min-w-0 space-y-2">
              <p className="text-fluid-xs leading-relaxed text-slate-200">{item.areaActionNow}</p>
              <div className="space-y-1 text-fluid-nano text-slate-300">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="shrink-0 font-semibold text-slate-400">
                    {DECISION_CONTRACT_LABELS.threshold.pauseIf}:
                  </span>
                  <span className="font-mono text-semantic-caution-fg">{item.triggerThreshold}</span>
                </p>
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="shrink-0 font-semibold text-slate-400">
                    {DECISION_CONTRACT_LABELS.reversal.clearsWhen}:
                  </span>
                  <span className="font-mono text-semantic-easing-fg">{item.reversalCondition}</span>
                </p>
              </div>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
