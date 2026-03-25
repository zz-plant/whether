import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { HomePageWorkspaceModel } from "../lib/report/homePageAssembler";
import { HomeWorkspaceBands } from "../app/components/home/homeWorkspaceBands";

const workspaceModel: HomePageWorkspaceModel = {
  sectionLinks: [],
  workspaceActions: { auditHref: "#audit-this-call", operationsHref: "#approve-this-weeks-plan" },
  audit: {
    trustStatusLabel: "Live",
    trustStatusDetail: "Fresh",
    trustStatusAction: "Use this call",
    trustStatusTone: "stable",
    trustMarkerTone: "stable",
    trustMarkerLabel: "Live",
    trustMarkerDetail: "detail",
    sourceDegraded: false,
    freshnessSummary: "Freshness: As of Mar 25, 2026",
    sourceCoverageLine: "Source coverage: Treasury live; labor snapshot",
    sourceRows: [
      { sourceName: "Treasury", modeLabel: "Live", freshnessStatus: "Fresh · Daily cadence" },
      { sourceName: "Labor", modeLabel: "Snapshot", freshnessStatus: "Stale · Monthly cadence" },
    ],
    revisitHeadline: "revisit",
    revisitDetail: "detail",
    flipHeadline: "flip",
    flipDetail: "detail",
    evidenceMovers: [],
  },
  replay: { initialDate: "2026-03-01", summary: "summary", openFullHref: "/signals", preview: [] },
  operations: {
    continueHref: "/operations",
    approvalHeadline: "approval",
    approvalDetail: "detail",
    topGuardrails: [],
    financeSnapshot: [],
    exportActions: [],
  },
  translate: {
    rolePath: { href: "/decide/ceo", title: "CEO", detail: "detail" },
    situationPath: { href: "/decide/situation", title: "Situation", detail: "detail" },
    decisionUtilities: [],
    toolkitShortcuts: [],
    browseActions: [],
  },
};

describe("HomeWorkspaceBands section composition", () => {
  it("composes audit, operations, and cadence sections with stable IDs", async () => {
    const component = await HomeWorkspaceBands({ workspaceModelPromise: Promise.resolve(workspaceModel) });
    const html = renderToStaticMarkup(component);

    assert.match(html, /id="audit-this-call"/);
    assert.match(html, /id="approve-this-weeks-plan"/);
    assert.match(html, /id="historical-replay-workspace"/);
    assert.match(html, /Freshness: As of Mar 25, 2026/);
    assert.match(html, /Source coverage: Treasury live; labor snapshot/);
    assert.match(html, /Treasury/);
    assert.match(html, /Live · Fresh · Daily cadence/);
    assert.ok(html.indexOf("audit-this-call") < html.indexOf("approve-this-weeks-plan"));
    assert.ok(html.indexOf("approve-this-weeks-plan") < html.indexOf("historical-replay-workspace"));
  });
});
