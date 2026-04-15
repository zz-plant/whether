import assert from "node:assert/strict";
import { describe, it } from "bun:test";
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
    outageType: "live-data",
    outageSeverity: "advisory",
    decisionImpactWindow: "Live window active.",
    approvalBuckets: [
      { label: "Allowed now", detail: "Proceed." },
      { label: "Hold", detail: "None." },
      { label: "Blocked", detail: "None." },
    ],
    recoveryPlan: {
      owner: "CEO + Finance lead",
      nextCheckpoint: "Weekly",
      exitCondition: "Remain live.",
    },
    outageExitGate: {
      label: "Outage mode exits when 3/3 checks pass.",
      summary: "3/3 checks passed this refresh.",
      metCount: 3,
      totalCount: 3,
      criteria: [],
    },
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
    degradedSourceRows: [
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
    primaryPath: { href: "/decide/ceo", title: "CEO", detail: "detail", kicker: "Recommended path" },
    fallbackUtility: { href: "/decide/situation", title: "Situation", detail: "detail" },
    toolkitShortcuts: [],
  },
};

describe("HomeWorkspaceBands section composition", () => {
  it("composes compact planning, challenge, and optional follow-on sections with stable IDs", async () => {
    const component = await HomeWorkspaceBands({ workspaceModelPromise: Promise.resolve(workspaceModel) });
    const html = renderToStaticMarkup(component);

    assert.match(html, /id="audit-this-call"/);
    assert.match(html, /id="approve-this-weeks-plan"/);
    assert.match(html, /id="historical-replay-workspace"/);
    assert.match(html, /Turn this read into this week/);
    assert.match(html, /Open weekly plan/);
    assert.match(html, /Pressure-test the read with one check/);
    assert.match(html, /Open one evidence view, not a second dashboard\./);
    assert.match(html, /Why this week&#x27;s read moved|Why this week's read moved/);
    assert.match(html, /Open trust/);
    assert.match(html, /Open more paths/);
    assert.match(html, /Open a deeper page only after the direction is clear\./);
    assert.match(html, /Answer one question/);
    assert.match(html, /Review a past week/);
    assert.match(html, /Use a tool/);
    assert.ok(html.indexOf("approve-this-weeks-plan") < html.indexOf("audit-this-call"));
    assert.ok(html.indexOf("audit-this-call") < html.indexOf("historical-replay-workspace"));
  });
});
