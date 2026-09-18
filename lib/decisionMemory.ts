import type { DecisionInput, DecisionOutput, LifecycleStage, PlanStressTestResult } from "./decisionShield";
import type { RegimeAssessment } from "./regimeEngine";

/**
 * "decision" entries come from the Decision Shield — a specific decision run through
 * the verdict engine. "posture-snapshot" entries come from the weekly brief, which
 * logs the standing operating call and has no decision triple or verdict to record.
 */
type DecisionMemoryEntryKind = "decision" | "posture-snapshot";

/**
 * The conditions that had to be true for a recorded decision to keep making
 * sense. Captured at write time so a later week can compare current conditions
 * against the decision's own assumptions instead of against today's posture.
 */
export type DecisionAssumptionSnapshot = {
  /** Funding pressure reading when the decision was recorded. */
  tightness: number;
  /** Risk appetite reading when the decision was recorded. */
  riskAppetite: number;
  /** Tightness regime boundary in force at record time. */
  tightnessThreshold: number;
  /** Risk appetite regime boundary in force at record time. */
  riskAppetiteThreshold: number;
  /** Optional explicit assumption band labels, e.g. capital availability / demand. */
  assumptionLabels?: string[];
};

export type DecisionDepartment =
  | "Engineering"
  | "Sales"
  | "Product"
  | "Finance"
  | "Executive"
  | "Operations";

export type DecisionMemoryEntry = {
  id: string;
  createdAt: string;
  /** Absent on entries written before snapshots existed; treat as "decision". */
  kind?: DecisionMemoryEntryKind;
  department?: DecisionDepartment;
  owner?: string;
  /**
   * The owner, when the server could verify the request was made by the client
   * it claims. Only this field may become a `human` actor in an exported
   * record; `owner` above is the caller's unverified claim and is kept for
   * display only. See `lib/export/revisableDelegationRecord.ts`.
   */
  verifiedOwner?: string;
  context: {
    clientId: string;
    teamId?: string;
    recordDate: string;
  };
  /** Absent on posture snapshots. */
  decision?: DecisionInput;
  outcome: Pick<DecisionOutput, "summary" | "guardrail" | "reversalTrigger"> & {
    /** Absent on posture snapshots — nothing was run through the verdict engine. */
    verdict?: DecisionOutput["verdict"];
  };
  regime: {
    /** A `RegimeKey` on entries this build wrote; any string on older ones. */
    label: string;
    /** Snapshots carry only the scores the weekly brief actually holds. */
    scores: Partial<RegimeAssessment["scores"]> & { boldnessScore?: number };
    thresholds?: RegimeAssessment["thresholds"];
  };
  sources: string[];
  /** Conditions that had to hold for this decision to make sense. Absent on legacy entries. */
  assumptions?: DecisionAssumptionSnapshot;
};

export type DecisionMemoryPayload = {
  clientId?: string;
  teamId?: string;
  department?: DecisionDepartment;
  owner?: string;
  recordDate: string;
  decision: DecisionInput;
  outcome: Pick<DecisionOutput, "verdict" | "summary" | "guardrail" | "reversalTrigger">;
  assessment: Pick<RegimeAssessment, "regime" | "scores" | "thresholds" | "inputs">;
};

export type DecisionMemorySnapshotPayload = {
  kind: "posture-snapshot";
  clientId?: string;
  teamId?: string;
  department?: DecisionDepartment;
  owner?: string;
  recordDate: string;
  regime: string;
  /** The weekly operating call, recorded as the entry summary. */
  primaryCall: string;
  tightness?: number;
  riskAppetite?: number;
  boldnessScore?: number;
  guardrail?: string;
  reversalTrigger?: string;
  sources?: string[];
  /** Regime boundaries in force, so the assumption band is the operating watch line, not the reading itself. */
  tightnessThreshold?: number;
  riskAppetiteThreshold?: number;
};

const DECISION_MEMORY_KINDS = new Set(["decision", "posture-snapshot"]);
const DECISION_DEPARTMENTS = new Set([
  "Engineering",
  "Sales",
  "Product",
  "Finance",
  "Executive",
  "Operations",
]);
const LIFECYCLE_STAGES = new Set(["DISCOVERY", "GROWTH", "SCALE", "MATURE"]);
const DECISION_CATEGORIES = new Set([
  "HIRING",
  "ROADMAP",
  "PRICING",
  "INFRASTRUCTURE",
  "M_AND_A",
  "GEOGRAPHIC_EXPANSION",
  "RESTRUCTURING",
]);
const DECISION_ACTIONS = new Set([
  "HIRE",
  "REWRITE",
  "LAUNCH",
  "DISCOUNT",
  "EXPAND",
  "ACQUIRE",
  "DIVEST",
  "INFRA_SPEND",
  "REGIONAL_EXPANSION",
  "RESTRUCTURE",
]);
const DECISION_VERDICTS = new Set(["SAFE", "RISKY", "DANGEROUS"]);
const BASE_RATE_SOURCES = new Set(["FED", "1M", "3M", "MISSING"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isOptionalString = (value: unknown): boolean =>
  value === undefined || typeof value === "string";

const isOptionalNumber = (value: unknown): boolean =>
  value === undefined || typeof value === "number";

const isThresholds = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  return typeof value.baseRateTightness === "number"
    && typeof value.tightnessRegime === "number"
    && typeof value.riskAppetiteRegime === "number";
};

const isDecisionInput = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  return typeof value.lifecycle === "string"
    && LIFECYCLE_STAGES.has(value.lifecycle)
    && typeof value.category === "string"
    && DECISION_CATEGORIES.has(value.category)
    && typeof value.action === "string"
    && DECISION_ACTIONS.has(value.action)
    && isOptionalString(value.context);
};

const isAssumptionSnapshot = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  return typeof value.tightness === "number"
    && typeof value.riskAppetite === "number"
    && typeof value.tightnessThreshold === "number"
    && typeof value.riskAppetiteThreshold === "number"
    && (value.assumptionLabels === undefined
      || (Array.isArray(value.assumptionLabels) && value.assumptionLabels.every((label) => typeof label === "string")));
};

const isDecisionMemoryEntry = (value: unknown): value is DecisionMemoryEntry => {
  if (!isRecord(value) || !isRecord(value.context) || !isRecord(value.outcome) || !isRecord(value.regime)) {
    return false;
  }
  if (!isRecord(value.regime.scores)) return false;

  const scores = value.regime.scores;
  const scoresAreValid = isOptionalNumber(scores.tightness)
    && isOptionalNumber(scores.riskAppetite)
    && isOptionalNumber(scores.baseRate)
    && isOptionalNumber(scores.boldnessScore)
    && (scores.curveSlope === undefined || scores.curveSlope === null || typeof scores.curveSlope === "number")
    && (scores.baseRateUsed === undefined
      || (typeof scores.baseRateUsed === "string" && BASE_RATE_SOURCES.has(scores.baseRateUsed)));

  return typeof value.id === "string"
    && typeof value.createdAt === "string"
    && (value.kind === undefined
      || (typeof value.kind === "string" && DECISION_MEMORY_KINDS.has(value.kind)))
    && (value.department === undefined
      || (typeof value.department === "string" && DECISION_DEPARTMENTS.has(value.department)))
    && isOptionalString(value.owner)
    && typeof value.context.clientId === "string"
    && isOptionalString(value.context.teamId)
    && typeof value.context.recordDate === "string"
    && (value.decision === undefined || isDecisionInput(value.decision))
    && typeof value.outcome.summary === "string"
    && typeof value.outcome.guardrail === "string"
    && typeof value.outcome.reversalTrigger === "string"
    && (value.outcome.verdict === undefined
      || (typeof value.outcome.verdict === "string" && DECISION_VERDICTS.has(value.outcome.verdict)))
    && typeof value.regime.label === "string"
    && scoresAreValid
    && (value.regime.thresholds === undefined || isThresholds(value.regime.thresholds))
    && Array.isArray(value.sources)
    && value.sources.every((source) => typeof source === "string")
    && (value.assumptions === undefined || isAssumptionSnapshot(value.assumptions));
};

export const parseDecisionMemoryEntry = (value: unknown): DecisionMemoryEntry | null =>
  isDecisionMemoryEntry(value) ? value : null;

const newEntryId = () =>
  typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`;

export const buildDecisionMemoryEntry = (payload: DecisionMemoryPayload): DecisionMemoryEntry => {
  const sourceSet = new Set(
    payload.assessment.inputs
      .map((input) => input.sourceUrl)
      .filter((sourceUrl): sourceUrl is string => Boolean(sourceUrl))
  );

  return {
    id: newEntryId(),
    createdAt: new Date().toISOString(),
    kind: "decision",
    department: payload.department,
    owner: payload.owner,
    context: {
      clientId: payload.clientId ?? "anonymous",
      teamId: payload.teamId,
      recordDate: payload.recordDate,
    },
    decision: payload.decision,
    outcome: payload.outcome,
    regime: {
      label: payload.assessment.regime,
      scores: payload.assessment.scores,
      thresholds: payload.assessment.thresholds,
    },
    sources: [...sourceSet],
    assumptions: buildAssumptionSnapshot({
      assessment: payload.assessment,
    }),
  };
};

const buildAssumptionSnapshot = ({
  assessment,
}: {
  assessment: Pick<RegimeAssessment, "scores" | "thresholds">;
}): DecisionAssumptionSnapshot => ({
  tightness: assessment.scores.tightness,
  riskAppetite: assessment.scores.riskAppetite,
  tightnessThreshold: assessment.thresholds.tightnessRegime,
  riskAppetiteThreshold: assessment.thresholds.riskAppetiteRegime,
});

export const buildDecisionMemorySnapshotEntry = (
  payload: DecisionMemorySnapshotPayload,
): DecisionMemoryEntry => {
  const snapshot = {
    ...(payload.tightness === undefined ? {} : { tightness: payload.tightness }),
    ...(payload.riskAppetite === undefined ? {} : { riskAppetite: payload.riskAppetite }),
    ...(payload.boldnessScore === undefined ? {} : { boldnessScore: payload.boldnessScore }),
  };

  return {
    id: newEntryId(),
    createdAt: new Date().toISOString(),
    kind: "posture-snapshot",
    department: payload.department,
    owner: payload.owner,
    context: {
      clientId: payload.clientId ?? "anonymous",
      teamId: payload.teamId,
      recordDate: payload.recordDate,
    },
    outcome: {
      summary: payload.primaryCall,
      guardrail: payload.guardrail ?? "",
      reversalTrigger: payload.reversalTrigger ?? "",
    },
    regime: {
      label: payload.regime,
      scores: snapshot,
    },
    sources: [...new Set(payload.sources ?? [])],
    assumptions: buildSnapshotAssumptions(payload),
  };
};

const buildSnapshotAssumptions = (
  payload: DecisionMemorySnapshotPayload,
): DecisionAssumptionSnapshot | undefined => {
  if (typeof payload.tightness !== "number" || typeof payload.riskAppetite !== "number") {
    return undefined;
  }
  // Posture snapshots prefer the regime boundaries in force as the watch line;
  // without them, the recorded reading itself is the band.
  const tightnessThreshold = typeof payload.tightnessThreshold === "number"
    ? payload.tightnessThreshold
    : payload.tightness;
  const riskAppetiteThreshold = typeof payload.riskAppetiteThreshold === "number"
    ? payload.riskAppetiteThreshold
    : payload.riskAppetite;
  return {
    tightness: payload.tightness,
    riskAppetite: payload.riskAppetite,
    tightnessThreshold,
    riskAppetiteThreshold,
  };
};

const escapeCsvCell = (value: string) => `"${value.replaceAll('"', '""')}"`;

export const toDecisionMemoryCsv = (entries: DecisionMemoryEntry[]) => {
  const header = [
    "id",
    "createdAt",
    "kind",
    "clientId",
    "recordDate",
    "regime",
    "verdict",
    "lifecycle",
    "category",
    "action",
    "summary",
    "guardrail",
    "reversalTrigger",
    "sources",
  ];

  // Posture snapshots have no decision triple and no verdict; those cells stay empty
  // rather than being filled with a fabricated decision.
  const rows = entries.map((entry) => [
    entry.id,
    entry.createdAt,
    entry.kind ?? "decision",
    entry.context.clientId,
    entry.context.recordDate,
    entry.regime.label,
    entry.outcome.verdict ?? "",
    entry.decision?.lifecycle ?? "",
    entry.decision?.category ?? "",
    entry.decision?.action ?? "",
    entry.outcome.summary,
    entry.outcome.guardrail,
    entry.outcome.reversalTrigger,
    entry.sources.join(" | "),
  ]);

  return [header, ...rows].map((row) => row.map((value) => escapeCsvCell(String(value))).join(",")).join("\n");
};

import {
  assessDecisionStaleness,
  type MovedAssumption,
  type StalenessVerdict,
} from "./report/decisionStaleness";

type DecisionAssumptionVerdict = StalenessVerdict;

type DecisionAssumptionHealthResult = {
  verdict: DecisionAssumptionVerdict;
  reason: string;
  tightnessDelta: number;
  riskAppetiteDelta: number;
  moved?: MovedAssumption[];
};

export const evaluateDecisionAssumptionHealth = ({
  entry,
  currentTightness,
  currentRiskAppetite,
}: {
  entry: DecisionMemoryEntry;
  currentTightness: number;
  currentRiskAppetite: number;
}): DecisionAssumptionHealthResult => {
  const assumptions: DecisionAssumptionSnapshot = entry.assumptions ?? {
    tightness: typeof entry.regime.scores.tightness === "number" ? entry.regime.scores.tightness : currentTightness,
    riskAppetite: typeof entry.regime.scores.riskAppetite === "number" ? entry.regime.scores.riskAppetite : currentRiskAppetite,
    tightnessThreshold: entry.regime.thresholds?.tightnessRegime ?? 70,
    riskAppetiteThreshold: entry.regime.thresholds?.riskAppetiteRegime ?? 50,
  };

  const tightnessDelta = currentTightness - assumptions.tightness;
  const riskAppetiteDelta = currentRiskAppetite - assumptions.riskAppetite;

  const staleness = assessDecisionStaleness(assumptions, {
    tightness: currentTightness,
    riskAppetite: currentRiskAppetite,
  });

  return {
    verdict: staleness.verdict,
    reason: staleness.why,
    tightnessDelta,
    riskAppetiteDelta,
    moved: staleness.moved,
  };
};

type CohortDecisionAuditResult = {
  stand: DecisionMemoryEntry[];
  watch: Array<{ entry: DecisionMemoryEntry; health: DecisionAssumptionHealthResult }>;
  reconsider: Array<{ entry: DecisionMemoryEntry; health: DecisionAssumptionHealthResult }>;
  totalAudited: number;
};

export const auditCohortDecisions = (
  entries: DecisionMemoryEntry[],
  currentSignals: { tightness: number; riskAppetite: number },
): CohortDecisionAuditResult => {
  const stand: DecisionMemoryEntry[] = [];
  const watch: Array<{ entry: DecisionMemoryEntry; health: DecisionAssumptionHealthResult }> = [];
  const reconsider: Array<{ entry: DecisionMemoryEntry; health: DecisionAssumptionHealthResult }> = [];

  for (const entry of entries) {
    const health = evaluateDecisionAssumptionHealth({
      entry,
      currentTightness: currentSignals.tightness,
      currentRiskAppetite: currentSignals.riskAppetite,
    });

    if (health.verdict === "RECONSIDER") {
      reconsider.push({ entry, health });
    } else if (health.verdict === "WATCH") {
      watch.push({ entry, health });
    } else {
      stand.push(entry);
    }
  }

  return {
    stand,
    watch,
    reconsider,
    totalAudited: entries.length,
  };
};

/**
 * The payload the plan stress test on the brief sends when the reader clicks
 * "Track in Memory".
 *
 * It used to post `{ kind: "plan-evaluation", planText, verdict, … }`, a shape
 * this API has never accepted, and then reported "Tracked in Memory" without
 * reading the 400. This builds the same `decision` entry the Decision Shield
 * on Planning writes, so the entry lands in the same list with the same
 * assumption snapshot, and the sentence that was tested travels as `context`.
 */
export const buildPlanStressTestMemoryPayload = ({
  clientId,
  recordDate,
  planText,
  lifecycle,
  result,
  assessment,
}: {
  clientId: string;
  recordDate: string;
  planText: string;
  lifecycle: LifecycleStage;
  result: Pick<
    PlanStressTestResult,
    "detectedCategory" | "detectedAction" | "verdict" | "headline" | "boundedGuardrail" | "reversalTrigger"
  >;
  assessment: Pick<RegimeAssessment, "regime" | "scores" | "thresholds" | "inputs">;
}): DecisionMemoryPayload => ({
  clientId,
  recordDate,
  decision: {
    lifecycle,
    category: result.detectedCategory,
    action: result.detectedAction,
    context: planText.trim(),
  },
  outcome: {
    verdict: result.verdict,
    summary: result.headline,
    guardrail: result.boundedGuardrail,
    reversalTrigger: result.reversalTrigger,
  },
  assessment: {
    regime: assessment.regime,
    scores: assessment.scores,
    thresholds: assessment.thresholds,
    inputs: assessment.inputs,
  },
});
