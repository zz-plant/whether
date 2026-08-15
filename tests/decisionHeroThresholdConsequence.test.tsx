import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DecisionHero } from "../app/components/DecisionHero";
import type { ThresholdBusinessConsequence } from "../lib/report/operatingCalls";

const renderHero = (thresholdBusinessConsequence: ThresholdBusinessConsequence) => renderToStaticMarkup(
  <DecisionHero
    tightness={52}
    tightnessDelta={1}
    riskAppetite={60}
    riskAppetiteDelta={0}
    boldnessScore={48}
    boldnessDelta={-1}
    weeklyCall="Keep approvals staged."
    regime="DEFENSIVE"
    postureLabel="Contraction"
    signalDirection="tighten"
    recordDate="Aug 15, 2026"
    fetchedAt="Aug 15, 2026"
    guardrail="Pause at the bounded threshold."
    thresholdBusinessConsequence={thresholdBusinessConsequence}
  />,
);

describe("DecisionHero threshold consequence", () => {
  it("renders one affected decision as a one-line numeric consequence", () => {
    const html = renderHero({ pointsToThreshold: 3, consequenceLabel: "hiring review", status: "approaching" });
    assert.match(html, />3 points until hiring review</);
    assert.doesNotMatch(html, /pts to pause/);
  });

  it("renders only the selected consequence for a shared threshold", () => {
    const html = renderHero({ pointsToThreshold: 4, consequenceLabel: "expansion pauses", status: "approaching" });
    assert.match(html, />4 points until expansion pauses</);
    assert.doesNotMatch(html, /hiring review/);
  });

  it("renders an already-crossed threshold without dropping its zero-distance state", () => {
    const html = renderHero({ pointsToThreshold: 0, consequenceLabel: "hiring review", status: "crossed" });
    assert.match(html, />0 points — hiring review threshold crossed</);
    assert.doesNotMatch(html, />0 points until/);
  });
});
