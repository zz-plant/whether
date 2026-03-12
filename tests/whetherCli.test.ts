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

  it("status forwards asOf and supported params materially change output", async () => {
    const requests: string[] = [];
    const server = http.createServer((req, res) => {
      requests.push(req.url ?? "");
      if ((req.url ?? "").startsWith("/api/cli/status")) {
        const url = new URL(req.url ?? "/", "http://localhost");
        const asOf = url.searchParams.get("asOf");
        const body = asOf
          ? {
              version: "v1",
              regime: "Historical",
              cyclePhase: "Late",
              confidence: { label: "LOW", score: 41 },
              trend: "deteriorating",
              decisionStability: "unstable",
              updatedAt: asOf,
              call: { summary: "historical summary", do: ["hold"], avoid: ["expand"], flipConditions: ["n/a"] },
            }
          : {
              version: "v1",
              regime: "Current",
              cyclePhase: "Now",
              confidence: { label: "HIGH", score: 93 },
              trend: "stable",
              decisionStability: "stable",
              updatedAt: "live",
              call: { summary: "live summary", do: ["go"], avoid: ["wait"], flipConditions: ["n/a"] },
            };
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(body));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };

    const baseArgs = [CLI_PATH, "status", "--api-base-url", `http://127.0.0.1:${port}`, "--json"];
    const live = spawnSync("node", baseArgs, { encoding: "utf8" });
    const historical = spawnSync("node", [...baseArgs, "--as-of", "2024-07"], { encoding: "utf8" });

    server.close();

    assert.equal(live.status, 0);
    assert.equal(historical.status, 0);
    assert.match(live.stdout, /"updatedAt": "live"/);
    assert.match(historical.stdout, /"updatedAt": "2024-07"/);
    assert.ok(requests.some((url) => url === "/api/cli/status"));
    assert.ok(requests.some((url) => url.includes("/api/cli/status?asOf=2024-07")));
  });


  it("maps auth category with remediation and preserves cause", async () => {
    const server = http.createServer((req, res) => {
      if ((req.url ?? "").startsWith("/api/cli/status")) {
        res.writeHead(401, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "unauthorized" }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };
    const result = spawnSync("node", [CLI_PATH, "status", "--api-base-url", `http://127.0.0.1:${port}`], { encoding: "utf8" });
    server.close();

    assert.equal(result.status, 2);
    assert.match(result.stderr, /auth: Authentication failed\./);
    assert.match(result.stderr, /WHETHER_TOKEN/);
    assert.match(result.stderr, /whether auth login --token <token>/);
    assert.match(result.stderr, /Cause: HTTP 401 for \/api\/cli\/status/);
  });

  it("maps forbidden category with remediation and preserves cause", async () => {
    const server = http.createServer((req, res) => {
      if ((req.url ?? "").startsWith("/api/cli/status")) {
        res.writeHead(403, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "forbidden" }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };
    const result = spawnSync("node", [CLI_PATH, "status", "--api-base-url", `http://127.0.0.1:${port}`], { encoding: "utf8" });
    server.close();

    assert.equal(result.status, 2);
    assert.match(result.stderr, /forbidden: Access denied by API\./);
    assert.match(result.stderr, /--token/);
    assert.match(result.stderr, /Cause: HTTP 403 for \/api\/cli\/status/);
  });

  it("maps rate limit category with remediation and preserves cause", async () => {
    const server = http.createServer((req, res) => {
      if ((req.url ?? "").startsWith("/api/cli/status")) {
        res.writeHead(429, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "too_many_requests" }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };
    const result = spawnSync("node", [CLI_PATH, "status", "--api-base-url", `http://127.0.0.1:${port}`], { encoding: "utf8" });
    server.close();

    assert.equal(result.status, 1);
    assert.match(result.stderr, /rate limit: Request quota exceeded\./);
    assert.match(result.stderr, /--watch --interval 120/);
    assert.match(result.stderr, /Cause: HTTP 429 for \/api\/cli\/status/);
  });

  it("maps server fault category with remediation and preserves cause", async () => {
    const server = http.createServer((req, res) => {
      if ((req.url ?? "").startsWith("/api/cli/status")) {
        res.writeHead(503, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "downstream_unavailable" }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };
    const result = spawnSync("node", [CLI_PATH, "status", "--api-base-url", `http://127.0.0.1:${port}`], { encoding: "utf8" });
    server.close();

    assert.equal(result.status, 1);
    assert.match(result.stderr, /server fault: API returned 503\./);
    assert.match(result.stderr, /whether doctor/);
    assert.match(result.stderr, /\/api\/health/);
    assert.match(result.stderr, /Cause: HTTP 503 for \/api\/cli\/status/);
  });

  it("maps network category with remediation and preserves original fetch cause", () => {
    const result = spawnSync(
      "node",
      [CLI_PATH, "status", "--api-base-url", "http://127.0.0.1:1"],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /network: Unable to reach Whether API\./);
    assert.match(result.stderr, /WHETHER_API_URL/);
    assert.match(result.stderr, /--api-base-url/);
    assert.match(result.stderr, /Cause:/);
  });

  it("drops unsupported flags from status while preserving supported query params", async () => {
    const requests: string[] = [];
    const server = http.createServer((req, res) => {
      requests.push(req.url ?? "");
      if ((req.url ?? "").startsWith("/api/cli/status")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          version: "v1",
          regime: "Guarded",
          cyclePhase: "Late",
          confidence: { label: "MED", score: 66 },
          trend: "Deteriorating",
          decisionStability: "unstable",
          updatedAt: "2026-03",
          call: { summary: "Stage decisions", do: ["Do x"], avoid: ["Avoid y"], flipConditions: ["tightness < 60"] },
        }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };
    const result = spawnSync(
      "node",
      [CLI_PATH, "status", "--api-base-url", `http://127.0.0.1:${port}`, "--as-of", "2026-03", "--company", "acme", "--stage", "series-a"],
      { encoding: "utf8" },
    );
    server.close();

    assert.equal(result.status, 0);
    assert.ok(requests.some((url) => url.includes('/api/cli/status?asOf=2026-03')));
    assert.ok(requests.every((url) => !url.includes('company=') && !url.includes('stage=')));
  });

  it("forwards command-specific query params for status and history", async () => {
    const requests: string[] = [];
    const server = http.createServer((req, res) => {
      requests.push(req.url ?? "");
      if ((req.url ?? "").startsWith("/api/cli/status")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          version: "v1",
          view: "expanded",
          regime: "Guarded",
          cyclePhase: "Late",
          confidence: { label: "MED", score: 66 },
          trend: "Deteriorating",
          decisionStability: "unstable",
          updatedAt: "2026-03-12T12:00:00.000Z",
          freshness: { line: "Updated 2026-03-12T12:00:00.000Z · live · mixed-reliability" },
          call: { summary: "Stage decisions", do: ["Do x"], avoid: ["Avoid y"], flipConditions: ["tightness < 60"] },
          boundedDecision: {
            guardrailThreshold: "Keep fixed-cost approvals staged.",
            reversalTrigger: "Re-open only after two confirming reads.",
            flipConditionsCompact: ["tightness < 60"],
            topDeltas: [{ metric: "tightness", direction: "down", delta: -1.5 }],
          },
          degraded: false,
        }));
        return;
      }
      if ((req.url ?? "").startsWith("/api/cli/history")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          version: "v1",
          generatedAt: new Date().toISOString(),
          requestedWeeks: 8,
          windowWeeks: 8,
          maxWeeks: 52,
          truncatedToMax: false,
          history: [{ recordDate: "2026-03-10", regime: "Guarded", confidenceLabel: "MED", trend: "stable" }],
          degraded: false,
        }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };
    const statusResult = spawnSync("node", [CLI_PATH, "status", "--verbose", "--as-of", "2026-03", "--api-base-url", `http://127.0.0.1:${port}`], { encoding: "utf8" });
    const historyResult = spawnSync("node", [CLI_PATH, "history", "--weeks", "8", "--as-of", "2026-03", "--api-base-url", `http://127.0.0.1:${port}`], { encoding: "utf8" });
    server.close();

    assert.equal(statusResult.status, 0);
    assert.equal(historyResult.status, 0);
    assert.ok(requests.some((url) => url.includes('/api/cli/status?asOf=2026-03&view=expanded')));
    assert.ok(requests.some((url) => url.includes('/api/cli/history?asOf=2026-03&weeks=8')));
  });

  it("history forwards weeks to API and prints server-bounded metadata", async () => {
    const requests: string[] = [];
    const server = http.createServer((req, res) => {
      requests.push(req.url ?? "");
      if ((req.url ?? "").startsWith("/api/cli/history")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            version: "v1",
            generatedAt: new Date().toISOString(),
            requestedWeeks: 99,
            windowWeeks: 52,
            maxWeeks: 52,
            truncatedToMax: true,
            history: [{ recordDate: "2026-03-10", regime: "Guarded", confidenceLabel: "MED", trend: "stable" }],
            degraded: false,
          }),
        );
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };
    const result = spawnSync("node", [CLI_PATH, "history", "--weeks", "99", "--api-base-url", `http://127.0.0.1:${port}`], { encoding: "utf8" });
    server.close();

    assert.equal(result.status, 0);
    assert.ok(requests.some((url) => url.includes("/api/cli/history?weeks=99")));
    assert.match(result.stdout, /max 52/);
  });

  it("sends only route-supported query parameters per command", async () => {
    const requests: string[] = [];
    const server = http.createServer((req, res) => {
      requests.push(req.url ?? "");
      if ((req.url ?? "").startsWith("/api/cli/call")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ call: "Guarded", leadershipShould: ["Constrain hiring"], watch: ["labor softening"], updatedAt: "2026-03", confidence: { label: "MED" }, degraded: false }));
        return;
      }
      if ((req.url ?? "").startsWith("/api/cli/changes")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ changed: [], revisit: [], flip: [], updatedAt: "2026-03", confidence: { label: "MED" }, degraded: false }));
        return;
      }
      if ((req.url ?? "").startsWith("/api/cli/diagnostics")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ topDrivers: [], generatedAt: "2026-03", degraded: false }));
        return;
      }
      if ((req.url ?? "").startsWith("/api/cli/regime")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ regime: "Guarded", phase: "Late", confidence: "MED", trend: "Stable", interpretation: "Risk-adjusted posture.", degraded: false }));
        return;
      }
      if ((req.url ?? "").startsWith("/api/cli/history")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ version: "v1", generatedAt: "2026-03", requestedWeeks: 4, windowWeeks: 4, maxWeeks: 52, truncatedToMax: false, history: [], degraded: false }));
        return;
      }
      if ((req.url ?? "").startsWith("/api/cli/scenario")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ postureBefore: "Before", postureAfter: "After", inputs: { tightness: 10, riskAppetite: 20 } }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };
    const base = ["--api-base-url", `http://127.0.0.1:${port}`];

    const commands = [
      ["call", "--as-of", "2026-03", "--weeks", "5", "--company", "acme"],
      ["changes", "--as-of", "2026-03", "--weeks", "5", "--stage", "seed"],
      ["diagnostics", "--as-of", "2026-03", "--company", "acme"],
      ["regime", "--as-of", "2026-03", "--weeks", "5"],
      ["history", "--as-of", "2026-03", "--weeks", "4", "--company", "acme"],
      ["scenario", "--tightness", "10", "--risk-appetite", "20", "--as-of", "2026-03", "--company", "acme"],
    ];

    for (const commandArgs of commands) {
      const result = spawnSync("node", [CLI_PATH, ...commandArgs, ...base], { encoding: "utf8" });
      assert.equal(result.status, 0, `command failed: ${commandArgs.join(" ")} :: ${result.stderr}`);
    }
    server.close();

    const findRequest = (prefix: string) => requests.find((url) => url.startsWith(prefix)) ?? "";

    assert.equal(findRequest("/api/cli/call"), "/api/cli/call?asOf=2026-03");
    assert.equal(findRequest("/api/cli/changes"), "/api/cli/changes?asOf=2026-03");
    assert.equal(findRequest("/api/cli/diagnostics"), "/api/cli/diagnostics?asOf=2026-03");
    assert.equal(findRequest("/api/cli/regime"), "/api/cli/regime?asOf=2026-03");
    assert.equal(findRequest("/api/cli/history"), "/api/cli/history?asOf=2026-03&weeks=4");
    assert.equal(findRequest("/api/cli/scenario"), "/api/cli/scenario?tightness=10&risk-appetite=20");
  });




});
