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

  it("keeps the active / route carrying the homepage decision contract", () => {
    const routeSource = readFileSync("app/page.tsx", "utf8");

    assert.match(routeSource, /data-testid="weekly-top-fold"/);
    assert.match(routeSource, /lg:grid-cols-12/);
    assert.match(routeSource, /lg:grid-cols-\[1fr_18rem\]/);

    const scalarIndex = routeSource.indexOf("Posture shift:");
    const revisitIndex = routeSource.indexOf(">Revisit<");
    const guardrailIndex = routeSource.indexOf("Watch:");
    const memoryIndex = routeSource.indexOf("memoryItems.join");
    const trustStripIndex = routeSource.indexOf("<DeltaTrustStrip");

    assert.ok(scalarIndex >= 0, "active route exposes the canonical scalar");
    assert.ok(revisitIndex > scalarIndex, "active route exposes the revisit decision state after scalar");
    assert.ok(guardrailIndex > revisitIndex, "active route exposes bounded guardrails after revisit state");
    assert.ok(memoryIndex > guardrailIndex, "active route exposes memory rail after guardrails");
    assert.ok(trustStripIndex > memoryIndex, "active route keeps the compact trust strip after the decision contract");
  });

});
