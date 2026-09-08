import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { buildDiagnosticsExpansionHref } from "../app/signals/page";
import { buildActionsExpansionHref } from "../app/operate/page";
import { getVisibleActionLaneItems } from "../app/components/appendix/playbookPanel";

describe("expansion controls rendering", () => {
  it("persists /evidence expansion state through query params", () => {
    const href = buildDiagnosticsExpansionHref({ focus: "growth", year: "2025", month: "2" }, true);

    assert.equal(href, "/signals?focus=growth&year=2025&month=2&diagnostics=all#signal-diagnostics");
  });

  it("persists /planning expansion state through query params", () => {
    const href = buildActionsExpansionHref({ year: "2025", month: "2" }, true);

    assert.equal(href, "/operate?year=2025&month=2&actions=all#ops-playbook");
  });

  it("renders PlaybookPanel collapsed by default behind disclosure", () => {
    const html = renderToStaticMarkup(
      require("react").createElement(require("../app/components/appendix/playbookPanel").PlaybookPanel, {
        playbook: null,
        stopItems: ["Stop 1", "Stop 2", "Stop 3", "Stop 4"],
        startItems: ["Start 1", "Start 2", "Start 3", "Start 4"],
        fenceItems: ["Fence 1", "Fence 2", "Fence 3", "Fence 4"],
        provenance: {
          sourceLabel: "Treasury",
          sourceUrl: "https://example.com",
          recordDateLabel: "Mar 1, 2026",
          timestampLabel: "Mar 1, 2026 12:00 UTC",
          ageLabel: "15m",
          statusLabel: "Cached (medium)",
        },
        showProvenance: false,
        actionStripItems: [],
        showAllActionLanes: false,
      }),
    );

    assert.match(html, /Deep dive: rule summary and detailed lists/);
    assert.doesNotMatch(html, /Stop 1/);
  });

  it("tabulates each area's lines with a distance instead of reprinting the corridor per area", () => {
    const { buildCanonicalBoundedDecisionRules } = require("../lib/report/boundedDecisionRules");
    const { buildActionStripItems } = require("../lib/report/operatingCalls");
    const scores = { tightness: 32, riskAppetite: 52 };
    const rules = buildCanonicalBoundedDecisionRules({
      regime: "EXPANSION",
      thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      scores,
    });
    const html = renderToStaticMarkup(
      require("react").createElement(require("../app/components/appendix/playbookPanel").PlaybookPanel, {
        playbook: null,
        stopItems: [],
        startItems: [],
        fenceItems: [],
        provenance: {
          sourceLabel: "Treasury",
          sourceUrl: "https://example.com",
          recordDateLabel: "Mar 1, 2026",
          timestampLabel: "Mar 1, 2026 12:00 UTC",
          ageLabel: "15m",
          statusLabel: "Cached (medium)",
        },
        showProvenance: false,
        actionStripItems: buildActionStripItems(rules, scores),
        showAllActionLanes: true,
        scores,
      }),
    );

    assert.match(html, /<table/);
    assert.match(html, /Funding pressure &gt; 76/);
    assert.match(html, /pts away/);
    // The sentence form is not printed once the lines are tabulated.
    assert.doesNotMatch(html, /Pause net-new hiring if funding pressure rises above/);
    // One corridor drawing, not one per area.
    assert.equal((html.match(/playbook-corridor-tightness/g) ?? []).length > 0, true);
    assert.equal((html.match(/Shared corridor/g) ?? []).length, 1);
  });

  it("returns top-3 action lanes by default and full lists when expanded", () => {
    assert.deepEqual(getVisibleActionLaneItems(["A", "B", "C", "D"], false), ["A", "B", "C"]);
    assert.deepEqual(getVisibleActionLaneItems(["A", "B", "C", "D"], true), ["A", "B", "C", "D"]);
  });
});
