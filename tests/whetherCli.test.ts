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

});
