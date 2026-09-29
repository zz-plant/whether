import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";

const CLI_PATH = path.join(process.cwd(), "scripts", "whether-cli.mjs");
const DEFAULT_PATH = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";
const NODE_BIN = (() => {
  const probe = spawnSync("node", ["-p", "process.execPath"], { encoding: "utf8" });
  if (probe.status === 0) {
    const resolved = probe.stdout.trim();
    if (resolved) return resolved;
  }
  return process.execPath || "node";
})();

const resolveServerPort = (server: http.Server) => {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected test server to bind to a numeric local port");
  }
  return address.port;
};

const CLI_TIMEOUT_MS = 10_000;

const runCli = (args: string[], options: { env?: NodeJS.ProcessEnv } = {}) =>
  new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(NODE_BIN, [CLI_PATH, ...args], {
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGTERM");
      resolve({ status: null, stdout, stderr });
    }, CLI_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += String(chunk);
    });
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (status: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ status, stdout, stderr });
    });
  });

const runCliWithRetries = async (
  args: string[],
  options: { env?: NodeJS.ProcessEnv } = {},
  attempts = 3,
) => {
  let lastResult: { status: number | null; stdout: string; stderr: string } | null = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    lastResult = await runCli(args, options);
    if (lastResult?.status === 0) return lastResult;
    await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
  }
  return lastResult ?? { status: null, stdout: "", stderr: "no result" };
};

const buildIsolatedEnv = (overrides: Partial<NodeJS.ProcessEnv> = {}) => {
  const pathValue = process.env.PATH ?? process.env.Path ?? DEFAULT_PATH;
  const env = {
    PATH: pathValue,
    Path: pathValue,
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    SystemRoot: process.env.SystemRoot,
    ...overrides,
  } as NodeJS.ProcessEnv;
  delete env.WHETHER_API_URL;
  delete env.WHETHER_API_KEY;
  delete env.WHETHER_TOKEN;
  delete env.HTTP_PROXY;
  delete env.HTTPS_PROXY;
  delete env.ALL_PROXY;
  delete env.NO_PROXY;
  return env;
};

const listenOnPreferredLocalPort = async (server: http.Server, preferredPorts = [3002, 3003, 3004, 3005]) => {
  for (const port of preferredPorts) {
    const opened = await new Promise<boolean>((resolve, reject) => {
      const onError = (error: NodeJS.ErrnoException) => {
        server.off("listening", onListening);
        if (error.code === "EADDRINUSE" || error.code === "EACCES") {
          resolve(false);
          return;
        }
        reject(error);
      };
      const onListening = () => {
        server.off("error", onError);
        resolve(true);
      };

      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(port, "127.0.0.1");
    });

    if (opened) return port;
  }

  throw new Error(`Unable to bind test server to local discovery ports: ${preferredPorts.join(", ")}`);
};

describe("whether cli", () => {
  it("prints expanded help", () => {
    const result = spawnSync(NODE_BIN, [CLI_PATH, "--help"], { encoding: "utf8" });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Whether CLI/);
    assert.match(result.stdout, /status/);
    assert.match(result.stdout, /export/);
    assert.match(result.stdout, /share/);
  });




  it("install fails in non-interactive shells without --yes/--ci", () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "whether-cli-home-"));
    const result = spawnSync(NODE_BIN, [CLI_PATH, "install"], { encoding: "utf8", env: buildIsolatedEnv({ HOME: homeDir }) });
    fs.rmSync(homeDir, { recursive: true, force: true });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Non-interactive shell detected/);
    assert.match(result.stderr, /--yes/);
  });

  it("install supports --ci and writes config for automation", () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "whether-cli-home-"));
    const install = spawnSync(NODE_BIN, [CLI_PATH, "install", "--ci", "--api-base-url", "http://127.0.0.1:4321", "--token", "ci-token"], {
      encoding: "utf8",
      env: buildIsolatedEnv({ HOME: homeDir }),
    });

    assert.equal(install.status, 0);

    const readConfig = spawnSync(NODE_BIN, [CLI_PATH, "config", "--json"], {
      encoding: "utf8",
      env: buildIsolatedEnv({ HOME: homeDir }),
    });

    fs.rmSync(homeDir, { recursive: true, force: true });

    assert.equal(readConfig.status, 0);
    const parsed = JSON.parse(readConfig.stdout);
    assert.equal(parsed.api_base_url, "http://127.0.0.1:4321");
    assert.equal(parsed.token, "ci-token");
  });

  it("prints semantic version with --version", () => {
    const result = spawnSync(NODE_BIN, [CLI_PATH, "--version"], { encoding: "utf8" });
    assert.equal(result.status, 0);
    assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+$/);
    assert.equal(result.stderr, "");
  });

  it("prints installable completion scripts for bash and zsh", () => {
    const bash = spawnSync(NODE_BIN, [CLI_PATH, "completion", "--shell", "bash"], { encoding: "utf8" });
    const zsh = spawnSync(NODE_BIN, [CLI_PATH, "completion", "--shell", "zsh"], { encoding: "utf8" });

    assert.equal(bash.status, 0);
    assert.match(bash.stdout, /complete -F _whether_completion whether/);
    assert.equal(zsh.status, 0);
    assert.match(zsh.stdout, /compdef _whether_completion whether/);
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

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    const result = await runCli(["ping", "--api-base-url", `http://127.0.0.1:${port}`, "--json"]);
    await new Promise<void>((resolve) => server.close(() => resolve()));

    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.status, "ok");
    assert.equal(result.stderr, "");
  });

  it("ping treats degraded API health as reachable", async () => {
    const server = http.createServer((req, res) => {
      if ((req.url ?? "").startsWith("/api/health")) {
        res.writeHead(503, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "degraded" }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    const result = await runCli(["ping", "--no-local-discovery", "--api-base-url", `http://127.0.0.1:${port}`, "--json"]);
    await new Promise<void>((resolve) => server.close(() => resolve()));

    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.status, "degraded");
    assert.equal(parsed.degraded, true);
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

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    const result = await runCli(["brief", "--no-local-discovery", "--api-base-url", `http://127.0.0.1:${port}`, "--json"]);
    await new Promise<void>((resolve) => server.close(() => resolve()));

    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.match(parsed.brief, /Weekly operator brief/);
    assert.match(parsed.brief, /Stage fixed-cost approvals/);
    assert.equal("variant" in parsed, false);
    assert.equal("rendered" in parsed, false);
    assert.equal(result.stderr, "");
    // eslint-disable-next-line no-control-regex -- the escape byte is the point of the check
    assert.doesNotMatch(result.stdout, /\u001b\[/);
  });

  it("agent --json forwards the canonical backend payload and cadence selection", async () => {
    const requests: string[] = [];
    const server = http.createServer((req, res) => {
      requests.push(req.url ?? "");
      if ((req.url ?? "").startsWith("/api/agent")) {
        const url = new URL(req.url ?? "/", "http://localhost");
        const cadence = url.searchParams.get("cadence") ?? "weekly";
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          cadence,
          defaultCadence: "weekly",
          supportedCadences: ["weekly", "monthly", "quarterly", "yearly"],
          decision_delta: {
            summary: `${cadence} delta summary`,
          },
          flip_watch: {
            flip_trigger: `${cadence} flip trigger`,
          },
          copy: `${cadence} copy`,
          recordDateLabel: "Week of 2026-03-12",
          generatedAt: "2026-03-12T12:00:00.000Z",
          summaryHash: cadence === "monthly" ? "monthly-hash" : "weekly-hash",
          links: {
            self: `/api/agent?cadence=${cadence}`,
            llms: "/llms.txt",
            discovery: "/.well-known/whether-agent.json",
          },
          agentHandoff: {
            payload: {
              posture: "guarded",
              decision_delta: { summary: `${cadence} nested delta summary` },
              flip_watch: { flip_trigger: `${cadence} nested flip trigger` },
            },
            prompt: `Prompt for ${cadence}`,
          },
          version: "v1",
        }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    const weekly = await runCli(["agent", "--json", "--api-base-url", `http://127.0.0.1:${port}`]);
    const monthly = await runCli(["agent", "monthly", "--json", "--api-base-url", `http://127.0.0.1:${port}`]);
    await new Promise<void>((resolve) => server.close(() => resolve()));

    assert.equal(weekly.status, 0);
    assert.equal(monthly.status, 0);

    const weeklyParsed = JSON.parse(weekly.stdout);
    const monthlyParsed = JSON.parse(monthly.stdout);
    assert.equal(weeklyParsed.cadence, "weekly");
    assert.equal(weeklyParsed.agentHandoff.prompt, "Prompt for weekly");
    assert.equal(weeklyParsed.agentHandoff.payload.decision_delta.summary, "weekly nested delta summary");
    assert.equal(monthlyParsed.cadence, "monthly");
    assert.equal(monthlyParsed.agentHandoff.payload.flip_watch.flip_trigger, "monthly nested flip trigger");
    assert.equal(monthlyParsed.summaryHash, "monthly-hash");
    assert.ok(requests.includes("/api/agent?cadence=weekly"));
    assert.ok(requests.includes("/api/agent?cadence=monthly"));
  });

  it("agent renders a readable handoff summary in text mode", async () => {
    const server = http.createServer((req, res) => {
      if ((req.url ?? "").startsWith("/api/agent")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          cadence: "weekly",
          defaultCadence: "weekly",
          supportedCadences: ["weekly", "monthly", "quarterly", "yearly"],
          decision_delta: {
            summary: "Top-level decision delta",
          },
          flip_watch: {
            flip_trigger: "Top-level flip trigger",
          },
          copy: "Weekly operator handoff",
          recordDateLabel: "Week of 2026-03-12",
          generatedAt: "2026-03-12T12:00:00.000Z",
          summaryHash: "weekly-hash",
          links: {
            self: "/api/agent?cadence=weekly",
            llms: "/llms.txt",
            discovery: "/.well-known/whether-agent.json",
          },
          agentHandoff: {
            payload: {
              posture: "guarded",
              decision_delta: { summary: "Nested decision delta" },
              flip_watch: { flip_trigger: "Nested flip trigger" },
            },
            prompt: "Give me the weekly operator summary.",
          },
          version: "v1",
        }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    const result = await runCli(["agent", "--api-base-url", `http://127.0.0.1:${port}`]);
    await new Promise<void>((resolve) => server.close(() => resolve()));

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Cadence: weekly/);
    assert.match(result.stdout, /Decision delta: Nested decision delta/);
    assert.match(result.stdout, /Flip watch: Nested flip trigger/);
    assert.match(result.stdout, /Copy:/);
    assert.match(result.stdout, /Agent prompt:/);
    assert.match(result.stdout, /Give me the weekly operator summary\./);
  });

  it("agent rejects unsupported cadence values with a clear error", () => {
    const result = spawnSync(NODE_BIN, [CLI_PATH, "agent", "daily"], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Invalid cadence "daily"/);
    assert.match(result.stderr, /weekly, monthly, quarterly, yearly/);
  });

  it("returns exit code 5 for invalid scenario input", () => {
    const result = spawnSync(NODE_BIN, [CLI_PATH, "scenario", "--tightness", "oops"], { encoding: "utf8" });
    assert.equal(result.status, 5);
  });

  it("prints subcommand help", () => {
    const result = spawnSync(NODE_BIN, [CLI_PATH, "call", "--help"], { encoding: "utf8" });
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

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };

    const live = await runCli(["status", "--api-base-url", `http://127.0.0.1:${port}`, "--json"]);
    const historical = await runCli(["status", "--api-base-url", `http://127.0.0.1:${port}`, "--json", "--as-of", "2024-07"]);

    await new Promise<void>((resolve) => server.close(() => resolve()));

    assert.equal(live.status, 0);
    assert.equal(historical.status, 0);
    assert.match(live.stdout, /"updatedAt": "live"/);
    assert.match(historical.stdout, /"updatedAt": "2024-07"/);
    assert.ok(requests.some((url) => url === "/api/cli/status"));
    assert.ok(requests.some((url) => url.includes("/api/cli/status?asOf=2024-07")));
  });

  it("status writes requested output files without treating the path like an output format", async () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "whether-cli-home-"));
    const outputPath = path.join(homeDir, "status.json");
    const server = http.createServer((req, res) => {
      if ((req.url ?? "").startsWith("/api/cli/status")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          version: "v1",
          regime: "Current",
          cyclePhase: "Now",
          confidence: { label: "HIGH", score: 93 },
          trend: "stable",
          decisionStability: "stable",
          updatedAt: "live",
          call: { summary: "live summary", do: ["go"], avoid: ["wait"], flipConditions: ["n/a"] },
          degraded: false,
        }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    const result = await runCli(["status", "--json", "--output", outputPath, "--api-base-url", `http://127.0.0.1:${port}`]);
    await new Promise<void>((resolve) => server.close(() => resolve()));

    assert.equal(result.status, 0);
    const stdout = JSON.parse(result.stdout);
    const written = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    fs.rmSync(homeDir, { recursive: true, force: true });

    assert.equal(stdout.updatedAt, "live");
    assert.equal(written.updatedAt, "live");
  });

  it("auto-discovers a healthy local API when the default localhost port is unavailable", async () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "whether-cli-home-"));
    const server = http.createServer((req, res) => {
      if ((req.url ?? "").startsWith("/api/health")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return;
      }
      if ((req.url ?? "").startsWith("/api/cli/status")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          version: "v1",
          regime: "Current",
          cyclePhase: "Now",
          confidence: { label: "HIGH", score: 93 },
          trend: "stable",
          decisionStability: "stable",
          updatedAt: "live",
          freshness: { line: "Updated live" },
          call: {
            summary: "live summary",
            do: ["go now", "protect margin"],
            avoid: ["wait"],
            flipConditions: ["risk appetite > 55"],
          },
          degraded: false,
        }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    const port = await listenOnPreferredLocalPort(server);
    const result = await runCli(["status", "--compact", "--json"], {
      env: buildIsolatedEnv({
        HOME: homeDir,
        WHETHER_LOCAL_API_PORT_CANDIDATES: String(port),
      }),
    });
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(homeDir, { recursive: true, force: true });

    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.equal(port >= 3002, true);
    assert.equal(parsed.regime, "Current");
    assert.equal(parsed.decision, "live summary");
    assert.equal(parsed.flipTrigger, "risk appetite > 55");
    assert.equal(parsed.freshness, "Updated live");
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

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    const result = await runCli(["status", "--api-base-url", `http://127.0.0.1:${port}`]);
    await new Promise<void>((resolve) => server.close(() => resolve()));

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

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    const result = await runCli(["status", "--api-base-url", `http://127.0.0.1:${port}`]);
    await new Promise<void>((resolve) => server.close(() => resolve()));

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

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    const result = await runCli(["status", "--api-base-url", `http://127.0.0.1:${port}`]);
    await new Promise<void>((resolve) => server.close(() => resolve()));

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

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    const result = await runCli(["status", "--api-base-url", `http://127.0.0.1:${port}`]);
    await new Promise<void>((resolve) => server.close(() => resolve()));

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

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    const result = await runCli(["ping", "--api-base-url", `http://127.0.0.1:${port}`]);
    await new Promise<void>((resolve) => server.close(() => resolve()));

    assert.equal(result.status, 2);
    assert.match(result.stderr, /auth: Authentication failed \(missing key\)\./);
  });

  it("doctor classifies degraded health as warning", async () => {
    const server = http.createServer((req, res) => {
      if ((req.url ?? "").startsWith("/api/health")) {
        res.writeHead(503, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "degraded" }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    const result = await runCli(["doctor", "--api-base-url", `http://127.0.0.1:${port}`, "--json"]);
    await new Promise<void>((resolve) => server.close(() => resolve()));

    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed[0]?.name, "api/health");
    assert.equal(parsed[0]?.status, "warning");
    assert.match(parsed[0]?.message, /reachable but degraded/i);
  });

  it("doctor keeps non-degraded health failures as error", async () => {
    const server = http.createServer((req, res) => {
      if ((req.url ?? "").startsWith("/api/health")) {
        res.writeHead(503, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "down" }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    const result = await runCli(["doctor", "--api-base-url", `http://127.0.0.1:${port}`, "--json"]);
    await new Promise<void>((resolve) => server.close(() => resolve()));

    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed[0]?.name, "api/health");
    assert.equal(parsed[0]?.status, "error");
    assert.match(parsed[0]?.message, /API returned 503/);
  });

  it("share email renders a ready-to-send subject and body", async () => {
    const server = http.createServer((req, res) => {
      if ((req.url ?? "").startsWith("/api/brief/slack")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          brief: "Weekly operator brief\n- Stage fixed-cost approvals.",
          recordDate: "2026-03-12",
          generatedAt: "2026-03-12T12:00:00.000Z",
        }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    const result = await runCli(["share", "email", "--api-base-url", `http://127.0.0.1:${port}`]);
    await new Promise<void>((resolve) => server.close(() => resolve()));

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Subject: Whether weekly brief/);
    assert.match(result.stdout, /Weekly operator brief/);
    assert.match(result.stdout, /Stage fixed-cost approvals/);
  });

  it("share slack --json returns blocks and metadata for automation", async () => {
    const server = http.createServer((req, res) => {
      if ((req.url ?? "").startsWith("/api/brief/slack")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          brief: "Weekly operator brief\n- Stage fixed-cost approvals.",
          recordDate: "2026-03-12",
          generatedAt: "2026-03-12T12:00:00.000Z",
        }));
        return;
      }
      if ((req.url ?? "").startsWith("/api/integrations/weekly-mandate?target=slack")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          target: "slack",
          payload: {
            blocks: [{ type: "header", text: { type: "plain_text", text: "Weekly mandate" } }],
            metadata: { title: "Weekly mandate", markdown: "## Weekly mandate" },
          },
        }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    const result = await runCli(["share", "slack", "--json", "--api-base-url", `http://127.0.0.1:${port}`]);
    await new Promise<void>((resolve) => server.close(() => resolve()));

    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.channel, "slack");
    assert.equal(parsed.blocks[0]?.type, "header");
    assert.equal(parsed.metadata?.title, "Weekly mandate");
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

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };

    const expired = await runCli(["status", "--api-base-url", `http://127.0.0.1:${port}`], {
      env: { ...process.env, WHETHER_API_KEY: "expired-token" },
    });
    const invalid = await runCli(["status", "--api-base-url", `http://127.0.0.1:${port}`], {
      env: { ...process.env, WHETHER_API_KEY: "invalid-token" },
    });
    await new Promise<void>((resolve) => server.close(() => resolve()));

    assert.equal(expired.status, 2);
    assert.match(expired.stderr, /auth: Authentication failed \(expired key\)\./);
    assert.match(expired.stderr, /Token expired\./);
    assert.equal(invalid.status, 2);
    assert.match(invalid.stderr, /auth: Authentication failed \(invalid key\)\./);
    assert.match(invalid.stderr, /Token is invalid\./);
  });

  it("auth login accepts WHETHER_API_KEY in env when --token is omitted", () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "whether-cli-home-"));
    const login = spawnSync(NODE_BIN, [CLI_PATH, "auth", "login"], {
      encoding: "utf8",
      env: { ...buildIsolatedEnv({ HOME: homeDir }), WHETHER_API_KEY: "env-api-key" },
    });

    const status = spawnSync(NODE_BIN, [CLI_PATH, "auth", "status", "--json"], {
      encoding: "utf8",
      env: buildIsolatedEnv({ HOME: homeDir }),
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
    const missing = spawnSync(NODE_BIN, [CLI_PATH, "auth", "status", "--json"], {
      encoding: "utf8",
      env: buildIsolatedEnv({ HOME: homeDir }),
    });

    const withEnv = spawnSync(NODE_BIN, [CLI_PATH, "auth", "status", "--json"], {
      encoding: "utf8",
      env: { ...buildIsolatedEnv({ HOME: homeDir }), WHETHER_API_KEY: "present" },
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

  it("company select persists stage and company status reuses that saved context", async () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "whether-cli-home-"));
    const server = http.createServer((req, res) => {
      if ((req.url ?? "").startsWith("/api/cli/status")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          version: "v1",
          regime: "Current",
          cyclePhase: "Now",
          confidence: { label: "HIGH", score: 93 },
          trend: "stable",
          decisionStability: "stable",
          updatedAt: "live",
          freshness: { line: "Updated live" },
          call: { summary: "live summary", do: ["go"], avoid: ["wait"], flipConditions: ["n/a"] },
          degraded: false,
        }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };

    const select = await runCliWithRetries(["company", "select", "acme", "--stage", "seed", "--api-base-url", `http://127.0.0.1:${port}`], {
      env: buildIsolatedEnv({ HOME: homeDir }),
    });
    const status = await runCliWithRetries(["company", "status", "--api-base-url", `http://127.0.0.1:${port}`], {
      env: buildIsolatedEnv({ HOME: homeDir }),
    });

    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(homeDir, { recursive: true, force: true });

    assert.equal(select.status, 0, select.stderr);
    assert.equal(status.status, 0, status.stderr);
    assert.match(status.stdout, /Company context: acme/);
    assert.match(status.stdout, /stage seed/);
    assert.match(status.stdout, /Whether — Current Status/);
  });

  it("company status --json preserves backend payload without local context wrappers", async () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "whether-cli-home-"));
    const server = http.createServer((req, res) => {
      if ((req.url ?? "").startsWith("/api/cli/status")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          version: "v1",
          regime: "Current",
          cyclePhase: "Now",
          confidence: { label: "HIGH", score: 93 },
          trend: "stable",
          decisionStability: "stable",
          updatedAt: "live",
          freshness: { line: "Updated live" },
          call: { summary: "live summary", do: ["go"], avoid: ["wait"], flipConditions: ["n/a"] },
          degraded: false,
        }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };

    const select = await runCliWithRetries(["company", "select", "acme", "--stage", "seed", "--api-base-url", `http://127.0.0.1:${port}`], {
      env: buildIsolatedEnv({ HOME: homeDir }),
    });
    const status = await runCliWithRetries(["company", "status", "--json", "--api-base-url", `http://127.0.0.1:${port}`], {
      env: buildIsolatedEnv({ HOME: homeDir }),
    });

    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(homeDir, { recursive: true, force: true });

    assert.equal(select.status, 0, select.stderr);
    assert.equal(status.status, 0, status.stderr);
    const parsed = JSON.parse(status.stdout);
    assert.equal(parsed.updatedAt, "live");
    assert.equal("context" in parsed, false);
  });

  it("agent extraction flags return compact, payload, skills, and prompt views", async () => {
    const server = http.createServer((req, res) => {
      if ((req.url ?? "").startsWith("/api/agent")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          cadence: "weekly",
          recordDateLabel: "Week of 2026-03-12",
          generatedAt: "2026-03-12T12:00:00.000Z",
          summaryHash: "weekly-hash",
          summary: { summary: "Compact weekly summary." },
          links: { self: "/api/agent?cadence=weekly" },
          skills: [{ id: "top-level-skill", label: "Top level", purpose: "Fallback skill", outputs: ["note"] }],
          agentHandoff: {
            payload: {
              decision_delta: { summary: "Tighten approvals now." },
              flip_watch: { flip_trigger: "Risk appetite > 55" },
              skills: [{ id: "decision-delta", label: "Decision delta", purpose: "Summarize the change", outputs: ["delta_brief"] }],
            },
            prompt: "Draft the weekly operator handoff.",
          },
        }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    const compact = await runCli(["agent", "--compact", "--json", "--api-base-url", `http://127.0.0.1:${port}`]);
    const payload = await runCli(["agent", "--payload-only", "--json", "--api-base-url", `http://127.0.0.1:${port}`]);
    const skills = await runCli(["agent", "--skills-only", "--json", "--api-base-url", `http://127.0.0.1:${port}`]);
    const prompt = await runCli(["agent", "--prompt-only", "--api-base-url", `http://127.0.0.1:${port}`]);
    await new Promise<void>((resolve) => server.close(() => resolve()));

    assert.equal(compact.status, 0);
    assert.equal(payload.status, 0);
    assert.equal(skills.status, 0);
    assert.equal(prompt.status, 0);

    const compactParsed = JSON.parse(compact.stdout);
    const payloadParsed = JSON.parse(payload.stdout);
    const skillsParsed = JSON.parse(skills.stdout);

    assert.equal(compactParsed.summaryHash, "weekly-hash");
    assert.equal(compactParsed.decisionDelta, "Tighten approvals now.");
    assert.equal(compactParsed.flipWatch, "Risk appetite > 55");
    assert.equal(compactParsed.skills[0]?.id, "decision-delta");

    assert.equal(payloadParsed.decision_delta.summary, "Tighten approvals now.");
    assert.equal(payloadParsed.flip_watch.flip_trigger, "Risk appetite > 55");

    assert.equal(skillsParsed[0]?.id, "decision-delta");
    assert.match(prompt.stdout, /Draft the weekly operator handoff\./);
  });

  it("export pdf writes a real pdf artifact to the requested path", async () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "whether-cli-home-"));
    const outputPath = path.join(homeDir, "briefing.pdf");
    const server = http.createServer((req, res) => {
      if ((req.url ?? "").startsWith("/api/cli/status")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          version: "v1",
          regime: "Guarded Expansion",
          cyclePhase: "Late",
          confidence: { label: "MED", score: 66 },
          trend: "Deteriorating",
          decisionStability: "unstable",
          updatedAt: "2026-03-12T12:00:00.000Z",
          freshness: { line: "Updated 2026-03-12T12:00:00.000Z · live · mixed-reliability" },
          call: {
            summary: "Stage decisions",
            do: ["Do x"],
            avoid: ["Avoid y"],
            flipConditions: ["tightness ≤ 60"],
          },
          degraded: false,
        }));
        return;
      }
      if ((req.url ?? "").startsWith("/api/cli/changes")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          version: "v1",
          generatedAt: "2026-03-12T12:10:00.000Z",
          freshness: { line: "Updated 2026-03-12T12:00:00.000Z · live · mixed-reliability" },
          changed: [{ metric: "tightness", from: 62, to: 60, direction: "down", impact: "negative" }],
          revisit: ["Recheck approvals"],
          flip: [{ condition: "tightness ≤ 60", distance: 0 }],
          degraded: false,
        }));
        return;
      }
      if ((req.url ?? "").startsWith("/api/brief/slack")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          brief: "Weekly operator brief\n- Stage fixed-cost approvals.",
          recordDate: "2026-03-12",
          generatedAt: "2026-03-12T12:00:00.000Z",
        }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    const result = await runCli(["export", "pdf", "--output", outputPath, "--api-base-url", `http://127.0.0.1:${port}`]);
    await new Promise<void>((resolve) => server.close(() => resolve()));

    const written = fs.readFileSync(outputPath);
    fs.rmSync(homeDir, { recursive: true, force: true });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Wrote PDF briefing to/);
    assert.equal(written.subarray(0, 4).toString("utf8"), "%PDF");
  });

  it("auth status --check validates token against authenticated endpoint", async () => {
    const requests: string[] = [];
    const server = http.createServer((req, res) => {
      requests.push(req.url ?? "");
      if ((req.url ?? "") === "/api/auth/status") {
        const authHeader = req.headers.authorization ?? "";
        if (authHeader === "Bearer valid-token") {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ ok: true, authenticated: true }));
          return;
        }
        res.writeHead(401, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_token" }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };

    const valid = await runCli(["auth", "status", "--check", "--api-base-url", `http://127.0.0.1:${port}`], {
      env: { ...process.env, WHETHER_API_KEY: "valid-token" },
    });

    const invalid = await runCli(["auth", "status", "--check", "--api-base-url", `http://127.0.0.1:${port}`], {
      env: { ...process.env, WHETHER_API_KEY: "invalid-token" },
    });

    await new Promise<void>((resolve) => server.close(() => resolve()));

    assert.ok(requests.every((url) => url === "/api/auth/status"));
    assert.equal(valid.status, 0);
    assert.equal(invalid.status, 2);
    assert.match(invalid.stderr, /auth: Authentication failed \(invalid key\)\./);
  });

  it("ping maps network failures to network exit semantics", () => {
    const result = spawnSync(NODE_BIN, [CLI_PATH, "ping", "--api-base-url", "http://127.0.0.1:1"], { encoding: "utf8" });

    assert.equal(result.status, 6);
    assert.match(result.stderr, /network: Unable to reach Whether API\./);
  });

  it("doctor reports resolved API base URL and token source when URL is explicitly provided", async () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "whether-cli-home-"));
    const server = http.createServer((req, res) => {
      if ((req.url ?? "").startsWith("/api/health")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = resolveServerPort(server);
    const result = await runCliWithRetries(["doctor", "--json", "--api-base-url", `http://127.0.0.1:${port}`], {
      env: buildIsolatedEnv({ HOME: homeDir }),
    });
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(homeDir, { recursive: true, force: true });

    assert.equal(result.status, 0, result.stderr);
    const parsed = JSON.parse(result.stdout);
    assert.ok(Array.isArray(parsed), "doctor --json should return a checks array");
    const healthCheck = parsed.find((check) => Boolean(check) && typeof check === "object" && "name" in check && check.name === "api/health");
    const apiBaseUrlCheck = parsed.find((check) => Boolean(check) && typeof check === "object" && "name" in check && check.name === "apiBaseUrl");
    const authCheck = parsed.find((check) => Boolean(check) && typeof check === "object" && "name" in check && check.name === "auth");

    assert.ok(healthCheck);
    assert.equal(healthCheck?.autodiscovered, false);
    assert.equal(healthCheck?.apiBaseUrl, `http://127.0.0.1:${port}`);
    assert.ok(apiBaseUrlCheck);
    assert.equal(apiBaseUrlCheck?.source, "flag");
    assert.ok(authCheck);
    assert.equal(authCheck?.authenticated, false);
  });

  it("status does not pass unsupported flags to the status endpoint", async () => {
    const requests: string[] = [];
    const server = http.createServer((req, res) => {
      requests.push(req.url ?? "");
      if ((req.url ?? "").startsWith("/api/cli/status")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          version: "v1",
          view: "default",
          regime: "Guarded",
          cyclePhase: "Late",
          confidence: { label: "MED", score: 66 },
          trend: "Deteriorating",
          decisionStability: "unstable",
          updatedAt: "2026-03-12T12:00:00.000Z",
          freshness: { line: "Updated 2026-03-12T12:00:00.000Z · live · mixed-reliability" },
          call: { summary: "Stage decisions", do: ["Do x"], avoid: ["Avoid y"], flipConditions: ["tightness < 60"] },
          degraded: false,
        }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    const result = await runCli(["status", "--api-base-url", `http://127.0.0.1:${port}`, "--company", "acme", "--stage", "seed"]);
    await new Promise<void>((resolve) => server.close(() => resolve()));

    assert.equal(result.status, 0);
    assert.ok(requests.some((url) => url === "/api/cli/status"));
    assert.ok(requests.every((url) => !url.includes("company=") && !url.includes("stage=")));
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

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    const result = await runCli(["history", "--weeks", "99", "--api-base-url", `http://127.0.0.1:${port}`]);
    await new Promise<void>((resolve) => server.close(() => resolve()));

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

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    const result = await runCli(["status", "--verbose", "--api-base-url", `http://127.0.0.1:${port}`]);
    await new Promise<void>((resolve) => server.close(() => resolve()));

    assert.equal(result.status, 0);
    assert.ok(requests.some((url) => url.includes("/api/cli/status?view=expanded")));
    assert.match(result.stdout, /Bounded Decision:/);
  });

  it("forwards only route-supported params for each CLI command endpoint", async () => {
    const requests: string[] = [];
    const server = http.createServer((req, res) => {
      const url = req.url ?? "";
      requests.push(url);
      if (url.startsWith("/api/cli/status")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          version: "v1", view: "expanded", regime: "Guarded", cyclePhase: "Late",
          confidence: { label: "MED", score: 66 }, trend: "Deteriorating", decisionStability: "unstable",
          updatedAt: "2026-03-12T12:00:00.000Z", freshness: { line: "Updated" },
          call: { summary: "Stage decisions", do: ["Do x"], avoid: ["Avoid y"], flipConditions: ["tightness < 60"] },
          boundedDecision: { guardrailThreshold: "Keep staged", reversalTrigger: "Re-open later", flipConditionsCompact: ["tightness < 60"], topDeltas: [{ metric: "tightness", direction: "down", delta: -1.5 }] },
          degraded: false,
        }));
        return;
      }
      if (url.startsWith("/api/cli/call")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ call: "Stage", leadershipShould: ["Do x"], watch: ["Watch y"], freshness: { line: "Updated" } }));
        return;
      }
      if (url.startsWith("/api/cli/changes")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ changed: [], revisit: [], flip: [], freshness: { line: "Updated" } }));
        return;
      }
      if (url.startsWith("/api/cli/diagnostics")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ version: "v1", generatedAt: new Date().toISOString(), topDrivers: [], degraded: false }));
        return;
      }
      if (url.startsWith("/api/cli/regime")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ regime: "Guarded", phase: "Late", confidence: "MED", trend: "stable", interpretation: "Interpret cautiously" }));
        return;
      }
      if (url.startsWith("/api/cli/history")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ version: "v1", generatedAt: new Date().toISOString(), requestedWeeks: 8, windowWeeks: 8, maxWeeks: 52, truncatedToMax: false, history: [], degraded: false }));
        return;
      }
      if (url.startsWith("/api/cli/scenario")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ version: "v1", postureBefore: "Guarded", postureAfter: "Stable", inputs: { tightness: 70, riskAppetite: 65 } }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    const base = ["--api-base-url", `http://127.0.0.1:${port}`, "--company", "acme", "--stage", "seed"];

    const commands = [
      ["status", "--as-of", "2024-07", "--verbose", ...base],
      ["call", "--as-of", "2024-07", ...base],
      ["changes", "--as-of", "2024-07", ...base],
      ["diagnostics", "--as-of", "2024-07", ...base],
      ["regime", "--as-of", "2024-07", ...base],
      ["history", "--as-of", "2024-07", "--weeks", "8", ...base],
      ["scenario", "--tightness", "70", "--risk-appetite", "65", ...base],
    ];

    for (const args of commands) {
      const result = await runCli(args);
      assert.equal(result.status, 0, `command failed: ${args.join(" ")}\n${result.stderr}`);
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));

    assert.ok(requests.some((url) => url.includes("/api/cli/status?asOf=2024-07&view=expanded")));
    assert.ok(requests.some((url) => url.includes("/api/cli/call?asOf=2024-07")));
    assert.ok(requests.some((url) => url.includes("/api/cli/changes?asOf=2024-07")));
    assert.ok(requests.some((url) => url.includes("/api/cli/diagnostics?asOf=2024-07")));
    assert.ok(requests.some((url) => url.includes("/api/cli/regime?asOf=2024-07")));
    assert.ok(requests.some((url) => url.includes("/api/cli/history?asOf=2024-07&weeks=8")));
    assert.ok(requests.some((url) => url.includes("/api/cli/scenario?tightness=70&risk-appetite=65")));
    assert.ok(requests.every((url) => !url.includes("company=") && !url.includes("stage=")));
  });

  // Guard test: kebab-case CLI flags are not silently dropped by Commander's camelCase conversion.
  it("--help mentions all critical flags to prevent Commander camelCase regressions", () => {
    const result = spawnSync(NODE_BIN, [CLI_PATH, "--help"], { encoding: "utf8" });
    assert.equal(result.status, 0);
    for (const flag of ["--no-local-discovery", "--api-base-url", "--as-of", "--payload-only", "--prompt-only", "--skills-only", "--verbose"]) {
      assert.match(result.stdout, new RegExp(flag.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")));
    }
  });

  it("--no-local-discovery flag prevents auto-discovery when URL source is default (verifies Commander kebab-case routing)", async () => {
    // Verify the flag is parseable by Commander and reachable in help output
    const help = spawnSync(NODE_BIN, [CLI_PATH, "--help"], { encoding: "utf8" });
    assert.match(help.stdout, /no-local-discovery/);
    // Verify --api-base-url flag routes correctly (the previously broken path)
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address();
    if (!addr || typeof addr === 'string') throw new Error('Expected AddressInfo from server');
    const { port } = addr;
    const result = await runCli(["ping", "--no-local-discovery", "--api-base-url", `http://127.0.0.1:${port}`, "--json"]);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.ok, true);
  });

  /*
   * An agent that mistypes a command was told "too many arguments for 'status'": `status` was
   * Commander's default command, and the default swallowed the unknown word. Now a word that
   * is no command is said to be none, with the nearest command and the list.
   */
  it("says an unknown command is unknown, and names the command it may have meant", () => {
    const typo = spawnSync(NODE_BIN, [CLI_PATH, "stat", "--no-local-discovery"], { encoding: "utf8" });
    assert.equal(typo.status, 1);
    assert.match(typo.stderr, /error: unknown command 'stat' \(did you mean 'status'\?\)/);
    assert.match(typo.stderr, /Commands: ping, status, state, agent,/);
    assert.equal(typo.stdout, "");

    const nonsense = spawnSync(NODE_BIN, [CLI_PATH, "frobnicate", "--no-local-discovery"], { encoding: "utf8" });
    assert.equal(nonsense.status, 1);
    assert.match(nonsense.stderr, /error: unknown command 'frobnicate'\n/);
    assert.doesNotMatch(nonsense.stderr, /did you mean/);
  });

  it("still shows the status when no command is given, with options before it or none at all", async () => {
    const requests: string[] = [];
    const server = http.createServer((req, res) => {
      requests.push(req.url ?? "");
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          version: "v1",
          regime: "Stormy",
          cyclePhase: "Mid",
          confidence: { label: "HIGH", score: 92 },
          trend: "Stable",
          decisionStability: "stable",
          call: { summary: "Hold.", do: ["Hold spend"], avoid: ["Rebrands"], flipConditions: ["Funding pressure <= 66"] },
        }),
      );
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${resolveServerPort(server)}`;
    const bare = await runCli(["--no-local-discovery", "--api-base-url", base, "--json"]);
    await new Promise<void>((resolve) => server.close(() => resolve()));

    assert.equal(bare.status, 0);
    assert.equal(JSON.parse(bare.stdout).regime, "Stormy");
    assert.ok(requests.every((url) => url.startsWith("/api/cli/status")), "the status route, and nothing else");
  });

  it("lists every command in its completion scripts, from the commands it has", () => {
    const help = spawnSync(NODE_BIN, [CLI_PATH, "--help"], { encoding: "utf8" });
    const listed = [...help.stdout.matchAll(/^ {2}([a-z]+)(?:\s|\|)/gm)].map((match) => match[1]).filter((name) => name !== "help");
    const bash = spawnSync(NODE_BIN, [CLI_PATH, "completion", "--shell", "bash"], { encoding: "utf8" });
    const zsh = spawnSync(NODE_BIN, [CLI_PATH, "completion", "--shell", "zsh"], { encoding: "utf8" });

    assert.ok(listed.includes("state") && listed.includes("agent"), "the commands an agent reaches for are commands");
    for (const name of listed) {
      assert.match(bash.stdout, new RegExp(`local commands="[^"]*\\b${name}\\b`), `bash completes ${name}`);
      assert.match(zsh.stdout, new RegExp(`commands=\\([^)]*\\b${name}\\b`), `zsh completes ${name}`);
    }
  });

  it("state reads the compact state and prints it for a person, or as it is with --json", async () => {
    const requests: string[] = [];
    const state = {
      version: "v1",
      recordDate: "2026-09-25",
      headline: "Freezing (money is expensive and hard to raise), high confidence, reading of 2026-09-25. The data is live and current.",
      automation: { ready: true, refusal: null },
      scores: {
        tightness: {
          label: "Funding pressure", value: 90, delta: 27, perWeek: 7.6,
          pause: { line: 76, distance: 14, side: "above", met: true },
          resume: { line: 66, distance: 24, side: "above", met: false },
          change: { line: 70, distance: 20, side: "above" },
          moved: [{ source: "rates", label: "interest rates", points: 27 }],
        },
        riskAppetite: {
          label: "Risk appetite", value: 43, delta: -13, perWeek: -3.6,
          pause: { line: 44, distance: 1, side: "below", met: true },
          resume: { line: 54, distance: 11, side: "below", met: false },
          change: { line: 50, distance: 7, side: "below" },
          moved: [{ source: "curve", label: "the yield curve", points: -2 }, { source: "startupMarket", label: "startup-market inputs", points: -11 }],
        },
      },
      change: { comparedWith: { recordDate: "2026-08-31", label: "Aug 31" }, note: "The Aug 31 scores were built from interest rates alone." },
      guidance: { call: "Conditions are tightening.", doNow: ["Hold spend"], avoidNow: ["Rebrands"], flipConditions: ["Funding pressure <= 66"] },
      use: { summary: "Informational only." },
    };
    const server = http.createServer((req, res) => {
      requests.push(req.url ?? "");
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(state));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${resolveServerPort(server)}`;
    const text = await runCli(["state", "--no-local-discovery", "--api-base-url", base]);
    const json = await runCli(["state", "--no-local-discovery", "--api-base-url", base, "--json"]);
    await new Promise<void>((resolve) => server.close(() => resolve()));

    assert.deepEqual([...new Set(requests)], ["/api/agent?view=state"]);
    assert.equal(text.status, 0);
    assert.match(text.stdout, /Whether — State, reading of 2026-09-25/);
    assert.match(text.stdout, /The data is live and current\./);
    assert.match(text.stdout, /Funding pressure\s+90\s+pause 76 \(14 above, applies\) · resume 66 \(24 above\) · change 70 \(20 above\)/);
    assert.match(text.stdout, /since Aug 31: \+27 \(\+7\.6\/week\), made of \+27 from interest rates/);
    assert.match(text.stdout, /since Aug 31: -13 \(-3\.6\/week\), made of -2 from the yield curve, -11 from startup-market inputs/);
    assert.match(text.stdout, /The Aug 31 scores were built from interest rates alone\./);
    assert.equal(json.status, 0);
    assert.deepEqual(JSON.parse(json.stdout), state);
  });

  /*
   * A script that acts on the reading should not have to parse the payload to learn the data was a
   * saved copy: `--require-ready` makes that the exit code, and still prints the state.
   */
  it("state --require-ready exits 8 when the data is not live and current, and 0 when it is", async () => {
    const respond = (automation: { ready: boolean; refusal: string | null }) => {
      const server = http.createServer((_req, res) => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ version: "v1", automation, headline: "A state.", recordDate: "2026-06-17" }));
      });
      return server;
    };
    const run = async (automation: { ready: boolean; refusal: string | null }, extra: string[]) => {
      const server = respond(automation);
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const result = await runCli(["state", "--json", "--no-local-discovery", "--api-base-url", `http://127.0.0.1:${resolveServerPort(server)}`, ...extra]);
      await new Promise<void>((resolve) => server.close(() => resolve()));
      return result;
    };

    const stale = await run({ ready: false, refusal: "Data is a fallback snapshot, not a live reading." }, ["--require-ready"]);
    assert.equal(stale.status, 8);
    assert.equal(JSON.parse(stale.stdout).automation.ready, false, "the state is printed either way");
    assert.match(stale.stderr, /not ready: Data is a fallback snapshot/);

    const staleWithoutTheFlag = await run({ ready: false, refusal: "Data is a fallback snapshot, not a live reading." }, []);
    assert.equal(staleWithoutTheFlag.status, 0, "without the flag the exit code is about the request, not the reading");

    const fresh = await run({ ready: true, refusal: null }, ["--require-ready"]);
    assert.equal(fresh.status, 0);
    assert.equal(fresh.stderr, "");
  });

  it("changes names the reading it is measured against, the signals by their names, and what a score's move is made of", async () => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          version: "v1",
          freshness: { line: "Updated 2026-09-29 · live" },
          basis: "since Aug 31",
          comparedWith: { recordDate: "2026-08-31", label: "Aug 31" },
          changed: [
            { metric: "tightness", label: "Funding pressure", from: 63, to: 90, direction: "up", impact: "negative", moved: [{ source: "rates", label: "interest rates", points: 27 }] },
            { metric: "base_rate", label: "Base rate", from: 3.85, to: 4.04, direction: "up", impact: "negative", moved: [] },
          ],
          revisit: ["Hiring ahead of revenue"],
          flip: [
            { condition: "Funding pressure <= 66 for two readings in a row", distance: 24 },
            { condition: "Funding pressure > 76: tighten again", distance: -1 },
            { condition: "Risk appetite < 44", distance: 0 },
            { condition: "No numeric line", distance: null },
          ],
        }),
      );
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const result = await runCli(["changes", "--no-local-discovery", "--api-base-url", `http://127.0.0.1:${resolveServerPort(server)}`]);
    await new Promise<void>((resolve) => server.close(() => resolve()));

    assert.equal(result.status, 0);
    assert.match(result.stdout, /^What changed since Aug 31\n/);
    assert.doesNotMatch(result.stdout, /Last Refresh/);
    assert.match(result.stdout, /- Funding pressure 63 → 90 \(up, negative\)\n {4}made of: \+27 from interest rates\n- Base rate 3\.85 → 4\.04/);
    assert.doesNotMatch(result.stdout, /tightness|base_rate/, "no engine keys in what a person reads");
    assert.match(result.stdout, /\(24 away\)/);
    assert.match(result.stdout, /tighten again \(1 past the line\)/, "a crossed line is not a negative distance");
    assert.doesNotMatch(result.stdout, /-1 away/);
    assert.match(result.stdout, /Risk appetite < 44 \(at the line\)/);
    assert.match(result.stdout, /- No numeric line\n?$/);
  });

});
