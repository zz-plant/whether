import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createServer } from "node:http";

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

  it("passes --weeks through to /api/cli/history", async () => {
    const requestedUrls: string[] = [];
    const server = createServer((req, res) => {
      requestedUrls.push(req.url ?? "");
      if (req.url?.startsWith("/api/cli/history")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            version: "v1",
            generatedAt: "2026-01-01T00:00:00.000Z",
            requestedWeeks: 5,
            windowWeeks: 5,
            maxWeeks: 52,
            wasClamped: false,
            degraded: false,
            history: [
              { recordDate: "2026-01-01", regime: "EXPANSION", confidenceLabel: "HIGH", trend: "improving" },
            ],
          }),
        );
        return;
      }
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "not found" }));
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Failed to bind test server");

    const result = spawnSync(
      "node",
      [CLI_PATH, "history", "--weeks", "5", "--json", "--api-base-url", `http://127.0.0.1:${address.port}`],
      { encoding: "utf8" },
    );

    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));

    assert.equal(result.status, 0, result.stderr);
    assert.ok(requestedUrls.some((url) => url === "/api/cli/history?weeks=5"));

    const body = JSON.parse(result.stdout) as { requestedWeeks: number; windowWeeks: number; history: unknown[] };
    assert.equal(body.requestedWeeks, 5);
    assert.equal(body.windowWeeks, 5);
    assert.equal(body.history.length, 1);
  });
});
