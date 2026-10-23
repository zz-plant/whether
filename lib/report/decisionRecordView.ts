/**
 * The reader's own decision ledger, judged against this week's reading.
 *
 * Every piece of this existed and none of it was reachable from a browser.
 * `assessDecisionStaleness` has returned STAND / WATCH / RECONSIDER since it was
 * written; `evaluateDecisionAssumptionHealth` already handles entries recorded
 * before assumption snapshots existed; `/api/decision-memory` has stored, listed
 * and exported the ledger in a citable shape the whole time. Its only consumers
 * were the CLI, the MCP server and the alert evaluator — so the product that
 * publishes a call and the record behind it could not show a reader the record
 * of their own calls.
 *
 * This module is the view between the two, and it lives here rather than in the
 * component for the reason `lib/report/AGENTS.md` gives: a verdict label that
 * means the same thing on the page, in an alert and in an export is written once.
 *
 * Nothing here invents a reading. A row is derived from what the entry recorded
 * and what the current assessment says; an entry whose supporting conditions
 * never moved says so rather than manufacturing a change to report.
 */
import {
  evaluateDecisionAssumptionHealth,
  type DecisionMemoryEntry,
} from "../decisionMemory";
import type { DecisionFollowUpRecord, DecisionFollowUpResponse } from "../decisionFollowUp";
import type { MovedAssumption, StalenessVerdict } from "./decisionStaleness";

/**
 * The latest recorded review response on a row, joined by entry id. Carries
 * both the ISO `recordDate` (so a surface can tell whether this commitment was
 * reviewed against this week's reading) and the formatted `respondedOn`.
 */
type DecisionFollowUpRow = {
  response: DecisionFollowUpResponse;
  /** The plain-language half of the response, in the row's own vocabulary. */
  responseSentence: string;
  /** The ISO reading date the response was made against. */
  recordDate: string;
  /** "Sep 21, 2026" — the reading the response was made against. */
  respondedOn: string;
  note: string | null;
};

export type DecisionRecordRow = {
  id: string;
  /** "Sep 14, 2026" — the reading the decision was made against, not when it was typed. */
  recordedOn: string;
  /** The same reading as an ISO date, for anything that places the decision on the record's timeline. */
  recordDate: string;
  /** What was decided, in the reader's words. */
  title: string;
  verdict: StalenessVerdict;
  /** The plain-language half of the badge. The verdict word alone is a label, not a sentence. */
  verdictSentence: string;
  why: string;
  moved: MovedAssumption[];
  guardrail: string | null;
  reversalTrigger: string | null;
  /** The latest review response recorded against this row, when one exists. */
  followUp?: DecisionFollowUpRow;
  /** A weekly posture logged from the brief, rather than a decision run through the shield. */
  isPostureSnapshot: boolean;
};

export type DecisionRecordView = {
  rows: DecisionRecordRow[];
  counts: { stand: number; watch: number; reconsider: number };
  /** One sentence for the top of the page. Never a count of zero dressed as news. */
  headline: string;
};

export type CurrentConditions = {
  tightness: number;
  riskAppetite: number;
};

/*
 * The verdict word is the product's own vocabulary and stays. What it cannot do
 * is stand alone: "WATCH" tells a reader the shape of the answer and not the
 * answer, which is the failure docs/agents/lessons/tests-and-copy-rules.md records for the scores on the cold
 * pages. Each badge carries a sentence a first-time reader can act on.
 */
const VERDICT_SENTENCES: Record<StalenessVerdict, string> = {
  STAND: "The conditions this rested on still hold.",
  WATCH: "One condition this rested on has moved.",
  RECONSIDER: "Both conditions this rested on have moved.",
};

/*
 * The response vocabulary, beside the badge the way VERDICT_SENTENCES sits
 * beside the verdict word. The reader records what they did about a commitment
 * whose conditions moved; the sentence is the half that a reader can act on.
 */
const RESPONSE_SENTENCES: Record<DecisionFollowUpResponse, string> = {
  continued: "You kept the commitment as recorded.",
  changed: "You changed the terms.",
  deferred: "You put the decision off.",
};

/** The choice labels, in the order a reader reads them. */
export const RESPONSE_OPTIONS: Array<{ value: DecisionFollowUpResponse; label: string }> = [
  { value: "continued", label: "Continued" },
  { value: "changed", label: "Changed" },
  { value: "deferred", label: "Deferred" },
];

/** Deliberately not `new Date(recordDate)`: an ISO date is parsed as UTC and a
    browser west of Greenwich renders the day before. */
const formatRecordedOn = (recordDate: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(recordDate);
  if (!match) return recordDate;
  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number.isNaN(parsed.getTime())) return recordDate;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
};

/**
 * What the entry was about, preferring what the reader chose over what the
 * engine concluded.
 *
 * A posture snapshot has no decision, so its summary *is* the call and reads
 * correctly as a title. A decision has a category and an action the reader
 * picked from two dropdowns, which identifies the row far better than the
 * verdict sentence every HIRING row would otherwise share.
 */
const buildTitle = (entry: DecisionMemoryEntry): string => {
  const decision = entry.decision;
  if (!decision) return entry.outcome.summary;

  const action = decision.action.replace(/_/g, " ").toLowerCase();
  const category = decision.category.replace(/_/g, " ").toLowerCase();
  const title = `${action} — ${category}`;
  return title.charAt(0).toUpperCase() + title.slice(1);
};

const nonEmpty = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const buildDecisionRecordRow = (
  entry: DecisionMemoryEntry,
  current: CurrentConditions,
): DecisionRecordRow => {
  const health = evaluateDecisionAssumptionHealth({
    entry,
    currentTightness: current.tightness,
    currentRiskAppetite: current.riskAppetite,
  });

  return {
    id: entry.id,
    recordedOn: formatRecordedOn(entry.context.recordDate),
    recordDate: entry.context.recordDate,
    title: buildTitle(entry),
    verdict: health.verdict,
    verdictSentence: VERDICT_SENTENCES[health.verdict],
    why: health.reason,
    moved: health.moved ?? [],
    guardrail: nonEmpty(entry.outcome.guardrail),
    reversalTrigger: nonEmpty(entry.outcome.reversalTrigger),
    isPostureSnapshot: entry.kind === "posture-snapshot",
  };
};

/**
 * The latest review response per entry, so a row whose commitment was reviewed
 * against an earlier reading still shows it, and a newer response wins.
 */
const latestFollowUpByEntry = (followUps: DecisionFollowUpRecord[]): Map<string, DecisionFollowUpRecord> => {
  const latest = new Map<string, DecisionFollowUpRecord>();
  const newestFirst = [...followUps].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  for (const followUp of newestFirst) {
    if (!latest.has(followUp.entryId)) latest.set(followUp.entryId, followUp);
  }
  return latest;
};

/**
 * The headline states what is actionable, and says nothing when nothing is.
 *
 * An empty ledger gets no headline at all — the page's empty state is the
 * message there, and a "0 decisions need attention" banner is the warning about
 * data that is fine which docs/agents/lessons/tests-and-copy-rules.md records teaches a reader to ignore the next
 * one.
 */
const buildHeadline = (counts: DecisionRecordView["counts"], total: number): string => {
  if (total === 0) return "";

  const needsAttention = counts.watch + counts.reconsider;
  if (needsAttention === 0) {
    return total === 1
      ? "The one decision on this browser still rests on conditions that hold."
      : `All ${total} decisions on this browser still rest on conditions that hold.`;
  }

  const subject = needsAttention === 1 ? "1 decision rests" : `${needsAttention} decisions rest`;
  return `${subject} on conditions that have moved since ${needsAttention === 1 ? "it was" : "they were"} recorded.`;
};

/*
 * Ordered by what needs attention rather than by date, because the page answers
 * "what should I revisit?" — the fourth question AGENTS.md says the product
 * exists to answer. Within a verdict, newest first.
 */
const VERDICT_ORDER: Record<StalenessVerdict, number> = { RECONSIDER: 0, WATCH: 1, STAND: 2 };

export const buildDecisionRecordView = (
  entries: DecisionMemoryEntry[],
  current: CurrentConditions,
  followUps: DecisionFollowUpRecord[] = [],
): DecisionRecordView => {
  const latestByEntry = latestFollowUpByEntry(followUps);
  const rows = entries.map((entry) => {
    const row = buildDecisionRecordRow(entry, current);
    const latest = latestByEntry.get(entry.id);
    if (latest) {
      row.followUp = {
        response: latest.response,
        responseSentence: RESPONSE_SENTENCES[latest.response],
        recordDate: latest.context.recordDate,
        respondedOn: formatRecordedOn(latest.context.recordDate),
        note: nonEmpty(latest.note),
      };
    }
    return row;
  });

  const counts = { stand: 0, watch: 0, reconsider: 0 };
  for (const row of rows) {
    if (row.verdict === "RECONSIDER") counts.reconsider += 1;
    else if (row.verdict === "WATCH") counts.watch += 1;
    else counts.stand += 1;
  }

  const ordered = [...rows].sort((left, right) => {
    const byVerdict = VERDICT_ORDER[left.verdict] - VERDICT_ORDER[right.verdict];
    if (byVerdict !== 0) return byVerdict;
    return right.recordedOn.localeCompare(left.recordedOn);
  });

  return { rows: ordered, counts, headline: buildHeadline(counts, rows.length) };
};
