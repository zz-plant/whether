import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildDecisionRecordView } from "../lib/report/decisionRecordView";
import type { DecisionFollowUpRecord, DecisionFollowUpResponse } from "../lib/decisionFollowUp";
import type { DecisionMemoryEntry } from "../lib/decisionMemory";

/**
 * The view between a stored decision and this week's reading.
 *
 * What it has to get right is not the arithmetic — `assessDecisionStaleness`
 * owns that and has its own tests — but the two things a reader sees: that a
 * decision whose support eroded is at the top, and that nothing on the page
 * reports a change the data does not contain.
 */

const entry = (
  id: string,
  recorded: { tightness: number; riskAppetite: number },
  overrides: Partial<DecisionMemoryEntry> = {},
): DecisionMemoryEntry => ({
  id,
  createdAt: "2026-09-14T00:00:00.000Z",
  context: { clientId: "client", recordDate: "2026-09-14" },
  decision: { lifecycle: "GROWTH", category: "HIRING", action: "HIRE" },
  outcome: { verdict: "SAFE", summary: "Hire the two open roles.", guardrail: "Pause above 85.", reversalTrigger: "Re-open below 65." },
  regime: { label: "EXPANSION", scores: {}, thresholds: undefined },
  sources: [],
  assumptions: {
    tightness: recorded.tightness,
    riskAppetite: recorded.riskAppetite,
    tightnessThreshold: recorded.tightness,
    riskAppetiteThreshold: recorded.riskAppetite,
  },
  ...overrides,
});

describe("decision record view", () => {
  it("puts what needs revisiting above what still holds", () => {
    const view = buildDecisionRecordView(
      [
        entry("stands", { tightness: 90, riskAppetite: 10 }),
        entry("both-moved", { tightness: 10, riskAppetite: 90 }),
        entry("one-moved", { tightness: 10, riskAppetite: 10 }),
      ],
      { tightness: 60, riskAppetite: 40 },
    );

    assert.deepEqual(
      view.rows.map((row) => row.id),
      ["both-moved", "one-moved", "stands"],
      "the page answers 'what should I revisit?', so date order is the wrong order",
    );
    assert.deepEqual(view.rows.map((row) => row.verdict), ["RECONSIDER", "WATCH", "STAND"]);
    assert.deepEqual(view.counts, { stand: 1, watch: 1, reconsider: 1 });
  });

  /*
   * An improving condition is not a moved assumption: a decision is stale when
   * its *support* erodes, and reporting a favourable move as a reason to
   * reconsider would teach a reader to ignore the ones that matter.
   */
  it("does not call a decision stale because conditions improved", () => {
    const view = buildDecisionRecordView([entry("improved", { tightness: 70, riskAppetite: 40 })], {
      tightness: 40,
      riskAppetite: 80,
    });

    assert.equal(view.rows[0]?.verdict, "STAND");
    assert.deepEqual(view.rows[0]?.moved, []);
  });

  // A banner reading "0 need attention" is the warning about data that is fine.
  it("says nothing at all for an empty record", () => {
    const view = buildDecisionRecordView([], { tightness: 50, riskAppetite: 50 });
    assert.equal(view.headline, "");
    assert.deepEqual(view.rows, []);
  });

  it("states what is actionable, and singular when it is one", () => {
    const one = buildDecisionRecordView(
      [entry("a", { tightness: 10, riskAppetite: 10 }), entry("b", { tightness: 90, riskAppetite: 10 })],
      { tightness: 60, riskAppetite: 40 },
    );
    assert.match(one.headline, /^1 decision rests on conditions that have moved since it was recorded\.$/);

    const none = buildDecisionRecordView([entry("a", { tightness: 90, riskAppetite: 10 })], {
      tightness: 60,
      riskAppetite: 40,
    });
    assert.match(none.headline, /still rests on conditions that hold/);
  });

  /*
   * An ISO date parsed as local time renders the day before for every reader
   * west of Greenwich, which on a record whose whole value is "the reading this
   * was decided against" is a wrong claim, not a formatting nit.
   */
  it("renders the record date as the date it says, in any time zone", () => {
    const view = buildDecisionRecordView([entry("a", { tightness: 90, riskAppetite: 10 })], {
      tightness: 60,
      riskAppetite: 40,
    });
    assert.equal(view.rows[0]?.recordedOn, "Sep 14, 2026");
  });

  it("titles a row by what the reader chose, not by what the engine concluded", () => {
    const view = buildDecisionRecordView([entry("a", { tightness: 90, riskAppetite: 10 })], {
      tightness: 60,
      riskAppetite: 40,
    });
    assert.equal(view.rows[0]?.title, "Hire — hiring");
  });

  it("carries a posture snapshot, which has no decision to title it", () => {
    const snapshot = entry("snap", { tightness: 90, riskAppetite: 10 }, {
      kind: "posture-snapshot",
      decision: undefined,
      outcome: { summary: "Cloudy — hold the line.", guardrail: "", reversalTrigger: "" },
    });

    const view = buildDecisionRecordView([snapshot], { tightness: 60, riskAppetite: 40 });
    assert.equal(view.rows[0]?.title, "Cloudy — hold the line.");
    assert.equal(view.rows[0]?.isPostureSnapshot, true);
    assert.equal(view.rows[0]?.guardrail, null, "an empty guardrail renders nothing rather than an empty label");
  });
});

const followUp = (
  entryId: string,
  createdAt: string,
  recordDate: string,
  response: DecisionFollowUpResponse,
  note?: string,
): DecisionFollowUpRecord => ({
  id: `fu-${createdAt}`,
  createdAt,
  context: { clientId: "client", recordDate },
  entryId,
  response,
  note,
  conditions: { tightness: 60, riskAppetite: 40 },
});

describe("decision record view joins the review trail", () => {
  it("carries the newest review response against a row", () => {
    const view = buildDecisionRecordView(
      [entry("a", { tightness: 10, riskAppetite: 90 })],
      { tightness: 60, riskAppetite: 40 },
      [
        followUp("a", "2026-09-21T00:00:00.000Z", "2026-09-21", "deferred"),
        followUp("a", "2026-09-28T00:00:00.000Z", "2026-09-28", "continued", "Back on track."),
      ],
    );

    assert.equal(view.rows[0]?.followUp?.response, "continued", "the latest response wins over an earlier one");
    assert.equal(view.rows[0]?.followUp?.responseSentence, "You kept the commitment as recorded.");
    assert.equal(view.rows[0]?.followUp?.recordDate, "2026-09-28", "the ISO reading is kept so a surface can tell whether this week reviewed it");
    assert.equal(view.rows[0]?.followUp?.respondedOn, "Sep 28, 2026");
    assert.equal(view.rows[0]?.followUp?.note, "Back on track.");
  });

  it("ignores a follow-up that names no entry on the record", () => {
    const view = buildDecisionRecordView(
      [entry("a", { tightness: 90, riskAppetite: 10 })],
      { tightness: 60, riskAppetite: 40 },
      [followUp("missing", "2026-09-21T00:00:00.000Z", "2026-09-21", "changed")],
    );

    assert.equal(view.rows[0]?.followUp, undefined, "an orphan review must not invent a response for a row it does not name");
  });

  it("leaves rows untouched when nothing was reviewed", () => {
    const view = buildDecisionRecordView(
      [entry("a", { tightness: 90, riskAppetite: 10 })],
      { tightness: 60, riskAppetite: 40 },
      [],
    );
    assert.equal(view.rows[0]?.followUp, undefined);
    assert.equal(view.headline, "The decision you recorded in this browser still rests on conditions that hold.");
  });
});
