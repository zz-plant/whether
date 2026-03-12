import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { spawnSync } from "node:child_process";
import path from "node:path";
import http from "node:http";

const CLI_PATH = path.join(process.cwd(), "scripts", "whether-cli.mjs");

describe("whether cli", () => {
  it("prints expanded help", () => {
    const result = spawnSync("node", [CLI_PATH, "--help"], { encoding: "utf8" });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Whether CLI/);
    assert.match(result.stdout, /status/);
    assert.match(result.stdout, /export/);
    assert.match(result.stdout, /share/);
  });

  it("returns exit code 5 for invalid scenario input", () => {
    const result = spawnSync("node", [CLI_PATH, "scenario", "--tightness", "oops"], { encoding: "utf8" });
    assert.equal(result.status, 5);
  });

  it("prints subcommand help", () => {
    const result = spawnSync("node", [CLI_PATH, "call", "--help"], { encoding: "utf8" });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Usage: whether call/);
  });

  it("uses compact status by default", async () => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      assert.equal(url.pathname, "/api/cli/status");
      assert.equal(url.searchParams.get("view"), null);
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          version: "v1",
          generatedAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          regime: "Guarded Expansion",
          cyclePhase: "Mid-cycle",
          confidence: { label: "HIGH", score: 90 },
          trend: "Deteriorating",
          decisionStability: "stable",
          call: {
            summary: "Stage decisions.",
            do: ["Focus on reversible bets"],
            avoid: ["Irreversible spend"],
            flipConditions: ["tightness < 60 for 2 consecutive refreshes"],
          },
          degraded: false,
        }),
      );
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const result = spawnSync("node", [CLI_PATH, "status", "--api-base-url", `http://127.0.0.1:${port}`], { encoding: "utf8" });
    server.close();

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Whether — Current Status/);
    assert.doesNotMatch(result.stdout, /Guardrails:/);
  });

  it("requests and prints expanded status with --verbose", async () => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      assert.equal(url.pathname, "/api/cli/status");
      assert.equal(url.searchParams.get("view"), "expanded");
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          version: "v1",
          view: "expanded",
          generatedAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          regime: "Guarded Expansion",
          cyclePhase: "Mid-cycle",
          confidence: { label: "HIGH", score: 90 },
          trend: "Deteriorating",
          decisionStability: "unstable",
          call: {
            summary: "Stage decisions.",
            do: ["Focus on reversible bets"],
            avoid: ["Irreversible spend"],
          },
          guardrails: {
            threshold: "Do not approve irreversible commitments without trigger confirmation.",
            reversalTrigger: "tightness < 60 for 2 consecutive refreshes",
          },
          flipConditionsCompact: ["tightness < 60 for 2 consecutive refreshes"],
          boundedDecisionSummary: {
            action: "Focus on reversible bets",
            threshold: "Do not approve irreversible commitments without trigger confirmation.",
            reversalCondition: "risk appetite > 50 for 2 consecutive refreshes",
            topSignalDeltas: [{ metric: "tightness", delta: -6, direction: "down", impact: "positive" }],
          },
          trust: {
            cueLine: "Signal reliability HIGH · Freshness 26h · Regime shift watch ON",
            compactSummary: "Live signal reliability HIGH (26h): safe for near-term operating decisions.",
            fallback: false,
            freshness: "26h",
            provenanceStatus: "Live",
            warnings: [],
          },
          degraded: false,
        }),
      );
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const result = spawnSync("node", [CLI_PATH, "status", "--verbose", "--api-base-url", `http://127.0.0.1:${port}`], { encoding: "utf8" });
    server.close();

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Current Status \(Expanded\)/);
    assert.match(result.stdout, /Guardrails:/);
    assert.match(result.stdout, /Top signal deltas:/);
  });
});
