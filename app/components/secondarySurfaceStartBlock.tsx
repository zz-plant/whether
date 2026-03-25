import Link from "next/link";
import { secondarySurfaceContractByKey, type SecondarySurfaceContract } from "../../lib/navigation/secondarySurfaceContract";

type SecondarySurfaceStartBlockProps = {
  surface: SecondarySurfaceContract["surfaceKey"];
};

export function SecondarySurfaceStartBlock({ surface }: SecondarySurfaceStartBlockProps) {
  const contract = secondarySurfaceContractByKey[surface];

  return (
    <section className="weather-panel space-y-3 px-6 py-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Secondary surface · {contract.intentLabel}</p>
      <h2 className="text-lg font-semibold text-slate-100">Start from Weekly Brief, then use this helper surface.</h2>
      <p className="text-sm text-slate-300">{contract.helperSummary}</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/" className="weather-button-primary inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
          Start from Weekly Brief
        </Link>
        <Link href={contract.parentHubHref} className="weather-pill inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-100">
          {contract.returnCtaLabel} ({contract.parentHubLabel})
        </Link>
      </div>
    </section>
  );
}
