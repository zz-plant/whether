import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadMacroSeries } from "../lib/macroSnapshot";

const buildFredCsv = (rows: string[]) => `DATE,VALUE\n${rows.join("\n")}\n`;

describe("loadMacroSeries", () => {
  it("computes CPI as year-over-year percentage and loads Tier 1 live data", async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = String(input);

      if (url.includes("api.bls.gov")) {
        return new Response(JSON.stringify({
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
        }), { status: 200 });
      }

      if (url.includes("BAMLH0A0HYM2")) {
        return new Response(buildFredCsv(["2025-02-01,3.90"]), { status: 200 });
      }

      if (url.includes("NFCI")) {
        return new Response(buildFredCsv(["2025-02-01,-0.12"]), { status: 200 });
      }

      if (url.includes("VIXCLS")) {
        return new Response(buildFredCsv(["2025-02-01,19.80"]), { status: 200 });
      }

      return new Response(buildFredCsv(["2025-02-01,2.10"]), { status: 200 });
    };

    const series = await loadMacroSeries(fetcher);
    const cpi = series.find((reading) => reading.id === "CPI_YOY");
    const hy = series.find((reading) => reading.id === "HY_CREDIT_SPREAD");
    const fci = series.find((reading) => reading.id === "CHICAGO_FCI");
    const vix = series.find((reading) => reading.id === "VIX_INDEX");

    if (!cpi || !hy || !fci || !vix) {
      throw new Error("Missing expected macro series");
    }

    assert.equal(cpi.record_date, "2025-02-01");
    const cpiValue = cpi.value ?? Number.NaN;
    assert.ok(Math.abs(cpiValue - 3.3333333333) < 0.0001);
    assert.equal(hy.value, 3.9);
    assert.equal(fci.value, -0.12);
    assert.equal(vix.value, 19.8);
    assert.equal(hy.isLive, true);
    assert.equal(fci.isLive, true);
    assert.equal(vix.isLive, true);
  });

  it("keeps partial live coverage when one upstream series fails", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      const url = String(input);

      if (url.includes("api.bls.gov")) {
        const payload = typeof init?.body === "string" ? JSON.parse(init.body) as { seriesid?: string[] } : {};
        const seriesId = payload.seriesid?.[0];

        if (seriesId === "CUUR0000SA0") {
          return new Response(JSON.stringify({
            Results: {
              series: [
                {
                  data: [
                    { year: "2026", period: "M02", value: "310" },
                    { year: "2025", period: "M02", value: "300" },
                  ],
                },
              ],
            },
          }), { status: 200 });
        }

        return new Response("BLS unavailable", { status: 500 });
      }

      if (url.includes("id=BAA10Y")) {
        return new Response(buildFredCsv(["2026-03-01,2.1"]), { status: 200 });
      }

      return new Response("FRED unavailable", { status: 500 });
    };

    const series = await loadMacroSeries(fetcher);

    const cpi = series.find((entry) => entry.id === "CPI_YOY");
    const bbb = series.find((entry) => entry.id === "BBB_CREDIT_SPREAD");
    const unemployment = series.find((entry) => entry.id === "UNEMPLOYMENT_RATE");

    assert.equal(cpi?.isLive, true);
    assert.equal(cpi?.record_date, "2026-02-01");
    assert.equal(bbb?.isLive, true);
    assert.equal(bbb?.value, 2.1);
    assert.equal(unemployment?.isLive, false);
  });

  it("returns snapshot data when live fetch fails", async () => {
    const fetcher: typeof fetch = async () => {
      throw new Error("network unavailable");
    };

    const series = await loadMacroSeries(fetcher);
    assert.ok(series.length >= 10);
    assert.equal(series.some((entry) => entry.id === "VIX_INDEX"), true);
    assert.equal(series.every((entry) => typeof entry.id === "string"), true);
  });
});
