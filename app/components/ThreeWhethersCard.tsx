import type { ActionStripItem } from "../../lib/report/operatingCalls";
import { ACTION_STRIP_DISPLAY_COPY } from "../../lib/report/reportCopy";
import { BoundedValue } from "./ui/boundedValue";

const STATE_TONE: Record<NonNullable<ActionStripItem["currentStateLabel"]>, string> = {
  Closed: "text-semantic-tightening-fg",
  Guarded: "text-semantic-caution-fg",
  Staged: "text-semantic-unchanged-fg",
  Open: "text-semantic-easing-fg",
};

export function ThreeWhethersCard({
  items,
  sharedFlipCorridor,
}: {
  items: ActionStripItem[];
  sharedFlipCorridor?: string | null;
}) {
  const decisions = items.slice(0, 3);
  if (decisions.length === 0) return null;

  return (
    <section className="weather-section" aria-labelledby="three-whethers-heading">
      <div className="mb-4">
        <h3 id="three-whethers-heading" className="type-section font-semibold tracking-tight text-white">
          {ACTION_STRIP_DISPLAY_COPY.heading}
        </h3>
      </div>

      {/* Every row's clear-condition is drawn from the same pair of lines, so the
          rows below repeat two numbers three times. Stating the corridor once here
          turns that repetition into the actual finding: these levers flip together,
          which is a fact about the week rather than about any one lever. */}
      {sharedFlipCorridor ? (
        <p className="mb-3 text-fluid-nano text-slate-300">
          <span className="font-semibold text-semantic-easing-fg">All three clear on the same lines:</span>{" "}
          <BoundedValue>{sharedFlipCorridor}</BoundedValue>
        </p>
      ) : null}

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
                  identical copies of "Funding pressure 0.0 pts to caution."
                  reads as boilerplate rather than as data. */}
              {item.currentStateLabel ? (
                <p className={`mt-1 text-fluid-nano font-semibold ${STATE_TONE[item.currentStateLabel]}`}>
                  {ACTION_STRIP_DISPLAY_COPY.state[item.currentStateLabel]}
                </p>
              ) : null}
            </div>

            <dd className="min-w-0 space-y-2">
              <div className="space-y-1 text-fluid-nano text-slate-300">
                <p className="flex flex-wrap items-baseline gap-x-2 text-fluid-xs leading-relaxed text-slate-200">
                  <span className="shrink-0 font-semibold text-slate-400">
                    {ACTION_STRIP_DISPLAY_COPY.action}:
                  </span>
                  <span>{item.areaActionNow}</span>
                </p>
                {/* Hue sits on the label, which is the part that names a
                    direction (tighten vs. loosen). The rule itself is ordinary
                    text with its numbers weighted — colouring the whole sentence
                    made green ambiguous between "this is good" and "this is a
                    value". */}
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="shrink-0 font-semibold text-semantic-caution-fg">
                    {ACTION_STRIP_DISPLAY_COPY.threshold}:
                  </span>
                  <BoundedValue>{item.triggerThreshold}</BoundedValue>
                </p>
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="shrink-0 font-semibold text-semantic-easing-fg">
                    {ACTION_STRIP_DISPLAY_COPY.reversal}:
                  </span>
                  <BoundedValue>{item.reversalCondition}</BoundedValue>
                </p>
              </div>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
