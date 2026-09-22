import type { buildAgentPayload } from "../agentHandoff";
import { decisionAreaLabel, type DecisionArea } from "../report/boundedDecisionRules";
import { JEV_MODEL, type JevQuestion } from "./jevClient";

/**
 * This week's call as a ready-made Jev request, for `/api/agent?format=jev`.
 *
 * Jev pipelines work as "Jev judges, code executes": compact typed state in,
 * a few typed questions out, thresholds in the caller's code. Whether's call is
 * already typed, so the useful thing to hand over is the state with a slot for
 * the caller's own plan, and the questions an operator would ask of that plan
 * against the call. Whether never sees the plan: the caller fills the slot and
 * sends the request to Jev themselves.
 *
 * The state is a subset of the agent handoff payload, not a second derivation
 * of the call, so the two formats cannot disagree about the week.
 */
type AgentPayload = ReturnType<typeof buildAgentPayload>;

const DECISION_AREAS: DecisionArea[] = [
  "hiring",
  "product-tempo",
  "capital-raising",
  "burn-discipline",
  "expansion-bets",
];

const PLAN_QUESTIONS: Record<string, JevQuestion> = {
  conflicts_with_call: {
    type: "noul",
    instructions:
      "Does the plan in state.plan go against this week's operating call in state.whether (its constraints and decision rules)?",
    criteria: {
      true: "The plan does something the call says to pause, hold, or avoid right now",
      false: "The plan fits within what the call allows, or the call says nothing about it",
    },
  },
  decision_area: {
    type: "choice",
    instructions: "Which kind of decision does the plan in state.plan mainly involve?",
    criteria: {
      ...Object.fromEntries(DECISION_AREAS.map((area) => [area, decisionAreaLabel(area)])),
      other: "None of these",
    },
  },
  reversibility: {
    type: "score",
    instructions: "How hard would the plan in state.plan be to undo if conditions changed next month?",
    criteria: ["Easy to undo", "Costly to undo", "Cannot be undone"],
  },
  wait_for_flip: {
    type: "noul",
    instructions:
      "Would the plan in state.plan be clearly safer to start after the call changes, as described in state.whether.flip_watch?",
    criteria: {
      true: "Waiting for the change would materially lower the plan's risk",
      false: "The change would make little difference to the plan",
    },
  },
};

export const buildJevHandoff = ({
  payload,
  publishReadiness,
  recordDateLabel,
}: {
  payload: AgentPayload;
  publishReadiness: { ok: true } | { ok: false; reason: string };
  recordDateLabel: string | null;
}) => ({
  format: "jev" as const,
  model: JEV_MODEL,
  recordDate: payload.report_date,
  recordDateLabel,
  /* The judgment the weekly Slack post and email refuse on. A pipeline that acts on
     Jev's answer is automating on this week's call, so it gets the same bar. */
  automationReady: publishReadiness.ok,
  automationRefusal: publishReadiness.ok ? null : publishReadiness.reason,
  request: {
    state: {
      whether: {
        report_date: payload.report_date,
        regime: payload.regime,
        scores: payload.scores,
        thresholds: payload.thresholds,
        constraints: payload.constraints,
        data_warnings: payload.data_warnings,
        decision_rules: payload.decision_rules,
        flip_watch: payload.flip_watch,
      },
      plan: null,
    },
    questions: PLAN_QUESTIONS,
  },
  instructions: [
    "Set request.state.plan to a short description of the plan you want checked, then send request to typesafe/jev.",
    "Whether never receives the plan: this response is the whole exchange with Whether.",
    "Act on an answer in your own code, with your own threshold. A noul near 0.5 is a coin toss; route it to a person.",
    "Whether's confidence label measures distance from the line that changes the call, not a probability. The record behind it is at /trust#confidence-record.",
    "If automationReady is false, this week's reading is not live or not current (automationRefusal says which); do not automate on it.",
  ],
});
