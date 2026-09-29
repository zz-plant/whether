import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import { ReportSection } from "../components/reportSection";
import { TemplateActions } from "./templateActions";

/**
 * One hue per slot, from the semantic tokens the hero draws its own dt labels
 * in: the action in the easing green, the threshold in caution amber, the
 * reversal in the reversal rose. The three parts and the blank form used to
 * disagree with each other — the threshold was amber in one and rose in the
 * other — and `/history/compare` reads the same map for its rules block.
 * These are plain utilities on purpose: `.type-eyebrow` is unlayered and its
 * own colour beats any `text-*` utility placed beside it.
 */
export const DECISION_SLOT_TONE = {
  action: "text-semantic-easing-fg",
  threshold: "text-semantic-caution-fg",
  reversal: "text-semantic-reversal-fg",
} as const;

const slotLabelClass = (slot: keyof typeof DECISION_SLOT_TONE) =>
  `text-fluid-xs font-semibold ${DECISION_SLOT_TONE[slot]}`;

/*
 * The bounded-decision framework and the blank form for it, as a section of
 * /trust.
 *
 * This was /threshold (and before that /threshold plus /template). It had no
 * inbound link from any primary surface, so the one page that explained how to
 * use the thresholds sat two menus away from the page that derives them. It
 * lives beside the formula now; /threshold and /template redirect to the two
 * anchors below.
 */
export function FrameworkSection() {
  return (
    <ReportSection
      id="framework"
      title="How to use the thresholds"
      description="Each decision here has three parts: an action, a threshold that pauses it, and a condition that reverses it. It works because it separates what you will do from the conditions under which you will stop."
    >
      <div className="space-y-8">
        {/* The section description above already says what a bounded decision
            is. This paragraph restated it almost word for word, so the first
            thing a reader met on this section was the same sentence twice. */}
        <section className="space-y-4">
          <h3 className="type-eyebrow">The three parts</h3>
          <div className="grid gap-4">
            <div className="weather-surface px-4 py-4 space-y-2">
              <p className={slotLabelClass("action")}>{DECISION_CONTRACT_LABELS.slot.action}</p>
              <p className="text-sm text-slate-200">What you will do now, given current conditions: the move the readings support this week.</p>
            </div>
            <div className="weather-surface px-4 py-4 space-y-2">
              <p className={slotLabelClass("threshold")}>{DECISION_CONTRACT_LABELS.slot.threshold}</p>
              <p className="text-sm text-slate-200">The measurable condition that would make you pause, written as a number: &ldquo;Pause if funding pressure exceeds 76.&rdquo;</p>
            </div>
            <div className="weather-surface px-4 py-4 space-y-2">
              <p className={slotLabelClass("reversal")}>{DECISION_CONTRACT_LABELS.slot.reversal}</p>
              <p className="text-sm text-slate-200">The condition that would clear the threshold and allow the action to resume. Without this, the threshold is a permanent stop, not a pause.</p>
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
          <p className="text-sm text-slate-300 leading-relaxed">
            This structure was developed across clinical workflows, physician financial guidance, and contested healthcare claims — environments where a decision with no stopping condition can mean patient harm, regulatory action, or fiduciary breach. It is applied here to macro uncertainty because the same logic applies: the cost of continuing past the stopping point is higher than the cost of pausing too early.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="type-eyebrow">In practice</h3>
          <div className="weather-surface px-4 py-4 space-y-2">
            <p className="text-sm text-slate-200 font-semibold">{DECISION_CONTRACT_LABELS.slot.action}: Hire only for roles that pay back inside six months.</p>
            <p className="text-sm text-slate-300">{DECISION_CONTRACT_LABELS.slot.threshold}: Pause all hiring if funding pressure crosses 76.</p>
            <p className="text-sm text-slate-300">{DECISION_CONTRACT_LABELS.slot.reversal}: Resume hiring when funding pressure falls below 64.</p>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            The threshold makes the decision concrete. The reversal makes it temporary. Together they make the decision safe to start.
          </p>
        </section>

        {/* The anchor /template redirects to, so an external link to the form
            still lands on the form rather than the top of the explainer. */}
        <section id="template" className="space-y-4 border-t border-slate-700/50 pt-6">
          <h3 className="type-eyebrow">Fill one in</h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            Fill these out before the decision is urgent — that is when the framework is most useful.
            Print this section or copy the structure into your planning document.
          </p>

          <div className="border border-dashed border-slate-600 rounded-xl p-6 space-y-6 print:border-black print:border-solid">
            <div className="space-y-2">
              <p className="type-eyebrow">The decision</p>
              <div className="border-b border-slate-600 pb-2">
                <p className="text-sm text-slate-400 italic">What are you considering doing?</p>
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
              <p className="text-xs text-slate-400">What specific, measurable condition would cause you to pause the action. Name the number, date, or event.</p>
              <div className="h-12 border-b border-slate-700/50" />
            </div>

            <div className="space-y-2">
              <p className={slotLabelClass("reversal")}>{DECISION_CONTRACT_LABELS.slot.reversal}</p>
              <p className="text-xs text-slate-400">What condition would clear the threshold and allow the action to resume? Without this, the threshold is a permanent stop.</p>
              <div className="h-12 border-b border-slate-700/50" />
            </div>

            <div className="space-y-2">
              <p className="type-eyebrow">When you will check</p>
              <p className="text-xs text-slate-400">How often will you check whether the threshold or reversal has been reached?</p>
              <div className="h-8 border-b border-slate-700/50" />
            </div>
          </div>

          <TemplateActions />

          <p className="text-fluid-micro text-slate-400 italic">
            No signup required. No data collected. This template is free to use, copy, and share.
          </p>
        </section>

      </div>
    </ReportSection>
  );
}
