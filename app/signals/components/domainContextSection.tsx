"use client";

const DOMAIN_INSIGHTS: Record<string, Record<string, string>> = {
  SCARCITY: {
    product: "Ship only critical-path features. Delay exploration and refactors.",
    engineering: "No new infrastructure. Post non-critical upgrades. Reduce compute spend.",
    finance: "Freeze discretionary spend. Extend runway. No new vendor commitments.",
  },
  DEFENSIVE: {
    product: "Gate new features to short-payback bets only. Avoid multi-quarter builds.",
    engineering: "Approve reversible infra changes. Gate large migrations.",
    finance: "Gate net-new commitments. Prioritize margin over growth.",
  },
  VOLATILE: {
    product: "Favor reversible product bets. Set clear checkpoint exits for each experiment.",
    engineering: "Keep deployments reversible. Avoid long-running branches.",
    finance: "Stage approvals with checkpoints. Keep reserves accessible.",
  },
  EXPANSION: {
    product: "Scale proven bets. Invest in growth features with milestone gates.",
    engineering: "Invest in platform improvements. Scale infrastructure with growth.",
    finance: "Scale proven bets. Maintain milestone-based approval discipline.",
  },
};

export function DomainContextSection({ regime }: { regime?: string }) {
  if (!regime || !DOMAIN_INSIGHTS[regime]) return null;

  return (
    <section id="team-context" className="weather-panel scroll-mt-28 space-y-4 px-5 py-5" aria-labelledby="domain-context-title">
      <p id="domain-context-title" className="type-eyebrow">
        What this means for your team
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="weather-surface px-3.5 py-3 space-y-1.5">
          <p className="type-eyebrow text-sky-200">Product</p>
          <p className="text-xs leading-relaxed text-slate-200">{DOMAIN_INSIGHTS[regime].product}</p>
        </div>
        <div className="weather-surface px-3.5 py-3 space-y-1.5">
          <p className="type-eyebrow text-emerald-200">Engineering</p>
          <p className="text-xs leading-relaxed text-slate-200">{DOMAIN_INSIGHTS[regime].engineering}</p>
        </div>
        <div className="weather-surface px-3.5 py-3 space-y-1.5">
          <p className="type-eyebrow text-amber-200">Finance</p>
          <p className="text-xs leading-relaxed text-slate-200">{DOMAIN_INSIGHTS[regime].finance}</p>
        </div>
      </div>
    </section>
  );
}
