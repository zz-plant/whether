import type { DecisionInput, DecisionOutput } from "./decisionShield";
import type { RegimeAssessment } from "./regimeEngine";

/**
 * "decision" entries come from the Decision Shield — a specific decision run through
 * the verdict engine. "posture-snapshot" entries come from the weekly brief, which
 * logs the standing operating call and has no decision triple or verdict to record.
 */
export type DecisionMemoryEntryKind = "decision" | "posture-snapshot";

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
    label: RegimeAssessment["regime"] | string;
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

export type DecisionAssumptionVerdict = "RECONSIDER" | "WATCH" | "STAND";

export type DecisionAssumptionHealthResult = {
  verdict: DecisionAssumptionVerdict;
  reason: string;
  tightnessDelta: number;
  riskAppetiteDelta: number;
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
  const baseTightness = entry.assumptions?.tightness
    ?? (typeof entry.regime.scores.tightness === "number" ? entry.regime.scores.tightness : currentTightness);
  const baseRiskAppetite = entry.assumptions?.riskAppetite
    ?? (typeof entry.regime.scores.riskAppetite === "number" ? entry.regime.scores.riskAppetite : currentRiskAppetite);

  const tightnessDelta = currentTightness - baseTightness;
  const riskAppetiteDelta = currentRiskAppetite - baseRiskAppetite;

  // Significant deterioration: tightness jumped >= 10 points or risk appetite dropped >= 10 points
  if (tightnessDelta >= 10 || riskAppetiteDelta <= -10) {
    return {
      verdict: "RECONSIDER",
      reason: "Capital conditions and demand expectations have weakened relative to the assumptions recorded when you approved the plan.",
      tightnessDelta,
      riskAppetiteDelta,
    };
  }

  // Moderate movement: tightness rose 5-9 pts or risk appetite dropped 5-9 pts
  if (tightnessDelta >= 5 || riskAppetiteDelta <= -5) {
    return {
      verdict: "WATCH",
      reason: "One supporting assumption has deteriorated, but conditions remain inside your original operating range.",
      tightnessDelta,
      riskAppetiteDelta,
    };
  }

  return {
    verdict: "STAND",
    reason: "Macro conditions remain consistent with the assumptions recorded at approval.",
    tightnessDelta,
    riskAppetiteDelta,
  };
};
