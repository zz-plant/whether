import type { DecisionInput, DecisionOutput } from "./decisionShield";
import type { RegimeAssessment } from "./regimeEngine";

export type DecisionMemoryEntry = {
  id: string;
  createdAt: string;
  context: {
    clientId: string;
    recordDate: string;
  };
  decision: DecisionInput;
  outcome: Pick<DecisionOutput, "verdict" | "summary" | "guardrail" | "reversalTrigger">;
  regime: {
    label: RegimeAssessment["regime"];
    scores: RegimeAssessment["scores"];
    thresholds: RegimeAssessment["thresholds"];
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

export const buildDecisionMemoryEntry = (payload: DecisionMemoryPayload): DecisionMemoryEntry => {
  const sourceSet = new Set(
    payload.assessment.inputs
      .map((input) => input.sourceUrl)
      .filter((sourceUrl): sourceUrl is string => Boolean(sourceUrl))
  );

  return {
    id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`,
    createdAt: new Date().toISOString(),
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

const escapeCsvCell = (value: string) => `"${value.replaceAll('"', '""')}"`;

export const toDecisionMemoryCsv = (entries: DecisionMemoryEntry[]) => {
  const header = [
    "id",
    "createdAt",
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

  const rows = entries.map((entry) => [
    entry.id,
    entry.createdAt,
    entry.context.clientId,
    entry.context.recordDate,
    entry.regime.label,
    entry.outcome.verdict,
    entry.decision.lifecycle,
    entry.decision.category,
    entry.decision.action,
    entry.outcome.summary,
    entry.outcome.guardrail,
    entry.outcome.reversalTrigger,
    entry.sources.join(" | "),
  ]);

  return [header, ...rows].map((row) => row.map((value) => escapeCsvCell(String(value))).join(",")).join("\n");
};
