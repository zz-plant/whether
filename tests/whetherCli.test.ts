import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { spawnSync } from "node:child_process";
import path from "node:path";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";

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




  it("install fails in non-interactive shells without --yes/--ci", () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "whether-cli-home-"));
    const result = spawnSync("node", [CLI_PATH, "install"], { encoding: "utf8", env: { ...process.env, HOME: homeDir } });
    fs.rmSync(homeDir, { recursive: true, force: true });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Non-interactive shell detected/);
    assert.match(result.stderr, /--yes/);
  });

  it("install supports --ci and writes config for automation", () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "whether-cli-home-"));
    const install = spawnSync(
      "node",
      [CLI_PATH, "install", "--ci", "--api-base-url", "http://127.0.0.1:4321", "--token", "ci-token"],
      { encoding: "utf8", env: { ...process.env, HOME: homeDir } },
    );

    assert.equal(install.status, 0);

    const readConfig = spawnSync("node", [CLI_PATH, "config", "--json"], {
      encoding: "utf8",
      env: { ...process.env, HOME: homeDir },
    });

    fs.rmSync(homeDir, { recursive: true, force: true });

    assert.equal(readConfig.status, 0);
    const parsed = JSON.parse(readConfig.stdout);
    assert.equal(parsed.api_base_url, "http://127.0.0.1:4321");
    assert.equal(parsed.token, "ci-token");
  });

  it("prints semantic version with --version", () => {
    const result = spawnSync("node", [CLI_PATH, "--version"], { encoding: "utf8" });
    assert.equal(result.status, 0);
    assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+$/);
    assert.equal(result.stderr, "");
  });

  it("ping reports healthy API for smoke checks", async () => {
    const server = http.createServer((req, res) => {
      if ((req.url ?? "").startsWith("/api/health")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };
    const result = spawnSync("node", [CLI_PATH, "ping", "--api-base-url", `http://127.0.0.1:${port}`, "--json"], { encoding: "utf8" });
    server.close();

    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.status, "ok");
    assert.equal(result.stderr, "");
  });

  it("smoke brief --json stays machine-readable without stderr noise", async () => {
    const server = http.createServer((req, res) => {
      if ((req.url ?? "").startsWith("/api/brief")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            brief: "Weekly operator brief\n- Stage fixed-cost approvals.",
            generatedAt: "2026-03-12T12:00:00.000Z",
          }),
        );
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };
    const result = spawnSync("node", [CLI_PATH, "brief", "--api-base-url", `http://127.0.0.1:${port}`, "--json"], { encoding: "utf8" });
    server.close();

    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.match(parsed.brief, /Weekly operator brief/);
    assert.match(parsed.brief, /Stage fixed-cost approvals/);
    assert.equal(result.stderr, "");
    assert.doesNotMatch(result.stdout, /\u001b\[/);
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
    assert.match(result.stderr, /auth: Authentication failed \(missing key\)\./);
    assert.match(result.stderr, /WHETHER_API_KEY/);
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
    assert.match(result.stderr, /forbidden: Access denied by API \(invalid scope\)\./);
    assert.match(result.stderr, /WHETHER_API_KEY/);
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

    assert.equal(result.status, 7);
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

    assert.equal(result.status, 7);
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

    assert.equal(result.status, 6);
    assert.match(result.stderr, /network: Unable to reach Whether API\./);
    assert.match(result.stderr, /WHETHER_API_URL/);
    assert.match(result.stderr, /--api-base-url/);
    assert.match(result.stderr, /Cause:/);
  });



  it("ping maps auth failures to auth exit semantics", async () => {
    const server = http.createServer((req, res) => {
      if ((req.url ?? "").startsWith("/api/health")) {
        res.writeHead(401, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "unauthorized" }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };
    const result = spawnSync("node", [CLI_PATH, "ping", "--api-base-url", `http://127.0.0.1:${port}`], { encoding: "utf8" });
    server.close();

    assert.equal(result.status, 2);
    assert.match(result.stderr, /auth: Authentication failed \(missing key\)\./);
  });

  it("maps expired and invalid API key errors with actionable remediation", async () => {
    const server = http.createServer((req, res) => {
      if ((req.url ?? "").startsWith("/api/cli/status")) {
        const auth = req.headers.authorization ?? "";
        if (auth.includes("expired-token")) {
          res.writeHead(401, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "token_expired" }));
          return;
        }
        res.writeHead(401, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_token" }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };

    const expired = spawnSync("node", [CLI_PATH, "status", "--api-base-url", `http://127.0.0.1:${port}`], {
      encoding: "utf8",
      env: { ...process.env, WHETHER_API_KEY: "expired-token" },
    });
    const invalid = spawnSync("node", [CLI_PATH, "status", "--api-base-url", `http://127.0.0.1:${port}`], {
      encoding: "utf8",
      env: { ...process.env, WHETHER_API_KEY: "invalid-token" },
    });
    server.close();

    assert.equal(expired.status, 2);
    assert.match(expired.stderr, /auth: Authentication failed \(expired key\)\./);
    assert.match(expired.stderr, /Token expired\./);
    assert.equal(invalid.status, 2);
    assert.match(invalid.stderr, /auth: Authentication failed \(invalid key\)\./);
    assert.match(invalid.stderr, /Token is invalid\./);
  });

  it("auth login accepts WHETHER_API_KEY in env when --token is omitted", () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "whether-cli-home-"));
    const login = spawnSync("node", [CLI_PATH, "auth", "login"], {
      encoding: "utf8",
      env: { ...process.env, HOME: homeDir, WHETHER_API_KEY: "env-api-key" },
    });

    const status = spawnSync("node", [CLI_PATH, "auth", "status", "--json"], {
      encoding: "utf8",
      env: { ...process.env, HOME: homeDir },
    });

    fs.rmSync(homeDir, { recursive: true, force: true });

    assert.equal(login.status, 0);
    assert.equal(status.status, 0);
    const parsed = JSON.parse(status.stdout);
    assert.equal(parsed.authenticated, true);
    assert.equal(parsed.source, "config");
  });

  it("auth status returns machine-readable output and clear exit codes", () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "whether-cli-home-"));
    const missing = spawnSync("node", [CLI_PATH, "auth", "status", "--json"], {
      encoding: "utf8",
      env: { ...process.env, HOME: homeDir },
    });

    const withEnv = spawnSync("node", [CLI_PATH, "auth", "status", "--json"], {
      encoding: "utf8",
      env: { ...process.env, HOME: homeDir, WHETHER_API_KEY: "present" },
    });

    fs.rmSync(homeDir, { recursive: true, force: true });

    assert.equal(missing.status, 2);
    const missingParsed = JSON.parse(missing.stdout);
    assert.equal(missingParsed.authenticated, false);
    assert.equal(missingParsed.source, "none");

    assert.equal(withEnv.status, 0);
    const envParsed = JSON.parse(withEnv.stdout);
    assert.equal(envParsed.authenticated, true);
    assert.equal(envParsed.source, "env");
  });

  it("ping maps network failures to network exit semantics", () => {
    const result = spawnSync("node", [CLI_PATH, "ping", "--api-base-url", "http://127.0.0.1:1"], { encoding: "utf8" });

    assert.equal(result.status, 6);
    assert.match(result.stderr, /network: Unable to reach Whether API\./);
  });

  it("surfaces unsupported query params from API for status", async () => {
    const server = http.createServer((req, res) => {
      if ((req.url ?? "").startsWith("/api/cli/status")) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "Unsupported query parameters." }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };
    const result = spawnSync(
      "node",
      [CLI_PATH, "status", "--api-base-url", `http://127.0.0.1:${port}`, "--company", "acme"],
      { encoding: "utf8" },
    );
    server.close();

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Request failed \(400\)/);
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

  it("status --verbose requests expanded contract and renders bounded decision section", async () => {
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
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };
    const result = spawnSync("node", [CLI_PATH, "status", "--verbose", "--api-base-url", `http://127.0.0.1:${port}`], { encoding: "utf8" });
    server.close();

    assert.equal(result.status, 0);
    assert.ok(requests.some((url) => url.includes("/api/cli/status?view=expanded")));
    assert.match(result.stdout, /Bounded Decision:/);
  });

});
