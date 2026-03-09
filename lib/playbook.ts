/**
 * Playbook selectors for mapping regimes to operational stop/start/fence guidance.
 * Keeps playbook copy centralized and traceable to the insight database.
 */
import { insightDatabase } from "../data/recommendations";
import type { RegimeKey } from "./regimeEngine";

export interface PlaybookEntry {
  key: RegimeKey;
  title: string;
  tone: string;
  mandate: string;
  insight: string;
  leadershipPhrases: {
    more: readonly string[];
    less: readonly string[];
  };
  stop: readonly string[];
  start: readonly string[];
  metric: string;
}

export interface PlaybookGuidance {
  playbook: PlaybookEntry | null;
  stopItems: string[];
  startItems: string[];
}

export const stakeholderRoles = ["founder-ceo", "product-engineering", "finance"] as const;

export type StakeholderRole = (typeof stakeholderRoles)[number];

export type RoleScopedTemplate = {
  doNow: string;
  avoidNow: string;
  reversalTrigger: string;
};

const DEFAULT_STOP_ITEMS = ["Avoid unbudgeted bets."];
const DEFAULT_START_ITEMS = ["Invest in margin-positive moves."];

const roleScopedTemplatesByRegime: Record<RegimeKey, Record<StakeholderRole, RoleScopedTemplate>> = {
  SCARCITY: {
    "founder-ceo": {
      doNow: "Cut operating plan to survival-critical commitments with weekly cash review.",
      avoidNow: "Avoid adding fixed-cost programs without line-of-sight payback inside one quarter.",
      reversalTrigger: "Reopen paused bets when tightness falls below 70 for two consecutive reads.",
    },
    "product-engineering": {
      doNow: "Ship reliability and retention fixes tied to near-term revenue protection.",
      avoidNow: "Avoid roadmap expansion that adds maintenance load without current-quarter demand proof.",
      reversalTrigger: "Restore deferred roadmap bets when risk appetite rises above 48 for two reads.",
    },
    finance: {
      doNow: "Lock discretionary spend and run weekly variance checks against cash runway plan.",
      avoidNow: "Avoid approving annual commitments without explicit rollback terms.",
      reversalTrigger: "Loosen spend gates when base-rate pressure eases and runway remains above 15 months.",
    },
  },
  DEFENSIVE: {
    "founder-ceo": {
      doNow: "Keep hiring and expansion decisions tied to mission-critical throughput or contracted revenue.",
      avoidNow: "Avoid broad team expansion before proving payback windows in active lanes.",
      reversalTrigger: "Broaden approvals when tightness holds below 60 and demand quality improves for two weeks.",
    },
    "product-engineering": {
      doNow: "Prioritize roadmap slices that stabilize retention, reliability, and near-term monetization.",
      avoidNow: "Avoid long-horizon platform rewrites without phased delivery checkpoints.",
      reversalTrigger: "Increase build scope once risk appetite is above 52 for two reads.",
    },
    finance: {
      doNow: "Require decision memos with payback threshold, owner, and pause condition before spend approval.",
      avoidNow: "Avoid extending burn without a matching downside-protection action.",
      reversalTrigger: "Relax contingency reserve targets after two updates with improving tightness and stable margin.",
    },
  },
  VOLATILE: {
    "founder-ceo": {
      doNow: "Run short decision cycles with explicit stop/go checkpoints for all new bets.",
      avoidNow: "Avoid locking strategy into annual assumptions while signals are moving in opposite directions.",
      reversalTrigger: "Commit to longer-duration plans once signal direction is aligned for two consecutive updates.",
    },
    "product-engineering": {
      doNow: "Ship reversible experiments with measurable adoption thresholds each sprint.",
      avoidNow: "Avoid single-path roadmap commitments that cannot be rolled back within one sprint.",
      reversalTrigger: "Scale successful experiments when conversion and retention hold for two measurement windows.",
    },
    finance: {
      doNow: "Use tranche-based funding with milestone release criteria and weekly reforecasting.",
      avoidNow: "Avoid releasing full-quarter discretionary budgets upfront.",
      reversalTrigger: "Move to broader budget envelopes after volatility compresses for two consecutive reads.",
    },
  },
  EXPANSION: {
    "founder-ceo": {
      doNow: "Increase growth capacity in lanes with validated demand and clear ownership.",
      avoidNow: "Avoid scaling headcount across every function at once.",
      reversalTrigger: "Reinstate tighter controls if risk appetite falls to or below 50.",
    },
    "product-engineering": {
      doNow: "Accelerate proven roadmap bets while keeping quality and rollback checks explicit.",
      avoidNow: "Avoid shipping unbounded scope that weakens delivery reliability.",
      reversalTrigger: "Return to defensive sequencing when conversion efficiency drops for two weeks.",
    },
    finance: {
      doNow: "Fund expansion in tranches with explicit ROI checkpoints and downside reserve floor.",
      avoidNow: "Avoid relaxing procurement controls without visibility into payback timelines.",
      reversalTrigger: "Tighten spend thresholds if tightness rises above 55 or runway forecast slips below plan.",
    },
  },
};

export const stakeholderRoleLabel: Record<StakeholderRole, string> = {
  "founder-ceo": "Founder / CEO",
  "product-engineering": "Product & Engineering",
  finance: "Finance",
};

export const getPlaybookForRegime = (regime: RegimeKey): PlaybookEntry | null => {
  const match = insightDatabase.regimePlaybooks.regimes.find((entry) => entry.key === regime);
  return match ?? null;
};

export const getPlaybookGuidance = (regime: RegimeKey): PlaybookGuidance => {
  const playbook = getPlaybookForRegime(regime);
  return {
    playbook,
    stopItems: playbook ? [...playbook.stop] : DEFAULT_STOP_ITEMS,
    startItems: playbook ? [...playbook.start] : DEFAULT_START_ITEMS,
  };
};

export const getRoleScopedTemplate = (regime: RegimeKey, role: StakeholderRole): RoleScopedTemplate =>
  roleScopedTemplatesByRegime[regime][role];

export const getRoleScopedTemplatesForRegime = (regime: RegimeKey) =>
  stakeholderRoles.map((role) => ({
    role,
    roleLabel: stakeholderRoleLabel[role],
    ...getRoleScopedTemplate(regime, role),
  }));
