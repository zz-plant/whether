import Link from "next/link";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";

type DecisionContractBlockProps = {
  /** The week's word: Freezing, Sunny, Stormy, Cloudy. */
  conditions: string;
  action: string;
  pauseIf: string;
  /** Where the call itself changes — the regime lines, not an area's resume line. */
  callChangesIf: string;
  evidence: string;
};

/**
 * This week's bounded guidance on a signal page.
 *
 * The call-change line used to print under "Resume when", the label for an
 * area's resume line: "Resume when: Funding pressure falls 20 pts to 70" on a
 * week whose resume line was 66, so a reader waiting to resume read the wrong
 * threshold. Each slot is named for what it carries now, and the labels come
 * from the one decision vocabulary.
 */
export function DecisionContractBlock({ conditions, action, pauseIf, callChangesIf, evidence }: DecisionContractBlockProps) {
  return (
    <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6" aria-label="This week's bounded guidance">
      <h2 className="text-lg font-semibold text-slate-100">This week&apos;s bounded guidance</h2>
      <ul className="space-y-2 text-sm text-slate-200">
        <li>• <span className="font-semibold text-slate-100">Conditions:</span> {conditions}</li>
        <li>• <span className="font-semibold text-slate-100">{DECISION_CONTRACT_LABELS.action.doNow}:</span> {action}</li>
        <li>• <span className="font-semibold text-slate-100">{DECISION_CONTRACT_LABELS.threshold.pauseIf}:</span> {pauseIf}</li>
        <li>• <span className="font-semibold text-slate-100">{DECISION_CONTRACT_LABELS.watch.postureFlips}:</span> {callChangesIf}</li>
        <li>• <span className="font-semibold text-slate-100">Evidence:</span> {evidence}</li>
      </ul>
      <Link href="/" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
        Open this week&apos;s brief
      </Link>
    </section>
  );
}
