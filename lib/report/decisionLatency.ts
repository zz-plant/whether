import type { DecisionArea } from "./boundedDecisionRules";

/**
 * Decision latency: the clock each lever actually runs on.
 *
 * A bounded rule states what to do, when to pause, and when to resume — all
 * conditions on the signals. None of them says when the action is felt or what
 * unwinding costs, which is what tells an operator whether acting this week is
 * still worth it. These are properties of the lever, not of the regime: a hire
 * takes weeks to land whether funding pressure reads 40 or 80. The regime sets
 * the call; latency states what acting on it commits you to.
 */
export type DecisionLatency = {
  /** When acting this week is actually felt. */
  effectLandsLabel: string;
  /** What unwinding the commitment costs if the call flips. */
  reversalLabel: string;
};

export const decisionLatencyByArea: Record<DecisionArea, DecisionLatency> = {
  hiring: {
    effectLandsLabel: "Headcount from a decision this week lands in 4–6 weeks",
    reversalLabel: "unwinding costs 2–4 weeks of runway",
  },
  "product-tempo": {
    effectLandsLabel: "Tempo shifts are felt within 1–2 sprints",
    reversalLabel: "unwinding is a re-scope, not a cost",
  },
  "capital-raising": {
    effectLandsLabel: "Cash from a process started this week lands in 8–12 weeks",
    reversalLabel: "unwinding costs process momentum, not cash",
  },
  "burn-discipline": {
    effectLandsLabel: "Burn changes this month",
    reversalLabel: "unwinding is immediate",
  },
  "expansion-bets": {
    effectLandsLabel: "Effects land over 1–2 quarters",
    reversalLabel: "unwinding is capped by the current tranche",
  },
};

/** The one line a surface prints under an area: what acting commits you to. */
export const formatDecisionLatencyLine = (latency: DecisionLatency): string =>
  `${latency.effectLandsLabel}; ${latency.reversalLabel}.`;
