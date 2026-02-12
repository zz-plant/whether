import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadMacroSeries } from "../lib/macroSnapshot";

describe("loadMacroSeries", () => {
  it("computes CPI as year-over-year percentage when live data is available", async () => {
    const fetcher: typeof fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("bls.gov")) {
        return new Response(
          JSON.stringify({
            Results: {
              series: [
                {
                  data: [
                    { year: "2025", period: "M02", value: "310.0" },
                    { year: "2024", period: "M02", value: "300.0" },
                    { year: "2025", period: "M01", value: "309.0" },
                    { year: "2024", period: "M01", value: "299.0" },
                  ],
                },
              ],
            },
          }),
          { status: 200 },
        );
      }

      return new Response("DATE,BAA10Y\n2025-02-01,2.10\n", { status: 200 });
    }) as typeof fetch;

    const series = await loadMacroSeries(fetcher);
    const cpi = series.find((reading) => reading.id === "CPI_YOY");

    if (!cpi) {
      throw new Error("Missing CPI_YOY series");
    }

    assert.equal(cpi.record_date, "2025-02-01");
    const cpiValue = cpi.value ?? Number.NaN;
    assert.ok(Math.abs(cpiValue - 3.3333333333) < 0.0001);
  });
});
