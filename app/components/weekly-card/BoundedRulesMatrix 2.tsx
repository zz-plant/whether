import { Fragment } from "react";
import type { BoundedDecisionRule } from "../../../lib/report/boundedDecisionRules";
import { decisionAreaLabel } from "../../../lib/report/boundedDecisionRules";
import type { DecisionMatrixPayload } from "../../../lib/report/homeBriefModel";
import { boundedDecisionPhraseFallbacks, formatDecisionTriplet } from "../../../lib/report/reportFormatting";
import { compactActionCue, sectionSpacing, tierOneHeading, tierOnePanel } from "./shared";

type BoundedRulesMatrixProps = {
  decisionMatrix?: DecisionMatrixPayload;
  startupVariantPolicy?: unknown;
  decisionRules?: BoundedDecisionRule[];
};

const decisionLaneTone: Record<"approve" | "delay" | "flip", {
  label: string;
  badgeClassName: string;
}> = {
  approve: {
    label: "↑ Now",
    badgeClassName: "border-emerald-400/35 bg-emerald-500/10 text-emerald-100",
  },
  delay: {
    label: "∥ Hold",
    badgeClassName: "border-rose-400/35 bg-rose-500/10 text-rose-100",
  },
  flip: {
    label: "↺ Flip",
    badgeClassName: "border-sky-400/35 bg-sky-500/10 text-sky-100",
  },
};

const matrixLineTone: Record<"action" | "threshold" | "reverse", string> = {
  action: "text-emerald-100",
  threshold: "text-amber-100",
  reverse: "text-sky-100",
};

const MatrixRuleSummary = ({
  action,
  threshold,
  reversal,
}: {
  action: string;
  threshold: string;
  reversal: string;
}) => (
  <div className="space-y-1.5 text-[11px] leading-5">
    {[
      { label: "Act", value: action, tone: matrixLineTone.action },
      { label: "Trip", value: threshold, tone: matrixLineTone.threshold },
      { label: "Flip", value: reversal, tone: matrixLineTone.reverse },
    ].map((item) => (
      <p key={item.label} className="text-slate-200">
        <span className={`mr-1 font-semibold uppercase tracking-[0.08em] ${item.tone}`}>{item.label}</span>
        <span>{item.value}</span>
      </p>
    ))}
  </div>
);

export function BoundedRulesMatrix({ decisionMatrix, decisionRules = [] }: BoundedRulesMatrixProps) {
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
  const fallbackMatrix = {
    columns: [
      { key: "approve" as const, label: "Approve" },
      { key: "delay" as const, label: "Delay" },
      { key: "flip" as const, label: "Flip" },
    ],
    rows: rowOrder.map((key) => {
      const rule = rulesByArea.get(matrixAreaByKey[key]);
      return {
        key,
        label: rule ? decisionAreaLabel(rule.area) : key.charAt(0).toUpperCase() + key.slice(1),
        cells: {
          approve: {
            text: rule?.doNow[0] ?? fallbackDecisionTriplet.action,
            detail: rule?.rationale ?? "Keep approvals tied to near-term proof.",
            action: getTriplet(rule).action,
            threshold: getTriplet(rule).threshold,
            reversal: getTriplet(rule).reversal,
          },
          delay: {
            text: rule?.avoidNow[0] ?? "Delay irreversible commitments",
            detail: rule?.pauseTrigger ?? "Pause when thresholds weaken.",
            action: rule?.avoidNow[0] ?? "Delay irreversible commitments",
            threshold: getTriplet(rule).threshold,
            reversal: getTriplet(rule).reversal,
          },
          flip: {
            text: rule?.resumeTrigger ?? "Flip after threshold recovery",
            detail: rule?.resumeTrigger ?? "Resume only after threshold recovery holds.",
            action: getTriplet(rule).action,
            threshold: getTriplet(rule).threshold,
            reversal: getTriplet(rule).reversal,
          },
        },
        context: rule?.scope ?? "Apply this rule to related weekly operating decisions.",
      };
    }),
  };

  const matrix = decisionMatrix
    ? {
      ...decisionMatrix,
      rows: rowOrder.map((rowKey) => {
        const matrixRow = decisionMatrix.rows.find((row) => row.key === rowKey);
        const rule = rulesByArea.get(matrixAreaByKey[rowKey]);
        return {
          key: rowKey,
          label: matrixRow?.label ?? (rule ? decisionAreaLabel(rule.area) : rowKey.charAt(0).toUpperCase() + rowKey.slice(1)),
          cells: {
            approve: {
              text: matrixRow?.cells.approve.text ?? rule?.doNow[0] ?? fallbackDecisionTriplet.action,
              detail: matrixRow?.cells.approve.detail ?? rule?.rationale ?? "Keep approvals tied to near-term proof.",
              action: matrixRow?.cells.approve.action ?? getTriplet(rule).action,
              threshold: matrixRow?.cells.approve.threshold ?? getTriplet(rule).threshold,
              reversal: matrixRow?.cells.approve.reversal ?? getTriplet(rule).reversal,
            },
            delay: {
              text: matrixRow?.cells.delay.text ?? rule?.avoidNow[0] ?? "Delay irreversible commitments",
              detail: matrixRow?.cells.delay.detail ?? rule?.pauseTrigger ?? "Pause when thresholds weaken.",
              action: matrixRow?.cells.delay.action ?? rule?.avoidNow[0] ?? "Delay irreversible commitments",
              threshold: matrixRow?.cells.delay.threshold ?? getTriplet(rule).threshold,
              reversal: matrixRow?.cells.delay.reversal ?? getTriplet(rule).reversal,
            },
            flip: {
              text: matrixRow?.cells.flip.text ?? rule?.resumeTrigger ?? "Flip after threshold recovery",
              detail: matrixRow?.cells.flip.detail ?? rule?.resumeTrigger ?? "Resume only after threshold recovery holds.",
              action: matrixRow?.cells.flip.action ?? getTriplet(rule).action,
              threshold: matrixRow?.cells.flip.threshold ?? getTriplet(rule).threshold,
              reversal: matrixRow?.cells.flip.reversal ?? getTriplet(rule).reversal,
            },
          },
          context: rule?.scope ?? "Apply this rule to related weekly operating decisions.",
        };
      }),
    }
    : fallbackMatrix;

  if (!matrix || matrix.rows.length === 0) {
    return (
      <article className={`${tierOnePanel} ${sectionSpacing}`}>
        <h2 className={tierOneHeading}>Decision snapshot for leadership this week</h2>
        <p className="text-xs leading-5 text-slate-300">Decision matrix unavailable; keep current guardrails and recheck after next refresh.</p>
      </article>
    );
  }

  return (
    <article className={`${tierOnePanel} ${sectionSpacing}`}>
      <h2 className={tierOneHeading}>Decision snapshot for leadership this week</h2>
      <p className="text-xs leading-5 text-slate-300">Each lane shows the bounded rule: act now, trip line, and flip condition.</p>
      <div className="mt-2 hidden md:block">
        <div className="grid grid-cols-[minmax(0,11rem)_repeat(3,minmax(0,1fr))] gap-2" aria-label="Bounded decision matrix">
          <div className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
            Decision area
          </div>
          {matrix.columns.map((column) => (
            <div key={`desktop-column-${column.key}`} className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-left text-slate-200">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${decisionLaneTone[column.key].badgeClassName}`}>
                {decisionLaneTone[column.key].label}
              </span>
            </div>
          ))}
          {matrix.rows.map((row) => (
            <Fragment key={`desktop-row-${row.key}`}>
              <div className="rounded-md border border-slate-700/70 bg-slate-950/75 px-3 py-2.5">
                <p className="text-sm font-semibold text-slate-100">{row.label}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-300">{row.context}</p>
              </div>
              {matrix.columns.map((column) => {
                const cell = row.cells[column.key];
                return (
                  <div key={`${row.key}-${column.key}`} className="rounded-md border border-slate-700/55 bg-slate-950/60 px-3 py-2.5 align-top">
                    <p className="text-[11px] font-semibold leading-5 text-slate-100">{compactActionCue(cell.text)}</p>
                    <div className="mt-2 border-t border-slate-800/70 pt-2">
                      <MatrixRuleSummary action={cell.action} threshold={cell.threshold} reversal={cell.reversal} />
                    </div>
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
      <div className="mt-2 space-y-2 md:hidden">
        {matrix.rows.map((row) => (
          <article key={`mobile-${row.key}`} className="rounded-md border border-slate-700/55 bg-slate-950/60 p-2.5">
            <p className="text-xs font-semibold text-slate-100">{row.label}</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-300">{row.context}</p>
            <div className="mt-2 space-y-1.5">
              {matrix.columns.map((column) => {
                const cell = row.cells[column.key];
                return (
                  <div key={`mobile-${row.key}-${column.key}`} className="rounded border border-slate-700/60 bg-slate-950/70 px-2 py-2">
                    <p className="text-[11px] leading-5 text-slate-100">
                      <span className={`mr-1 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${decisionLaneTone[column.key].badgeClassName}`}>
                        {decisionLaneTone[column.key].label}
                      </span>
                      {compactActionCue(cell.text)}
                    </p>
                    <div className="mt-2 border-t border-slate-800/70 pt-2">
                      <MatrixRuleSummary action={cell.action} threshold={cell.threshold} reversal={cell.reversal} />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </article>
  );
}
