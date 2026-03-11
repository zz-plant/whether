import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDecideClusterMetadata } from "../app/decide/[slug]/[cluster]/page";
import { buildSignalDecisionScenarioMetadata } from "../app/signals/[cluster]/[decision-scenario]/page";
import { buildToolkitClusterMetadata } from "../app/toolkits/[slug]/[cluster]/page";

describe("cluster template metadata eligibility", () => {
  it("forces noindex for degraded freshness/provenance on canonical decide routes", () => {
    const metadata = buildDecideClusterMetadata({
      slug: "ceo",
      cluster: "capital-raising",
      roleTitle: "CEO",
      roleDescription: "Protect runway and optionality.",
      scenarioTitle: "Capital raising",
      isCanonical: true,
      payload: {
        degraded: true,
        noindex: true,
        noindexReasons: ["freshness-stale", "provenance-missing-or-degraded"],
      },
    });

    assert.deepEqual(metadata.robots, { index: false, follow: true });
  });

  it("keeps non-canonical decide routes as noindex even when payload is eligible", () => {
    const metadata = buildDecideClusterMetadata({
      slug: "ceo",
      cluster: "hiring",
      roleTitle: "CEO",
      roleDescription: "Protect runway and optionality.",
      scenarioTitle: "Hiring",
      isCanonical: false,
      payload: {
        degraded: false,
        noindex: false,
        noindexReasons: [],
      },
    });

    assert.deepEqual(metadata.robots, { index: false, follow: true });
  });

  it("forces noindex for degraded signal/scenario pages", () => {
    const metadata = buildSignalDecisionScenarioMetadata({
      cluster: "capital-tightness-watch",
      decisionScenario: "hiring",
      signalTitle: "Capital tightness watch",
      signalSummary: "Financing and spend pressure signal.",
      scenarioTitle: "Hiring",
      payload: {
        degraded: true,
        noindex: true,
        noindexReasons: ["freshness-stale"],
      },
    });

    assert.deepEqual(metadata.robots, { index: false, follow: true });
  });

  it("forces noindex for degraded freshness/provenance on canonical toolkit routes", () => {
    const metadata = buildToolkitClusterMetadata({
      slug: "focus",
      cluster: "capital-tightness-watch",
      toolkitTitle: "Focus toolkit",
      decisionThisSession: "Tighten scope.",
      contextTitle: "Capital tightness watch",
      isCanonical: true,
      payload: {
        degraded: false,
        noindex: false,
        noindexReasons: ["provenance-missing-or-degraded"],
      },
    });

    assert.deepEqual(metadata.robots, { index: false, follow: true });
  });

  it("keeps canonical toolkit pages indexable when payload is eligible", () => {
    const metadata = buildToolkitClusterMetadata({
      slug: "focus",
      cluster: "capital-tightness-watch",
      toolkitTitle: "Focus toolkit",
      decisionThisSession: "Tighten scope.",
      contextTitle: "Capital tightness watch",
      isCanonical: true,
      payload: {
        degraded: false,
        noindex: false,
        noindexReasons: [],
      },
    });

    assert.equal(metadata.robots, undefined);
  });
});
