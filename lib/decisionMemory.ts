import type { DecisionInput, DecisionOutput } from "./decisionShield";
import type { RegimeAssessment } from "./regimeEngine";

/**
 * "decision" entries come from the Decision Shield — a specific decision run through
 * the verdict engine. "posture-snapshot" entries come from the weekly brief, which
 * logs the standing operating call and has no decision triple or verdict to record.
 */
export type DecisionMemoryEntryKind = "decision" | "posture-snapshot";

export type DecisionMemoryEntry = {
  id: string;
  createdAt: string;
  /** Absent on entries written before snapshots existed; treat as "decision". */
  kind?: DecisionMemoryEntryKind;
  context: {
    clientId: string;
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
};

export type DecisionMemoryPayload = {
  clientId?: string;
  recordDate: string;
  decision: DecisionInput;
  outcome: Pick<DecisionOutput, "verdict" | "summary" | "guardrail" | "reversalTrigger">;
  assessment: Pick<RegimeAssessment, "regime" | "scores" | "thresholds" | "inputs">;
};

export type DecisionMemorySnapshotPayload = {
  kind: "posture-snapshot";
  clientId?: string;
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
    context: {
      clientId: payload.clientId ?? "anonymous",
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
  };
};

export const buildDecisionMemorySnapshotEntry = (
  payload: DecisionMemorySnapshotPayload,
): DecisionMemoryEntry => ({
  id: newEntryId(),
  createdAt: new Date().toISOString(),
  kind: "posture-snapshot",
  context: {
    clientId: payload.clientId ?? "anonymous",
    recordDate: payload.recordDate,
  },
  outcome: {
    summary: payload.primaryCall,
    guardrail: payload.guardrail ?? "",
    reversalTrigger: payload.reversalTrigger ?? "",
  },
  regime: {
    label: payload.regime,
    scores: {
      ...(payload.tightness === undefined ? {} : { tightness: payload.tightness }),
      ...(payload.riskAppetite === undefined ? {} : { riskAppetite: payload.riskAppetite }),
      ...(payload.boldnessScore === undefined ? {} : { boldnessScore: payload.boldnessScore }),
    },
  },
  sources: [...new Set(payload.sources ?? [])],
});

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
