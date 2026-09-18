import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildImageBriefApiPath,
  parseImageBriefRequestContext,
} from "../lib/report/imageBriefSearchParams";

describe("image brief search params", () => {
  it("carries only supported current params into the image API URL", () => {
    const source = new URLSearchParams({
      month: "03",
      year: "2026",
      sector: "consumer",
      view: "sector",
      cadence: "monthly",
      stage: "series-a",
      rateSensitivity: "high",
      ticker: "msft",
      utm_source: "ignore-me",
      ref: "ignore-me-too",
    });

    assert.equal(
      buildImageBriefApiPath(source),
      "/api/image/brief?month=3&year=2026&sector=consumer&view=sector&cadence=monthly&stage=series-a&ticker=MSFT",
    );
  });

  it("ignores unsupported and invalid params before assembling the home page", () => {
    const context = parseImageBriefRequestContext(new URLSearchParams({
      month: "13",
      year: "not-a-year",
      sector: "enterprise",
      view: "unknown",
      cadence: "daily",
      stage: "invalid-stage",
      sensitivity: "medium",
      company: "ACME!",
      preview: "true",
    }));

    // Rate sensitivity is no longer a context the product reads, so it no
    // longer makes an otherwise-empty context non-empty.
    assert.deepEqual(context, {
      searchParams: undefined,
      operatorContext: undefined,
    });
  });

  it("maps historical and company context aliases to assembleHomePage inputs", () => {
    const context = parseImageBriefRequestContext(new URLSearchParams({
      month: "2",
      year: "2026",
      companyStage: "seed",
      company: "googl",
    }));

    assert.deepEqual(context, {
      searchParams: { month: "2", year: "2026" },
      operatorContext: { companyStage: "seed", companyRunway: null, ticker: "GOOGL" },
    });
  });

  it("folds the legacy stage values instead of dropping the calibration", () => {
    // A shared brief link or OG image URL carrying ?stage=growth used to serialize the
    // stage through and then reject it at the context boundary, so the rendered brief
    // was stage-agnostic while the URL still named a stage.
    for (const legacy of ["growth", "public"]) {
      const source = new URLSearchParams({ stage: legacy });

      assert.equal(buildImageBriefApiPath(source), "/api/image/brief?stage=series-b");
      assert.equal(
        parseImageBriefRequestContext(source).operatorContext?.companyStage,
        "series-b",
      );
    }
  });

  it("still reads an unknown stage as no stage at all", () => {
    const source = new URLSearchParams({ stage: "pre-seed" });

    assert.equal(buildImageBriefApiPath(source), "/api/image/brief");
    assert.equal(parseImageBriefRequestContext(source).operatorContext, undefined);
  });
});
