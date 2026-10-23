import { newEntryId } from "./decisionMemory";

/**
 * The operator's recorded response when a decision's conditions have moved.
 *
 * The ledger stores what was decided and the assumptions it rested on
 * (`lib/decisionMemory.ts`); the staleness engine says when those assumptions
 * moved (`lib/report/decisionStaleness.ts`). What neither records is what the
 * operator then did about it — continued, changed, or deferred. This is that
 * record: a per-client, append-only review response against one ledger entry,
 * carrying the reading it was made against so the review trail is a time
 * series (decision conditions → response conditions → the next check).
 *
 * It lives as its own record rather than a field on the entry so the decision
 * exports keep their schema: a follow-up is not a decision and must not appear
 * as one row in the decision CSV or the revisable delegation records.
 */

export type DecisionFollowUpResponse = "continued" | "changed" | "deferred";

type DecisionFollowUpConditions = {
  /** Funding pressure when the response was recorded. */
  tightness: number;
  /** Risk appetite when the response was recorded. */
  riskAppetite: number;
  /** Optional watch lines in force at response time, mirroring the entry's assumption snapshot. */
  tightnessThreshold?: number;
  riskAppetiteThreshold?: number;
};

export type DecisionFollowUpRecord = {
  id: string;
  createdAt: string;
  context: {
    clientId: string;
    teamId?: string;
    /** The reading the response was made against, not when it was typed. */
    recordDate: string;
  };
  /** The ledger entry this response is about. */
  entryId: string;
  response: DecisionFollowUpResponse;
  /** Optional free text: what changed, or when to revisit a deferred decision. */
  note?: string;
  conditions: DecisionFollowUpConditions;
};

/** The shape the route accepts; `id`, `createdAt` and the owner are added server-side. */
export type DecisionFollowUpPayload = {
  clientId?: string;
  teamId?: string;
  recordDate: string;
  entryId: string;
  response: DecisionFollowUpResponse;
  note?: string;
  conditions: DecisionFollowUpConditions;
};

const FOLLOW_UP_RESPONSES: ReadonlySet<string> = new Set([
  "continued",
  "changed",
  "deferred",
]);

export const FOLLOW_UP_NOTE_MAX_LENGTH = 500;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isOptionalString = (value: unknown): boolean =>
  value === undefined || typeof value === "string";

const isScore = (value: unknown): boolean =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;

const isConditions = (value: unknown): value is DecisionFollowUpConditions => {
  if (!isRecord(value)) return false;
  return isScore(value.tightness)
    && isScore(value.riskAppetite)
    && (value.tightnessThreshold === undefined || isScore(value.tightnessThreshold))
    && (value.riskAppetiteThreshold === undefined || isScore(value.riskAppetiteThreshold));
};

const isDecisionFollowUpRecord = (value: unknown): value is DecisionFollowUpRecord => {
  if (!isRecord(value) || !isRecord(value.context) || !isRecord(value.conditions)) {
    return false;
  }
  return typeof value.id === "string"
    && typeof value.createdAt === "string"
    && typeof value.context.clientId === "string"
    && isOptionalString(value.context.teamId)
    && typeof value.context.recordDate === "string"
    && typeof value.entryId === "string"
    && typeof value.response === "string"
    && FOLLOW_UP_RESPONSES.has(value.response)
    && (value.note === undefined
      || (typeof value.note === "string" && value.note.length <= FOLLOW_UP_NOTE_MAX_LENGTH))
    && isConditions(value.conditions);
};

export const parseDecisionFollowUpRecord = (value: unknown): DecisionFollowUpRecord | null =>
  isDecisionFollowUpRecord(value) ? value : null;

/** The route input, before the owner and timestamps are added server-side. */
const isDecisionFollowUpPayload = (value: unknown): value is DecisionFollowUpPayload => {
  if (!isRecord(value) || !isRecord(value.conditions)) return false;
  return isOptionalString(value.clientId)
    && isOptionalString(value.teamId)
    && typeof value.recordDate === "string"
    && typeof value.entryId === "string"
    && typeof value.response === "string"
    && FOLLOW_UP_RESPONSES.has(value.response)
    && (value.note === undefined
      || (typeof value.note === "string" && value.note.length <= FOLLOW_UP_NOTE_MAX_LENGTH))
    && isConditions(value.conditions);
};

export const parseDecisionFollowUpPayload = (value: unknown): DecisionFollowUpPayload | null =>
  isDecisionFollowUpPayload(value) ? value : null;

export const buildDecisionFollowUpRecord = (payload: DecisionFollowUpPayload): DecisionFollowUpRecord => ({
  id: newEntryId(),
  createdAt: new Date().toISOString(),
  context: {
    clientId: payload.clientId ?? "anonymous",
    teamId: payload.teamId,
    recordDate: payload.recordDate,
  },
  entryId: payload.entryId,
  response: payload.response,
  note: payload.note,
  conditions: payload.conditions,
});