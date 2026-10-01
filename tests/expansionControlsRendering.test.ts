import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { buildActionsExpansionHref } from "../app/operate/page";

describe("expansion controls rendering", () => {
  it("persists /planning expansion state through query params", () => {
    const href = buildActionsExpansionHref({ year: "2025", month: "2" }, true);

    assert.equal(href, "/operate?year=2025&month=2&actions=all#ops-playbook");
    assert.equal(
      buildActionsExpansionHref({ year: "2025", month: "2", actions: "all" }, false),
      "/operate?year=2025&month=2#ops-playbook",
    );
  });

  it("shows the top three of each list until asked for all of them", () => {
    /* The per-area rows left this panel for the weekly plan's AreaTable on
       2026-09-22; what is left is the do/don't/limit lists and the leadership
       phrases behind a native disclosure. */
    const props = {
      playbook: null,
      stopItems: ["Stop 1", "Stop 2", "Stop 3", "Stop 4"],
      startItems: ["Start 1", "Start 2", "Start 3", "Start 4"],
      fenceItems: ["Fence 1", "Fence 2", "Fence 3", "Fence 4"],
    };
    const { RulesBeforeCommit } = require("../app/operate/components/rulesBeforeCommit");
    const top3 = renderToStaticMarkup(require("react").createElement(RulesBeforeCommit, { ...props, showAll: false }));
    assert.match(top3, /Stop 3/);
    assert.doesNotMatch(top3, /Stop 4/, "the fourth item needs the expansion control");
    assert.match(top3, /aria-expanded="false"/);

    const all = renderToStaticMarkup(require("react").createElement(RulesBeforeCommit, { ...props, showAll: true }));
    assert.match(all, /Stop 4/);
    assert.match(all, /aria-expanded="true"/);
  });

  it("tabulates each area's lines with a distance instead of reprinting the corridor per area", () => {
    const { buildCanonicalBoundedDecisionRules } = require("../lib/report/boundedDecisionRules");
    const { buildActionStripItems } = require("../lib/report/operatingCalls");
    const { buildAreaRows } = require("../app/operate/areaRows");
    const { AreaTable } = require("../app/components/ui/areaTable");
    const scores = { tightness: 32, riskAppetite: 52 };
    const rules = buildCanonicalBoundedDecisionRules({
      regime: "EXPANSION",
      thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      scores,
    });
    const rows = buildAreaRows(buildActionStripItems(rules, scores));
    const html = renderToStaticMarkup(require("react").createElement(AreaTable, { rows, caption: "test" }));

    assert.match(html, /<table/);
    assert.match(html, /Funding pressure &gt; 76/);
    assert.match(html, /pts away/);
    // The sentence form is not printed once the lines are tabulated.
    assert.doesNotMatch(html, /Pause net-new hiring if funding pressure rises above/);
    // The qualifier is part of the rule: the roadmap row also pauses on two weak readings.
    assert.match(html, /or two weekly readings in a row come in weaker/);
    assert.match(html, /and the weekly reading holds or improves/);
  });

  it("links each area row to the answer the homepage offers for that area", () => {
    const { buildCanonicalBoundedDecisionRules } = require("../lib/report/boundedDecisionRules");
    const { buildActionStripItems } = require("../lib/report/operatingCalls");
    const { buildAreaRows } = require("../app/operate/areaRows");
    const { findLeadAnswerForArea } = require("../app/answers/decisionPages");
    const scores = { tightness: 32, riskAppetite: 52 };
    const rules = buildCanonicalBoundedDecisionRules({
      regime: "EXPANSION",
      thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      scores,
    });
    const rows = buildAreaRows(buildActionStripItems(rules, scores));

    assert.equal(rows.length, 5);
    for (const row of rows) {
      const lead = findLeadAnswerForArea(row.area);
      assert.ok(lead, `no lead answer for ${row.area}`);
      assert.equal(row.href, `/answers/${lead.slug}`, `${row.area} links a different answer than the homepage`);
    }
  });

});
