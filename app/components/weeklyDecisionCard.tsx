import Link from "next/link";

type Regime = "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION";

type WeeklyDecisionCardProps = {
  regime: Regime;
  statusLabel: string;
  startItems: string[];
  stopItems: string[];
  recordDateLabel: string;
  fetchedAtLabel: string;
};

type EngineeringPosture = {
  posture: "Accelerate" | "Stabilize" | "Optimize";
  confidence: string;
  levers: Array<{ label: string; guidance: string }>;
  overApplyRisk: string;
  underApplyRisk: string;
  mitigationTrigger: string;
};

const engineeringPostureByRegime: Record<Regime, EngineeringPosture> = {
  EXPANSION: {
    posture: "Accelerate",
    confidence: "Medium-high",
    levers: [
      { label: "Delivery scope", guidance: "Increase scope selectively on validated growth bets." },
      { label: "Reliability strictness", guidance: "Hold baseline SLOs while expanding capacity where load is rising." },
      { label: "Hiring pace", guidance: "Backfill critical roles and add targeted product-engineering capacity." },
      { label: "Platform investment", guidance: "Fund enabling platform work that shortens cycle time next quarter." },
    ],
    overApplyRisk: "Over-scaling spend and scope before demand durability is confirmed.",
    underApplyRisk: "Missing growth windows and forcing reactive scaling later.",
    mitigationTrigger: "If two consecutive reads weaken, switch to Stabilize posture.",
  },
  VOLATILE: {
    posture: "Optimize",
    confidence: "Medium",
    levers: [
      { label: "Delivery scope", guidance: "Prioritize near-term revenue and retention work; gate speculative bets." },
      { label: "Reliability strictness", guidance: "Protect core paths; avoid costly reliability overreach on low-criticality areas." },
      { label: "Hiring pace", guidance: "Keep hiring selective and role-critical only." },
      { label: "Platform investment", guidance: "Favor efficiency and instrumentation over broad platform rewrites." },
    ],
    overApplyRisk: "Over-tightening can stall meaningful customer-facing progress.",
    underApplyRisk: "Too much optional work increases burn without measurable return.",
    mitigationTrigger: "If confidence rises for two updates, move to Accelerate; if it falls, move to Stabilize.",
  },
  DEFENSIVE: {
    posture: "Stabilize",
    confidence: "High",
    levers: [
      { label: "Delivery scope", guidance: "Focus on commitments tied to revenue durability and churn prevention." },
      { label: "Reliability strictness", guidance: "Raise guardrails for incidents, defects, and release risk." },
      { label: "Hiring pace", guidance: "Pause discretionary adds; prioritize backfills for critical ownership gaps." },
      { label: "Platform investment", guidance: "Shift to resilience, cost control, and operational simplification." },
    ],
    overApplyRisk: "Excessive caution can delay needed product improvements.",
    underApplyRisk: "Execution risk rises if reliability and spend controls lag conditions.",
    mitigationTrigger: "If risk signals recover for two updates, test an Optimize posture on non-critical lanes.",
  },
  SCARCITY: {
    posture: "Stabilize",
    confidence: "High",
    levers: [
      { label: "Delivery scope", guidance: "Constrain to must-win roadmap commitments only." },
      { label: "Reliability strictness", guidance: "Enforce strict error-budget policy and release controls." },
      { label: "Hiring pace", guidance: "Hold net-new hiring; preserve critical incident and platform coverage." },
      { label: "Platform investment", guidance: "Prioritize cost-down, reliability hardening, and run-cost visibility." },
    ],
    overApplyRisk: "Deep cuts can erode morale and long-term velocity foundations.",
    underApplyRisk: "Insufficient tightening can create forced cuts under worse conditions later.",
    mitigationTrigger: "If tightness and risk appetite recover sustainably, step up to Optimize posture.",
  },
};

export function WeeklyDecisionCard({
  regime,
  statusLabel,
  startItems,
  stopItems,
  recordDateLabel,
  fetchedAtLabel,
}: WeeklyDecisionCardProps) {
  const topActions = startItems.slice(0, 3);

  const ownerKeywords: Record<string, string[]> = {
    Engineering: ["hire", "engineering", "platform", "reliability"],
    Finance: ["budget", "cash", "spend"],
    GTM: ["sales", "pipeline", "gtm", "marketing"],
  };

  const inferActionOwner = (action: string): string => {
    const normalized = action.toLowerCase();
    for (const [owner, keywords] of Object.entries(ownerKeywords)) {
      if (keywords.some((keyword) => normalized.includes(keyword))) {
        return owner;
      }
    }
    return "Product";
  };
  const guardrail = stopItems[0] ?? "Avoid irreversible commitments until confidence improves.";
  const engineeringPosture = engineeringPostureByRegime[regime];

  return (
    <section id="weekly-decision-card" className="weather-panel space-y-6 p-5 sm:p-6" aria-label="This week's decision card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">This week&apos;s decision card</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-50">{statusLabel} posture</h2>
          <p className="text-sm text-slate-300">Updated with signals through {recordDateLabel} · Last refresh {fetchedAtLabel}</p>
          <p className="text-xs text-slate-400">Weekly execution decision · monthly rollup in Action playbook</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="#weekly-action-summary" className="weather-button-primary inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]">Run weekly operating sequence</Link>
          <Link href="/operations#ops-export-briefs" className="weather-button inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]">Generate leadership brief</Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-700/70 bg-slate-950/45 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-200">Top 3 actions</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-100">
            {topActions.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                <span className="flex-1">{item}</span>
                <span className="rounded-full border border-slate-600/70 bg-slate-900/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-300">
                  {inferActionOwner(item)}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-700/70 bg-slate-950/45 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-200">Guardrail (do not do)</h3>
          <p className="mt-3 text-sm text-slate-100">{guardrail}</p>
        </article>

        <article className="rounded-2xl border border-slate-700/70 bg-slate-950/45 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-200">Why this is credible</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            <li>Inputs: Treasury curve signals and regime thresholds.</li>
            <li>Rules: Deterministic score-based posture mapping.</li>
            <li>Cadence: Weekly decision cycle with frequent feed refresh.</li>
          </ul>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-700/70 bg-slate-950/45 p-4" aria-label="Engineering operating posture">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-violet-200">Engineering operating posture: {engineeringPosture.posture}</h3>
          <span className="rounded-full border border-violet-400/40 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-100">Confidence: {engineeringPosture.confidence}</span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {engineeringPosture.levers.map((lever) => (
            <div key={lever.label} className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">{lever.label}</p>
              <p className="mt-1 text-sm text-slate-100">{lever.guidance}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-2xl border border-slate-700/70 bg-slate-950/45 p-4" aria-label="Recommendation risk framing">
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-rose-200">Risk framing</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-200">
          <li><span className="font-semibold text-slate-100">Risk if over-applied:</span> {engineeringPosture.overApplyRisk}</li>
          <li><span className="font-semibold text-slate-100">Risk if under-applied:</span> {engineeringPosture.underApplyRisk}</li>
          <li><span className="font-semibold text-slate-100">Mitigation trigger:</span> {engineeringPosture.mitigationTrigger}</li>
        </ul>
      </article>
    </section>
  );
}
