import Link from "next/link";
import { publicDecisionLabels } from "../../lib/report/reportFormatting";

type DecisionContractBlockProps = {
  call: string;
  action: string;
  threshold: string;
  reversal: string;
  evidence: string;
  handoffLabel?: string;
  handoffHref?: string;
};

export function DecisionContractBlock({
  call,
  action,
  threshold,
  reversal,
  evidence,
  handoffLabel = "Open weekly brief",
  handoffHref = "/",
}: DecisionContractBlockProps) {
  return (
    <section className="weather-panel space-y-3 px-6 py-6" aria-label="This week's bounded call">
      <h2 className="text-lg font-semibold text-slate-100">This week&apos;s bounded call</h2>
      <ul className="space-y-2 text-sm text-slate-200">
        <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.call}:</span> {call}</li>
        <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.action}:</span> {action}</li>
        <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.threshold}:</span> {threshold}</li>
        <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.reversal}:</span> {reversal}</li>
        <li>• <span className="font-semibold text-slate-100">{publicDecisionLabels.evidence}:</span> {evidence}</li>
      </ul>
      <Link href={handoffHref} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
        Weekly-brief handoff: {handoffLabel}
      </Link>
    </section>
  );
}
