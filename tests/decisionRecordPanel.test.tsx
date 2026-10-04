import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DecisionLedgerView } from "../app/decisions/decisionRecordPanel";
import { buildDecisionRecordView } from "../lib/report/decisionRecordView";
import type { DecisionMemoryEntry } from "../lib/decisionMemory";

const entry = (
  id: string,
  recorded: { tightness: number; riskAppetite: number },
  overrides: Partial<DecisionMemoryEntry> = {},
): DecisionMemoryEntry => ({
  id,
  createdAt: "2026-09-14T00:00:00.000Z",
  context: { clientId: "client", recordDate: "2026-09-14" },
  decision: { lifecycle: "GROWTH", category: "HIRING", action: "HIRE" },
  outcome: {
    verdict: "SAFE",
    summary: "Hire the two open roles.",
    guardrail: "Pause above 85.",
    reversalTrigger: "Re-open below 65.",
  },
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

const current = { tightness: 60, riskAppetite: 40 };

describe("DecisionLedgerView status filters", () => {
  it("renders empty state when there are no decisions", () => {
    const view = buildDecisionRecordView([], current);
    const html = renderToStaticMarkup(<DecisionLedgerView view={view} />);

    assert.match(html, /Nothing recorded from this browser yet\./);
    assert.doesNotMatch(html, /Filter decisions by status/);
  });

  it("renders filter chips with counts for available statuses", () => {
    const view = buildDecisionRecordView(
      [
        entry("both-moved", { tightness: 10, riskAppetite: 90 }), // RECONSIDER
        entry("one-moved", { tightness: 10, riskAppetite: 10 }),  // WATCH
        entry("stands", { tightness: 90, riskAppetite: 10 }),     // STAND
      ],
      current,
    );
    const html = renderToStaticMarkup(<DecisionLedgerView view={view} />);

    assert.match(html, /All \(3\)/);
    assert.match(html, /Reconsider \(1\)/);
    assert.match(html, /Watch \(1\)/);
    assert.match(html, /Stand \(1\)/);
    assert.match(html, /aria-label="Filter decisions by status"/);
    assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
    assert.equal((html.match(/aria-pressed="false"/g) ?? []).length, 3);
  });

  it("omits filter chips for statuses with count 0", () => {
    const view = buildDecisionRecordView(
      [entry("stands-only", { tightness: 90, riskAppetite: 10 })],
      current,
    );
    const html = renderToStaticMarkup(<DecisionLedgerView view={view} />);

    assert.match(html, /All \(1\)/);
    assert.match(html, /Stand \(1\)/);
    assert.doesNotMatch(html, /Reconsider/);
    assert.doesNotMatch(html, /Watch/);
  });
});
