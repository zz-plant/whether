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
      "/api/image/brief?month=3&year=2026&sector=consumer&view=sector&cadence=monthly&stage=series-a&rateSensitivity=high&ticker=MSFT",
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

    assert.deepEqual(context, {
      searchParams: undefined,
      operatorContext: { companyStage: null, rateSensitivity: "medium", ticker: null },
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
      operatorContext: { companyStage: "seed", rateSensitivity: null, ticker: "GOOGL" },
    });
  });
});
