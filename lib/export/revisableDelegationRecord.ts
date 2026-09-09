import type { DecisionMemoryEntry } from "../decisionMemory";

/**
 * Whether's decision memory, exported in the STD-07 Revisable Delegation Record
 * shape (https://ethotechnics.org/standards/std-07-revisable-delegation-record).
 *
 * Whether authorizes nothing and acts on nothing: it issues a weekly operating
 * call and the operator acts. So every record it emits is a `belief`. A
 * Decision Shield entry becomes two records, the regime belief in force when
 * the decision was run and the decision belief that depends on it; a posture
 * snapshot becomes one. `invalidated_by` is the assumption snapshot the entry
 * already carries, restated as checkable conditions, which is what lets a
 * later week see that a recorded call no longer rests on its own assumptions.
 *
 * Conformance: Level 2, as measured rather than asserted. Records are
 * append-only, hashed over the canonical serialization in STD-07 §5.1, chained
 * by prior_hash in createdAt order, and every one states what would end it.
 * Whether emits no discrepancies, so the Level 2 requirement that each one be
 * answered inside its clock is met vacuously.
 *
 * Not Level 3. Every record carries `contest`, but Level 3 asks for an objection
 * that was actually accepted and answered, and Whether has no channel that
 * writes one into the stream. A level is what a reader can see, not what the
 * emitter intends.
 */

export const REVISABLE_DELEGATION_RECORD_SCHEMA_VERSION = "0.1.0";
export const REVISABLE_DELEGATION_STANDARD_URL =
  "https://ethotechnics.org/standards/std-07-revisable-delegation-record";
export const REVISABLE_DELEGATION_SCHEMA_URL =
  "https://ethotechnics.org/api/schema/revisable-delegation-record.schema.json";
/** The reader that can contradict the level declared below. */
export const REVISABLE_DELEGATION_VERIFIER_URL =
  "https://ethotechnics.org/diagnostics/record-conformance";
export const WHETHER_REVISABLE_DELEGATION_CONFORMANCE_LEVEL = 2;
const WHETHER_VERSION = "0.1.0";

type InvalidationCondition = { condition: string; check?: string; clock?: string };

export type WhetherRevisableDelegationRecord = {
  schema_version: typeof REVISABLE_DELEGATION_RECORD_SCHEMA_VERSION;
  record_id: string;
  kind: "belief";
  system: { id: "whether"; version: string; origin: string };
  actor: { id: string; kind: "human" | "service"; on_behalf_of?: string };
  subject: string;
  summary: string;
  time: { as_of: string; recorded_at: string; valid_until?: string };
  content: {
    proposition: string;
    evidence: string[];
    verdict?: string;
    guardrail?: string;
    reversal_trigger?: string;
  };
  depends_on: string[];
  invalidated_by: InvalidationCondition[];
  visibility: "private";
  contest: { standing: string; channel: string; reversal_clock: string };
  integrity: { algorithm: "sha256"; hash: string; prior_hash?: string };
};

type UnsealedRecord = Omit<WhetherRevisableDelegationRecord, "integrity">;

const sortKeysDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return Object.fromEntries(entries.map(([key, entryValue]) => [key, sortKeysDeep(entryValue)]));
  }
  return value;
};

/** STD-07 §5.1: the record without its integrity block, keys sorted, no whitespace. */
export const canonicalizeRecord = (record: UnsealedRecord | WhetherRevisableDelegationRecord): string => {
  const rest: Record<string, unknown> = { ...record };
  delete rest.integrity;
  return JSON.stringify(sortKeysDeep(rest));
};

const sha256Hex = async (text: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const hashRecord = (record: UnsealedRecord | WhetherRevisableDelegationRecord) =>
  sha256Hex(canonicalizeRecord(record));

const addDays = (isoDate: string, days: number): string => {
  const date = new Date(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
};

const asOfFromRecordDate = (recordDate: string): string =>
  recordDate.includes("T") ? new Date(recordDate).toISOString() : `${recordDate}T00:00:00.000Z`;

/**
 * Every belief has to say what would end it. An entry that carries an assumption
 * snapshot says so precisely, in the regime boundaries it was decided against.
 * An entry that carries none — an early posture snapshot, mostly — still has a
 * regime label and a one-week horizon, and those are checkable: the call stops
 * holding when the regime moves off the label it was made under, or when the
 * week it covers runs out.
 *
 * Without that floor, such an entry emitted an empty `invalidated_by`, which
 * STD-07 reads as a belief that cannot be revised, only replaced. It is also
 * what the published conformance checker at ethotechnics.org actually held this
 * stream at Level 1 for — not the missing `depends_on` this file used to blame.
 */
const conditionsFromAssumptions = (
  entry: DecisionMemoryEntry,
  checkUrl: string,
): InvalidationCondition[] => {
  const assumptions = entry.assumptions;
  const conditions: InvalidationCondition[] = [];
  if (assumptions) {
    const tightnessSide = assumptions.tightness >= assumptions.tightnessThreshold ? "below" : "at or above";
    const riskSide = assumptions.riskAppetite >= assumptions.riskAppetiteThreshold ? "below" : "at or above";
    conditions.push({
      condition: `tightness moves ${tightnessSide} the ${assumptions.tightnessThreshold} regime boundary (recorded ${assumptions.tightness})`,
      check: checkUrl,
      clock: "P7D",
    });
    conditions.push({
      condition: `risk appetite moves ${riskSide} the ${assumptions.riskAppetiteThreshold} regime boundary (recorded ${assumptions.riskAppetite})`,
      check: checkUrl,
      clock: "P7D",
    });
  }
  const reversalTrigger = entry.outcome.reversalTrigger?.trim();
  if (reversalTrigger) {
    conditions.push({ condition: reversalTrigger, check: checkUrl, clock: "P7D" });
  }
  if (conditions.length === 0) {
    conditions.push({
      condition: `the operating regime moves off ${entry.regime.label}, or the week this call covers ends`,
      check: checkUrl,
      clock: "P7D",
    });
  }
  return conditions;
};

const describeDecision = (entry: DecisionMemoryEntry): string => {
  const decision = entry.decision;
  if (!decision) return "operating posture";
  return `${decision.category} / ${decision.action} (${decision.lifecycle})`;
};

const buildUnsealedRecords = (entry: DecisionMemoryEntry, baseUrl: string): UnsealedRecord[] => {
  const kind = entry.kind ?? "decision";
  const origin = `${baseUrl}/history`;
  const checkUrl = `${baseUrl}/api/weekly`;
  const asOf = asOfFromRecordDate(entry.context.recordDate);
  const time = { as_of: asOf, recorded_at: entry.createdAt, valid_until: addDays(asOf, 7) };
  const actor = entry.owner
    ? { id: entry.owner, kind: "human" as const, on_behalf_of: entry.context.clientId }
    : {
        id: kind === "decision" ? "whether-decision-shield" : "whether-weekly-brief",
        kind: "service" as const,
        on_behalf_of: entry.context.clientId,
      };
  const contest = {
    standing: "the operator who recorded the entry, or anyone on their team",
    channel: origin,
    reversal_clock: "P7D",
  };
  const regimeId = `whether:belief:${entry.id}:regime`;
  const scores = Object.entries(entry.regime.scores)
    .filter((pair): pair is [string, number] => typeof pair[1] === "number")
    .map(([name, value]) => `${name}=${value}`)
    .join(", ");

  const regimeRecord: UnsealedRecord = {
    schema_version: REVISABLE_DELEGATION_RECORD_SCHEMA_VERSION,
    record_id: regimeId,
    kind: "belief",
    system: { id: "whether", version: WHETHER_VERSION, origin },
    actor,
    subject: "operating regime",
    summary: `Operating regime recorded: ${entry.regime.label}${scores ? ` (${scores})` : ""}.`,
    time,
    content: {
      proposition: `The operating regime in force is ${entry.regime.label}.`,
      evidence: entry.sources,
    },
    depends_on: [],
    invalidated_by: conditionsFromAssumptions({ ...entry, outcome: { ...entry.outcome, reversalTrigger: "" } }, checkUrl),
    visibility: "private",
    contest,
  };

  if (kind === "posture-snapshot") {
    return [
      {
        ...regimeRecord,
        record_id: `whether:belief:${entry.id}:call`,
        subject: "weekly operating call",
        summary: entry.outcome.summary,
        content: {
          proposition: entry.outcome.summary,
          evidence: entry.sources,
          guardrail: entry.outcome.guardrail || undefined,
          reversal_trigger: entry.outcome.reversalTrigger || undefined,
        },
        depends_on: [],
        invalidated_by: conditionsFromAssumptions(entry, checkUrl),
      },
    ];
  }

  const decisionRecord: UnsealedRecord = {
    ...regimeRecord,
    record_id: `whether:belief:${entry.id}:decision`,
    subject: describeDecision(entry),
    summary: entry.outcome.summary,
    content: {
      proposition: `Under ${entry.regime.label}, ${describeDecision(entry)} is ${entry.outcome.verdict ?? "unassessed"}: ${entry.outcome.summary}`,
      evidence: entry.sources,
      verdict: entry.outcome.verdict,
      guardrail: entry.outcome.guardrail || undefined,
      reversal_trigger: entry.outcome.reversalTrigger || undefined,
    },
    depends_on: [regimeId],
    invalidated_by: conditionsFromAssumptions(entry, checkUrl),
  };

  return [regimeRecord, decisionRecord];
};


/**
 * Export entries as a chained stream, oldest first. `priorHash` seeds the
 * chain when the caller is continuing a stream it exported earlier.
 */
export const toRevisableDelegationRecords = async (
  entries: DecisionMemoryEntry[],
  options: { baseUrl: string; priorHash?: string },
): Promise<WhetherRevisableDelegationRecord[]> => {
  const ordered = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const sealed: WhetherRevisableDelegationRecord[] = [];
  let priorHash = options.priorHash;

  for (const entry of ordered) {
    for (const unsealed of buildUnsealedRecords(entry, options.baseUrl)) {
      const hash = await hashRecord(unsealed);
      const integrity = priorHash
        ? { algorithm: "sha256" as const, hash, prior_hash: priorHash }
        : { algorithm: "sha256" as const, hash };
      sealed.push({ ...unsealed, integrity });
      priorHash = hash;
    }
  }

  return sealed;
};

export const toRevisableDelegationNdjson = (records: WhetherRevisableDelegationRecord[]) =>
  records.map((record) => JSON.stringify(record)).join("\n") + (records.length ? "\n" : "");
