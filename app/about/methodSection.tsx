import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import { sharedDecisionLines } from "../../lib/report/boundedDecisionRules";
import { RISK_APPETITE_REGIME_THRESHOLD, TIGHTNESS_REGIME_THRESHOLD } from "../../lib/regimeEngine";
import { CorridorStrip } from "./corridorStrip";
import { TemplateActions } from "./templateActions";

/* The worked example quotes the published lines, so a reader who checks it
   against the brief finds the same numbers. It said "below 64", a line no rule
   uses; the resume line is 66. */
const EXAMPLE_LINES = sharedDecisionLines({
  tightnessRegime: TIGHTNESS_REGIME_THRESHOLD,
  riskAppetiteRegime: RISK_APPETITE_REGIME_THRESHOLD,
});

/**
 * One hue per slot, from the semantic tokens the hero draws its own dt labels
 * in: the action in the easing green, the pause line in caution amber, the
 * resume line in the reversal rose. `/history/compare` reads the same map for
 * its rules block. Plain utilities on purpose: `.type-eyebrow` is unlayered and
 * its own colour beats any `text-*` utility placed beside it.
 */
export const DECISION_SLOT_TONE = {
  action: "text-semantic-easing-fg",
  threshold: "text-semantic-caution-fg",
  reversal: "text-semantic-reversal-fg",
} as const;

const slotLabelClass = (slot: keyof typeof DECISION_SLOT_TONE) =>
  `text-fluid-xs font-semibold ${DECISION_SLOT_TONE[slot]}`;

/*
 * The method: an action, a pause line and a resume line, written down before the
 * action begins. It was the last section of /trust ("How to use the thresholds"),
 * a page a reader opens to check whether this week's reading is current, where
 * the product's thesis read as an appendix. It sits on /about beside "What is new
 * here" since 2026-10-09, in the vocabulary every screen uses (pause and resume
 * lines, not threshold and reversal). /threshold redirects to #method and
 * /template to #template; /trust keeps a one-line link.
 *
 * "What is new here", directly above, already says what the three parts are, so
 * this section opens on them filled in rather than defining them again.
 */
export function MethodSection() {
  return (
    <section id="method" aria-labelledby="method-heading" className="weather-panel space-y-4 px-6 max-sm:px-0 py-6">
      <h2 id="method-heading" className="text-lg font-semibold text-slate-100">
        How to use the pause and resume lines
      </h2>

      <section className="space-y-3">
        <h3 className="type-eyebrow">In practice</h3>
        {/* Ruled at the left like a quoted answer, not boxed: in the same surface as
            the definitions it read as a fourth definition rather than the three filled in. */}
        <div className="space-y-2 border-l-2 border-slate-600 pl-4">
          <p className="text-sm text-slate-200 font-semibold">{DECISION_CONTRACT_LABELS.slot.action}: Hire only for roles that pay back inside six months.</p>
          <p className="text-sm text-slate-300">{DECISION_CONTRACT_LABELS.slot.threshold}: Pause all hiring if funding pressure crosses {EXAMPLE_LINES.tightnessPause}.</p>
          <p className="text-sm text-slate-300">{DECISION_CONTRACT_LABELS.slot.reversal}: Resume hiring when funding pressure falls below {EXAMPLE_LINES.tightnessResume}.</p>
        </div>
        {/* The example's three lines, drawn on the axis they share: the pause
            line past the change line, the resume line inside it, and the hold
            between them that makes a pause temporary (2026-10-21). */}
        <CorridorStrip
          changeLine={TIGHTNESS_REGIME_THRESHOLD}
          pauseLine={EXAMPLE_LINES.tightnessPause}
          resumeLine={EXAMPLE_LINES.tightnessResume}
        />
      </section>

      {/* Folded: the definitions and the essay explain a method (§XII: the
          explanation behind a claim folds; the claim does not). Native <details>,
          so the text stays server-rendered and find-in-page and a search engine
          still reach it. */}
      <details className="weather-auto-chevron group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-sky-200 hover:text-slate-100">
          How the three parts work
        </summary>
        <div className="mt-4 space-y-8">
          <section className="space-y-4">
            <h3 className="type-eyebrow">The three parts</h3>
            <div className="grid gap-4">
              <div className="weather-surface px-4 py-4 space-y-2">
                <p className={slotLabelClass("action")}>{DECISION_CONTRACT_LABELS.slot.action}</p>
                <p className="text-sm text-slate-200">What you will do now, given current conditions: the move the readings support this week.</p>
              </div>
              <div className="weather-surface px-4 py-4 space-y-2">
                <p className={slotLabelClass("threshold")}>{DECISION_CONTRACT_LABELS.slot.threshold}</p>
                <p className="text-sm text-slate-200">The measurable condition that would make you pause, written as a number: &ldquo;Pause if funding pressure exceeds {EXAMPLE_LINES.tightnessPause}.&rdquo;</p>
              </div>
              <div className="weather-surface px-4 py-4 space-y-2">
                <p className={slotLabelClass("reversal")}>{DECISION_CONTRACT_LABELS.slot.reversal}</p>
                <p className="text-sm text-slate-200">The condition that lifts the pause and lets the action resume. Without it, the pause line is a permanent stop, not a pause.</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="type-eyebrow">Why it works</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Most strategic decisions fail not because the action was wrong, but because there was no condition for stopping. The action continues past the point where it should have paused, and by the time the error is visible, the cost has already been incurred.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              Writing the stopping condition down before the action begins is the whole method. This does not guarantee the action is right. It guarantees the action will not continue past the point where it becomes wrong without a visible signal.
            </p>
            {/* Where the structure comes from is "Who writes it", further down this
                page, with the link to that work. This paragraph opened by saying it
                too, behind a link to the page it sits on (2026-10-09); it keeps the
                stakes, which are the argument. */}
            <p className="text-sm text-slate-300 leading-relaxed">
              In clinical workflows, physician financial guidance and contested medical claims, a decision with no stopping condition can mean patient harm, regulatory action or fiduciary breach. The same logic carries over to macro uncertainty: the cost of continuing past the stopping point is higher than the cost of pausing too early.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              The pause line makes the decision concrete. The resume line makes the pause temporary. Together they make the decision safe to start.
            </p>
          </section>
        </div>
      </details>

      {/* The anchor /template redirects to, on the disclosure itself, so an external
          link to the form lands on it and opens it. Folded because a blank form open
          on the page read as an unfinished one; incidental state, so no query key (§XII). */}
      <details id="template" className="weather-auto-chevron group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-sky-200 hover:text-slate-100">
          Fill one in: a blank form to print or copy
        </summary>
        <div className="mt-4 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Fill these out before the decision is urgent. That is when the method is most useful.
          </p>

          <div className="border border-dashed border-slate-600 rounded-xl p-6 space-y-6 print:border-black print:border-solid">
            <div className="space-y-2">
              <p className="type-eyebrow">The decision</p>
              <div className="border-b border-slate-600 pb-2">
                <p className="text-sm text-slate-400">What are you considering doing?</p>
              </div>
              <div className="h-16 border-b border-slate-700/50" />
            </div>

            <div className="space-y-2">
              <p className={slotLabelClass("action")}>{DECISION_CONTRACT_LABELS.slot.action}</p>
              <p className="text-xs text-slate-400">What will you do now, given current conditions? Be specific — not a direction, a commitment.</p>
              <div className="h-12 border-b border-slate-700/50" />
            </div>

            <div className="space-y-2">
              <p className={slotLabelClass("threshold")}>{DECISION_CONTRACT_LABELS.slot.threshold}</p>
              <p className="text-xs text-slate-400">What specific, measurable condition would cause you to pause the action? Name the number, date, or event.</p>
              <div className="h-12 border-b border-slate-700/50" />
            </div>

            <div className="space-y-2">
              <p className={slotLabelClass("reversal")}>{DECISION_CONTRACT_LABELS.slot.reversal}</p>
              <p className="text-xs text-slate-400">What condition would lift the pause and let the action resume? Without one, the pause line is a permanent stop.</p>
              <div className="h-12 border-b border-slate-700/50" />
            </div>

            <div className="space-y-2">
              <p className="type-eyebrow">When you will check</p>
              <p className="text-xs text-slate-400">How often will you check whether the pause line or the resume line has been reached?</p>
              <div className="h-8 border-b border-slate-700/50" />
            </div>
          </div>

          <TemplateActions />

          <p className="text-fluid-micro text-slate-400">
            No signup required. No data collected. This template is free to use, copy, and share.
          </p>
        </div>
      </details>
    </section>
  );
}
