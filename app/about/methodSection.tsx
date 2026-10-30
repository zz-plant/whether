import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import { sharedDecisionLines } from "../../lib/report/boundedDecisionRules";
import { RISK_APPETITE_REGIME_THRESHOLD, TIGHTNESS_REGIME_THRESHOLD } from "../../lib/regimeEngine";
import { CorridorStrip } from "./corridorStrip";
import { TemplateActions } from "./templateActions";

/* The worked example quotes the published lines, so a reader who checks it
   against the brief finds the same numbers. It said "below 64", a line no rule
   uses; the restart line is 66. */
const EXAMPLE_LINES = sharedDecisionLines({
  tightnessRegime: TIGHTNESS_REGIME_THRESHOLD,
  riskAppetiteRegime: RISK_APPETITE_REGIME_THRESHOLD,
});

/**
 * One hue per slot, from the semantic tokens the hero draws its own dt labels
 * in: the action in the easing green, the pause line in caution amber, the
 * restart line in the reversal rose. `/history/compare` reads the same map for
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
 * The method: an action, a pause line and a restart line, written down before the
 * action begins. It was the last section of /trust ("How to use the thresholds"),
 * a page a reader opens to check whether this week's reading is current, where
 * the product's thesis read as an appendix. It sits on /about beside "How it
 * works", in the vocabulary every screen uses (pause and resume
 * lines, not threshold and reversal). /threshold redirects to #method and
 * /template to #template; /trust keeps a one-line link.
 *
 * "How it works", directly above, already names the three parts, so
 * this section opens on them filled in rather than defining them again.
 */
export function MethodSection() {
  return (
    <section id="method" aria-labelledby="method-heading" className="weather-panel space-y-4 px-6 max-sm:px-0 py-6">
      <h2 id="method-heading" className="text-[1.375rem] leading-tight font-semibold text-slate-100 sm:text-2xl">
        How to use the pause and restart lines
      </h2>

      <section className="space-y-3">
        <h3 className="type-eyebrow">In practice</h3>
        {/* Ruled at the left like a quoted answer, not boxed: in the same surface as
            the definitions it read as a fourth definition rather than the three filled in. */}
        <div className="space-y-2 border-l-2 border-slate-600 pl-4">
          <p className="text-sm text-slate-200 font-semibold">{DECISION_CONTRACT_LABELS.slot.action}: Hire only for roles that pay back inside six months.</p>
          <p className="text-sm text-slate-300">{DECISION_CONTRACT_LABELS.slot.threshold}: Pause all hiring if funding pressure crosses {EXAMPLE_LINES.tightnessPause}.</p>
          <p className="text-sm text-slate-300">{DECISION_CONTRACT_LABELS.slot.reversal}: Restart hiring when funding pressure falls below {EXAMPLE_LINES.tightnessResume}.</p>
        </div>
        {/* The example's three lines, drawn on the axis they share: the pause
            line past the change line, the restart line inside it, and the hold
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
            <div className="grid gap-4">
              <div className="weather-surface px-4 py-4 space-y-2">
                <p className={slotLabelClass("action")}>{DECISION_CONTRACT_LABELS.slot.action}</p>
                <p className="text-sm text-slate-200">The commitment you will make this week.</p>
              </div>
              <div className="weather-surface px-4 py-4 space-y-2">
                <p className={slotLabelClass("threshold")}>{DECISION_CONTRACT_LABELS.slot.threshold}</p>
                <p className="text-sm text-slate-200">The measurable condition for pausing that commitment.</p>
              </div>
              <div className="weather-surface px-4 py-4 space-y-2">
                <p className={slotLabelClass("reversal")}>{DECISION_CONTRACT_LABELS.slot.reversal}</p>
                <p className="text-sm text-slate-200">The condition that must be met before you restart.</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="type-eyebrow">Agree on the lines in advance</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Write down the pause and restart lines before committing cash. When a line is crossed, review the
              decision against the condition you agreed on.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              These lines give you a reason to review a decision. They cannot establish that it is right or safe;
              check your cash position and the costs of stopping or restarting.
            </p>
          </section>
        </div>
      </details>

      {/* The anchor /template redirects to, on the disclosure itself, so an external
          link to the form lands on it and opens it. Folded because a blank form open
          on the page read as an unfinished one; incidental state, so no query key (§XII). */}
      <details id="template" className="weather-auto-chevron group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-sky-200 hover:text-slate-100">
          Decision template to print or copy
        </summary>
        <div className="mt-4 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Complete this before committing cash.
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
              <p className="text-xs text-slate-400">What will you commit to this week?</p>
              <div className="h-12 border-b border-slate-700/50" />
            </div>

            <div className="space-y-2">
              <p className={slotLabelClass("threshold")}>{DECISION_CONTRACT_LABELS.slot.threshold}</p>
              <p className="text-xs text-slate-400">What number, date or event would make you pause?</p>
              <div className="h-12 border-b border-slate-700/50" />
            </div>

            <div className="space-y-2">
              <p className={slotLabelClass("reversal")}>{DECISION_CONTRACT_LABELS.slot.reversal}</p>
              <p className="text-xs text-slate-400">What must happen before you restart?</p>
              <div className="h-12 border-b border-slate-700/50" />
            </div>

            <div className="space-y-2">
              <p className="type-eyebrow">When you will check</p>
              <p className="text-xs text-slate-400">How often will you check the lines?</p>
              <div className="h-8 border-b border-slate-700/50" />
            </div>
          </div>

          <TemplateActions />

          <p className="text-fluid-micro text-slate-400">
            Free to copy and share. No signup or data collection.
          </p>
        </div>
      </details>
    </section>
  );
}
