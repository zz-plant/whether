import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONTENT_MEASUREMENT_ENDPOINT,
  buildContentMeasurementReport,
  isContentMeasurementEvent,
  trackContentCtaConversion,
  type ContentMeasurementEvent,
} from "../lib/contentMeasurement";

describe("buildContentMeasurementReport", () => {
  it("aggregates entrances, CTA conversions, assisted paths, and intent counts", () => {
    const events: ContentMeasurementEvent[] = [
      { pagePath: "/resources/how-vc-firms-can-enforce-capital-discipline-across-portfolios", cluster: "vc", intent: "vc-partner", type: "organic_entrance" },
      { pagePath: "/resources/how-vc-firms-can-enforce-capital-discipline-across-portfolios", cluster: "vc", intent: "vc-partner", type: "decision_block_view" },
      { pagePath: "/resources/how-vc-firms-can-enforce-capital-discipline-across-portfolios", cluster: "vc", intent: "vc-partner", type: "weekly_brief_handoff" },
      { pagePath: "/resources/how-vc-firms-can-enforce-capital-discipline-across-portfolios", cluster: "vc", intent: "vc-partner", type: "cta_conversion", ctaId: "request" },
      { pagePath: "/resources/operator-posture-standardization-case-example-product-finance", cluster: "vc", intent: "vp-product", type: "cta_conversion", ctaId: "download" },
      { pagePath: "/resources/capital-posture-template", cluster: "tool", intent: "cfo", type: "organic_entrance" },
      { pagePath: "/resources/capital-posture-template", cluster: "tool", intent: "cfo", type: "operations_handoff" },
      { pagePath: "/resources/capital-posture-template", cluster: "tool", intent: "cfo", type: "artifact_interaction", artifactAction: "copy" },
      { pagePath: "/resources/capital-posture-template", cluster: "tool", intent: "cfo", type: "assisted_conversion", internalPath: "/resources/how-vc-firms-can-enforce-capital-discipline-across-portfolios -> /resources/capital-posture-template" },
    ];

    const report = buildContentMeasurementReport(events);

    assert.equal(report.organicEntrancesByCluster.vc, 1);
    assert.equal(report.organicEntrancesByCluster.tool, 1);
    assert.equal(report.ctaConversionsByPage["/resources/how-vc-firms-can-enforce-capital-discipline-across-portfolios"], 1);
    assert.equal(report.ctaConversionsByCluster.vc, 2);
    assert.equal(
      report.assistedConversionsByInternalPath[
        "/resources/how-vc-firms-can-enforce-capital-discipline-across-portfolios -> /resources/capital-posture-template"
      ],
      1,
    );
    assert.equal(report.eventsByIntent["vc-partner"], 4);
    assert.equal(report.eventsByIntent.cfo, 4);
    assert.equal(report.decisionBlockViewsByPage["/resources/how-vc-firms-can-enforce-capital-discipline-across-portfolios"], 1);
    assert.equal(report.weeklyBriefHandoffsByPage["/resources/how-vc-firms-can-enforce-capital-discipline-across-portfolios"], 1);
    assert.equal(report.operationsHandoffsByPage["/resources/capital-posture-template"], 1);
    assert.equal(report.artifactInteractionsByAction.copy, 1);
    assert.equal(report.decisionReadySessionsEstimateByPage["/resources/how-vc-firms-can-enforce-capital-discipline-across-portfolios"], 1);
  });


  it("validates content measurement telemetry payloads", () => {
    assert.equal(
      isContentMeasurementEvent({
        pagePath: "/",
        cluster: "tool",
        intent: "board",
        type: "cta_conversion",
        ctaId: "homepage_top_fold_copy_weekly_brief",
      }),
      true,
    );

    assert.equal(
      isContentMeasurementEvent({
        pagePath: "",
        cluster: "tool",
        intent: "board",
        type: "cta_conversion",
      }),
      false,
    );

    assert.equal(
      isContentMeasurementEvent({
        pagePath: "/operations",
        cluster: "tool",
        intent: "board",
        type: "artifact_interaction",
      }),
      false,
    );
  });

});


describe("trackContentCtaConversion", () => {
  it("falls back to fetch when sendBeacon cannot queue payload", async () => {
    const originalNavigator = globalThis.navigator;
    const originalFetch = globalThis.fetch;

    let fetchCalls = 0;

    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        sendBeacon: () => false,
      },
    });

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      fetchCalls += 1;
      assert.equal(String(input), CONTENT_MEASUREMENT_ENDPOINT);
      return new Response(null, { status: 204 });
    }) as typeof fetch;

    try {
      trackContentCtaConversion({
        pagePath: "/",
        cluster: "tool",
        intent: "board",
        ctaId: "hero-copy",
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.equal(fetchCalls, 1);
    } finally {
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: originalNavigator,
      });
      globalThis.fetch = originalFetch;
    }
  });
});
