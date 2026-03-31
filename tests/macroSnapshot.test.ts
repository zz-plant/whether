import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadMacroSeries } from "../lib/macroSnapshot";

const buildFredCsv = (rows: string[]) => `DATE,VALUE\n${rows.join("\n")}\n`;

describe("loadMacroSeries", () => {
  it("computes CPI as year-over-year percentage and loads Tier 1 live data", async () => {
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
                    { year: "2026", period: "M02", value: "310.0" },
                    { year: "2026", period: "M01", value: "309.0" },
                    { year: "2025", period: "M12", value: "308.0" },
                    { year: "2025", period: "M11", value: "307.0" },
                    { year: "2025", period: "M02", value: "300.0" },
                    { year: "2025", period: "M01", value: "299.0" },
                    { year: "2024", period: "M12", value: "297.0" },
                    { year: "2024", period: "M11", value: "296.0" },
                  ],
                },
              ],
            },
          }), { status: 200 });
        }

        return new Response(JSON.stringify({
          Results: {
            series: [
              {
                data: [
                  { year: "2026", period: "M02", value: "4.0" },
                  { year: "2026", period: "M01", value: "4.1" },
                  { year: "2025", period: "M12", value: "4.2" },
                  { year: "2025", period: "M11", value: "4.3" },
                ],
              },
            ],
          },
        }), { status: 200 });
      }

      if (url.includes("BAMLH0A0HYM2")) {
        return new Response(buildFredCsv([
          "2025-12-29,4.10",
          "2026-01-12,4.00",
          "2026-02-11,3.95",
          "2026-03-05,3.90",
        ]), { status: 200 });
      }

      if (url.includes("NFCI")) {
        return new Response(buildFredCsv([
          "2025-12-19,-0.08",
          "2026-01-16,-0.10",
          "2026-02-13,-0.11",
          "2026-03-13,-0.12",
        ]), { status: 200 });
      }

      if (url.includes("VIXCLS")) {
        return new Response(buildFredCsv([
          "2025-12-30,16.20",
          "2026-01-15,17.40",
          "2026-02-14,18.60",
          "2026-03-10,19.80",
        ]), { status: 200 });
      }

      return new Response(buildFredCsv([
        "2025-12-30,2.30",
        "2026-01-20,2.20",
        "2026-02-18,2.15",
        "2026-03-11,2.10",
      ]), { status: 200 });
    };

    const series = await loadMacroSeries(fetcher);
    const cpi = series.find((reading) => reading.id === "CPI_YOY");
    const hy = series.find((reading) => reading.id === "HY_CREDIT_SPREAD");
    const fci = series.find((reading) => reading.id === "CHICAGO_FCI");
    const vix = series.find((reading) => reading.id === "VIX_INDEX");
    const unemployment = series.find((reading) => reading.id === "UNEMPLOYMENT_RATE");

    if (!cpi || !hy || !fci || !vix || !unemployment) {
      throw new Error("Missing expected macro series");
    }

    assert.equal(cpi.record_date, "2026-02-01");
    const cpiValue = cpi.value ?? Number.NaN;
    assert.ok(Math.abs(cpiValue - 3.3333333333) < 0.0001);
    assert.equal(hy.value, 3.9);
    assert.equal(fci.value, -0.12);
    assert.equal(vix.value, 19.8);
    assert.equal(unemployment.value, 4.0);
    assert.equal(hy.isLive, true);
    assert.equal(fci.isLive, true);
    assert.equal(vix.isLive, true);
    assert.deepEqual(cpi.history?.map((point) => point.date), ["2025-11-01", "2025-12-01", "2026-01-01", "2026-02-01"]);
    assert.deepEqual(unemployment.history?.map((point) => point.date), ["2025-11-01", "2025-12-01", "2026-01-01", "2026-02-01"]);
    assert.deepEqual(hy.history?.map((point) => point.date), ["2025-12-29", "2026-01-12", "2026-02-11", "2026-03-05"]);
    assert.deepEqual(fci.history?.map((point) => point.date), ["2025-12-19", "2026-01-16", "2026-02-13", "2026-03-13"]);
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
