import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildContentMeasurementReport, type ContentMeasurementEvent } from "../lib/contentMeasurement";

describe("buildContentMeasurementReport", () => {
  it("aggregates entrances, CTA conversions, assisted paths, and intent counts", () => {
    const events: ContentMeasurementEvent[] = [
      { pagePath: "/resources/how-vc-firms-can-enforce-capital-discipline-across-portfolios", cluster: "vc", intent: "vc-partner", type: "organic_entrance" },
      { pagePath: "/resources/how-vc-firms-can-enforce-capital-discipline-across-portfolios", cluster: "vc", intent: "vc-partner", type: "cta_conversion", ctaId: "request" },
      { pagePath: "/resources/operator-posture-standardization-case-example-product-finance", cluster: "vc", intent: "vp-product", type: "cta_conversion", ctaId: "download" },
      { pagePath: "/resources/capital-posture-template", cluster: "tool", intent: "cfo", type: "organic_entrance" },
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
    assert.equal(report.eventsByIntent["vc-partner"], 2);
    assert.equal(report.eventsByIntent.cfo, 2);
  });
});
