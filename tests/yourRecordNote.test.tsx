import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RecordNote, YourRecordNote } from "../app/components/home/YourRecordNote";
import type { DecisionMemoryEntry } from "../lib/decisionMemory";
import { buildDecisionRecordView } from "../lib/report/decisionRecordView";

/*
 * The decision record was written, tested and reachable from the footer and the command palette
 * only: the brief that says which conditions moved never said which of the reader's own decisions
 * rested on them. The note is the join, in the record's own sentence, and it is silent for a
 * browser with nothing recorded.
 */
const entry = (id: string, recorded: { tightness: number; riskAppetite: number }): DecisionMemoryEntry => ({
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
});

const current = { tightness: 60, riskAppetite: 40 };

describe("the record note", () => {
  it("says which of the reader's decisions rest on conditions that moved, and links to the rows", () => {
    const view = buildDecisionRecordView([entry("moved", { tightness: 10, riskAppetite: 90 }), entry("holds", { tightness: 90, riskAppetite: 10 })], current);
    const html = renderToStaticMarkup(<RecordNote view={view} />);

    assert.match(html, /Your record:/);
    assert.match(html, /1 decision rests on conditions that have moved since it was recorded\./);
    assert.match(html, /<a[^>]+href="\/decisions"[^>]*>See your decision record<\/a>/);
    assert.match(html, /data-needs-attention="true"/);
  });

  it("says so once when everything still holds, in the same sentence the record page uses", () => {
    const view = buildDecisionRecordView([entry("a", { tightness: 90, riskAppetite: 10 }), entry("b", { tightness: 95, riskAppetite: 5 })], current);
    const html = renderToStaticMarkup(<RecordNote view={view} />);

    assert.match(html, /All 2 decisions on this browser still rest on conditions that hold\./);
    assert.match(html, /data-needs-attention="false"/);
    assert.ok(html.includes(view.headline), "the note prints the record's own headline, so the two cannot disagree");
  });

  it("renders nothing for an empty record", () => {
    assert.equal(renderToStaticMarkup(<RecordNote view={buildDecisionRecordView([], current)} />), "");
  });

  it("renders nothing before the browser has been read, which is all a server can know", () => {
    assert.equal(renderToStaticMarkup(<YourRecordNote tightness={60} riskAppetite={40} />), "");
  });

  /* `app/page.tsx` suspends at its data boundary offline, so what it composes is asserted at source. */
  it("sits under the call on a live brief and on no archived week", () => {
    const page = readFileSync("app/page.tsx", "utf8");
    const mount = page.indexOf("<YourRecordNote");

    assert.ok(mount > page.indexOf("<SinceLastVisit"), "under the returning-visitor strip, not above the call");
    /* The picker, not the first fold attribute: the horizon and confidence row
       above the call folds on a first visit too, and everything folded below
       the call comes after the picker. */
    assert.ok(mount < page.indexOf("<DecisionPicker"), "in the first block, where the reader who has a record looks");
    assert.match(page.slice(mount - 40, mount), /!historicalSelection \?/, "an archived week is not compared with today's decisions");
  });
});
