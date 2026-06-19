import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RegimeCommandBar } from "../app/components/RegimeCommandBar";
import { WeeklyDecisionCard } from "../app/components/weeklyDecisionCard";
import type { ReportDynamics } from "../lib/report/reportData";
import { buildWeeklyDecisionCardModel } from "./factories/weeklyDecisionCardModel";

const reportDynamics: ReportDynamics = {
  directionLabel: "deteriorating",
  totalSignalChanges: 1,
  regimeChanged: false,
  changedSignals: [{ key: "tightness", label: "Cash tightness", delta: 2 }],
  anomalySignals: [],
};

describe("home route render contract", () => {
  it("keeps one primary weekly summary block above fold in the homepage decision stack", () => {
    // Route-level homepage contract: one command bar + one weekly summary block, no duplicate summaries.
    const html = renderToStaticMarkup(
      <>
        <RegimeCommandBar
          regime="DEFENSIVE"
          call="Stage approvals and protect runway."
          doNow={["Pause net-new fixed burn commitments this week."]}
          flipConditions={["Flip when tightness falls below 65 and holds."]}
          updatedAt="Mar 8, 2026"
        />
        <WeeklyDecisionCard
          model={buildWeeklyDecisionCardModel({
            status: {
              statusLabel: "DEFENSIVE",
              trendLabel: "Deteriorating",
            },
            decision: {
              operatingStanceLine: "Stage approvals and protect runway.",
              weeklyMemoLines: ["Signals tightened this week."],
              netConstraintSummary: "Pressure elevated",
              guardrail: "Guardrail",
              reversalTrigger: "Flip trigger",
              actionNowShort: "Pause net-new fixed burn commitments this week.",
              reportDynamics,
              canonicalDecisionCopy: {
                currentRegimeLabel: "Defensive — Watchful",
                operatingCall: "Stage approvals and protect runway.",
                doNowLines: ["Pause net-new fixed burn commitments this week."],
                flipTrigger: "Flip when tightness falls below 65 and holds.",
                flipConditions: ["Tightness < 65"],
              },
            },
            diagnostics: {
              regimeSignalIndicators: [],
              evidenceItems: [],
            },
            history: {
              memoryRail: [],
              historicalTimeline: [],
              historicalAnalogs: [],
              lastYearComparison: null,
              macroOverlay: [],
            },
            artifact: {
              citation: "Citation",
              recordDateLabel: "Mar 7, 2026",
              fetchedAtLabel: "Mar 8, 2026",
            },
          })}
        />
      </>,
    );

    const canonicalOrders = html.match(/aria-label=\"Weekly decision order\"/g) ?? [];
    const shareArtifacts = html.match(/Why this call/g) ?? [];
    assert.equal(canonicalOrders.length, 1);
    assert.equal(shareArtifacts.length, 1);
  });

  it("keeps the active / route wired through the v2 homepage decision contract", () => {
    const rootRouteSource = readFileSync("app/page.tsx", "utf8");
    const v2RouteSource = readFileSync("app/v2/page.tsx", "utf8");

    assert.match(rootRouteSource, /import Page, \{ generateMetadata, revalidate, runtime \} from "\.\/v2\/page"/);
    assert.match(rootRouteSource, /export default Page/);
    assert.match(v2RouteSource, /data-testid="weekly-top-fold"/);
    assert.match(v2RouteSource, /lg:grid-cols-12/);
    assert.match(v2RouteSource, /lg:grid-cols-4/);

    const scalarIndex = v2RouteSource.indexOf("Boldness window:");
    const revisitIndex = v2RouteSource.indexOf("Revisit queue");
    const guardrailIndex = v2RouteSource.indexOf("Watch:");
    const memoryIndex = v2RouteSource.indexOf("Posture trend:");
    const trustStripIndex = v2RouteSource.indexOf("<DeltaTrustStrip");

    assert.ok(scalarIndex >= 0, "active v2 route exposes the canonical scalar");
    assert.ok(revisitIndex > scalarIndex, "active v2 route exposes the revisit decision state after scalar");
    assert.ok(guardrailIndex > revisitIndex, "active v2 route exposes bounded guardrails after revisit state");
    assert.ok(memoryIndex > guardrailIndex, "active v2 route exposes memory rail after guardrails");
    assert.ok(trustStripIndex > memoryIndex, "active v2 route keeps the compact trust strip after the decision contract");
  });

});
