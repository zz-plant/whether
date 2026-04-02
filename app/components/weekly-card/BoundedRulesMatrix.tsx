import type { BoundedDecisionRule } from "../../../lib/report/boundedDecisionRules";
import { decisionAreaLabel } from "../../../lib/report/boundedDecisionRules";
import type { DecisionMatrixPayload } from "../../../lib/report/homeBriefModel";
import { resolveDecisionLaneState } from "../../../lib/report/operatingCalls";
import { boundedDecisionPhraseFallbacks, formatDecisionTriplet } from "../../../lib/report/reportFormatting";
import { compactActionCue, sectionSpacing, tierOneHeading, tierOnePanel } from "./shared";

type BoundedRulesMatrixProps = {
  decisionMatrix?: DecisionMatrixPayload;
  startupVariantPolicy?: unknown;
  decisionRules?: BoundedDecisionRule[];
  currentScores?: {
    tightness: number;
    riskAppetite: number;
  };
};

const corridorTone = {
  now: {
    badge: "border-emerald-400/35 bg-emerald-500/10 text-emerald-100",
    panel: "border-emerald-400/20 bg-emerald-500/8",
  },
  caution: {
    badge: "border-amber-400/35 bg-amber-500/10 text-amber-100",
    panel: "border-amber-400/20 bg-amber-500/8",
  },
  blocked: {
    badge: "border-sky-400/35 bg-sky-500/10 text-sky-100",
    panel: "border-sky-400/20 bg-sky-500/8",
  },
} as const;

const CorridorScale = () => (
  <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
    {[
      { label: "Allowed", className: "bg-emerald-300" },
      { label: "Caution", className: "bg-amber-300" },
      { label: "Blocked", className: "bg-rose-300" },
    ].map((item) => (
      <span key={item.label} className="space-y-1">
        <span className={`block h-2 rounded-full ${item.className}`} />
        <span className="block text-center text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">{item.label}</span>
      </span>
    ))}
  </div>
);

const corridorSegmentOrder = [
  { key: "now", label: "Allowed", className: "bg-emerald-400/18 text-emerald-100" },
  { key: "caution", label: "Caution", className: "bg-amber-400/18 text-amber-100" },
  { key: "blocked", label: "Blocked", className: "bg-rose-400/18 text-rose-100" },
] as const;

export function BoundedRulesMatrix({ decisionMatrix, decisionRules = [], currentScores }: BoundedRulesMatrixProps) {
  const matrixAreaByKey: Record<"hiring" | "product" | "capital" | "burn", BoundedDecisionRule["area"]> = {
    hiring: "hiring",
    product: "product-tempo",
    capital: "capital-raising",
    burn: "burn-discipline",
  };
  const rowOrder: Array<"hiring" | "product" | "capital" | "burn"> = ["hiring", "product", "capital", "burn"];
  const rulesByArea = new Map(decisionRules.map((rule) => [rule.area, rule]));
  const fallbackDecisionTriplet = boundedDecisionPhraseFallbacks;
  const getTriplet = (rule?: BoundedDecisionRule) => (rule
    ? formatDecisionTriplet({
      action: rule.doNow[0] ?? rule.recommendation,
      threshold: rule.pauseTrigger,
      reversal: rule.resumeTrigger,
      fallbacks: fallbackDecisionTriplet,
    })
    : fallbackDecisionTriplet);

  const corridors = rowOrder.map((rowKey) => {
    const matrixRow = decisionMatrix?.rows.find((row) => row.key === rowKey);
    const rule = rulesByArea.get(matrixAreaByKey[rowKey]);
    const triplet = getTriplet(rule);
    const laneState = resolveDecisionLaneState({ rule, scores: currentScores });

    return {
      key: rowKey,
      label: matrixRow?.label ?? (rule ? decisionAreaLabel(rule.area) : rowKey.charAt(0).toUpperCase() + rowKey.slice(1)),
      context: rule?.scope ?? "Use this rule for the related decision this week.",
      laneState,
      now: {
        text: compactActionCue(matrixRow?.cells.approve.text ?? rule?.doNow[0] ?? fallbackDecisionTriplet.action),
        detail: matrixRow?.cells.approve.action ?? triplet.action,
      },
      caution: {
        text: compactActionCue(matrixRow?.cells.delay.text ?? rule?.avoidNow[0] ?? "Delay irreversible commitments"),
        detail: matrixRow?.cells.delay.threshold ?? triplet.threshold,
      },
      blocked: {
        text: compactActionCue(matrixRow?.cells.flip.text ?? rule?.resumeTrigger ?? "Flip after threshold recovery"),
        detail: matrixRow?.cells.flip.reversal ?? triplet.reversal,
      },
    };
  });

  if (!corridors.length) {
    return (
      <article className={`${tierOnePanel} ${sectionSpacing}`}>
        <h2 className={tierOneHeading}>Decision snapshot for leadership this week</h2>
        <p className="text-xs leading-5 text-slate-300">Decision matrix unavailable; keep current guardrails and recheck after next refresh.</p>
      </article>
    );
  }

  return (
    <article className={`${tierOnePanel} ${sectionSpacing}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className={tierOneHeading}>Decision rules</h2>
          <p className="text-xs leading-5 text-slate-300">For each area: what you can do now, what should pause at the caution line, and what would force a full stop or reset.</p>
        </div>
        <div className="w-full max-w-[18rem]">
          <CorridorScale />
        </div>
      </div>
      <div className="mt-3 grid gap-3">
        {corridors.map((corridor) => {
          const laneBadgeClass = corridor.laneState?.currentLane === "blocked"
            ? corridorTone.blocked.badge
            : corridor.laneState?.currentLane === "caution"
              ? corridorTone.caution.badge
              : corridorTone.now.badge;

          return (
            <article key={corridor.key} className="rounded-xl border border-slate-700/70 bg-slate-950/72 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-100">{corridor.label}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-300">{corridor.context}</p>
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${laneBadgeClass}`}>
                {corridor.laneState?.currentLane === "blocked"
                  ? "Blocked now"
                  : corridor.laneState?.currentLane === "caution"
                    ? "Caution now"
                    : "Open now"}
              </span>
            </div>
            {corridor.laneState ? (
              <div className="mt-3 rounded-lg border border-slate-700/70 bg-slate-950/55 px-2.5 py-2">
                <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  <span>Current status {corridor.laneState.currentStateLabel}</span>
                  <span>{corridor.laneState.tightenDistanceLabel}</span>
                </div>
                <div className="relative mt-2 overflow-hidden rounded-full border border-slate-800/70 bg-slate-900/90" aria-hidden="true">
                  <div className="grid h-7 grid-cols-3">
                    {corridorSegmentOrder.map((segment) => (
                      <span key={segment.key} className={`flex items-center justify-center border-r border-slate-900/70 text-[9px] font-semibold uppercase tracking-[0.08em] ${segment.className}`}>
                        {segment.label}
                      </span>
                    ))}
                  </div>
                  <span
                    className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-950/90 bg-sky-300 shadow-[0_0_0_2px_rgba(15,23,42,0.7)]"
                    style={{ left: `${corridor.laneState.corridorProgressPercent}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-[11px] leading-5 text-slate-300">
                  <p>{corridor.laneState.reopenDistanceLabel}</p>
                  <p className="text-slate-400">Marker shows where this area sits now.</p>
                </div>
              </div>
            ) : null}
            <div className="mt-3 grid gap-2 lg:grid-cols-3">
              <section className={`rounded-lg border px-2.5 py-2 ${corridorTone.now.panel}`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-200">Allowed now</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">{corridor.now.text}</p>
                <p className="mt-2 text-[11px] leading-5 text-slate-300">{corridor.now.detail}</p>
              </section>
              <section className={`rounded-lg border px-2.5 py-2 ${corridorTone.caution.panel}`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-200">Caution line</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">{corridor.caution.text}</p>
                <p className="mt-2 text-[11px] leading-5 text-slate-300">{corridor.caution.detail}</p>
              </section>
              <section className={`rounded-lg border px-2.5 py-2 ${corridorTone.blocked.panel}`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-200">Reopen / flip</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">{corridor.blocked.text}</p>
                <p className="mt-2 text-[11px] leading-5 text-slate-300">{corridor.blocked.detail}</p>
              </section>
            </div>
            </article>
          );
        })}
      </div>
    </article>
  );
}
