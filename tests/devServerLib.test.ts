import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import type { ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { createServer as createNetServer, type Server } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { type StartedDevServer, withDevServer } from "../scripts/dev-server.lib.mjs";

/*
 * The dev-server lifecycle the landmark audit and the UI loop share: reuse a server that
 * already answers, otherwise start one (on a nearby port if the requested one is held),
 * wait for it, run the work, and stop only what was started. Nothing here touches port
 * 3000 or `bun run dev`: the "dev server" is a fixture script on an ephemeral loopback
 * port, which `bun run <file> -- --hostname <h> --port <p>` starts exactly the way it
 * starts the real one.
 */
const roots: string[] = [];
const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const workspace = () => {
  const root = mkdtempSync(join(tmpdir(), "dev-server-lib-"));
  roots.push(root);
  return root;
};

/** A fixture "dev server": answers `body` with `status` on the port it is told to use. */
const fixtureServer = (root: string, { status = 200 }: { status?: number } = {}) => {
  const file = join(root, `server-${status}.mjs`);
  writeFileSync(
    file,
    [
      'import { createServer } from "node:http";',
      "const args = process.argv.slice(2);",
      'const hostIndex = args.indexOf("--host") !== -1 ? args.indexOf("--host") : args.indexOf("--hostname");',
      'const host = args[hostIndex + 1];',
      'const port = Number(args[args.indexOf("--port") + 1]);',
      `createServer((request, response) => { response.statusCode = ${status}; response.end("fixture"); }).listen(port, host);`,
    ].join("\n"),
  );
  return file;
};

/* Every call names a lock file in its own workspace. The default is this checkout's
   `.vinext/dev/lock.json`, and a dev server left running here would otherwise be
   reused by every test below instead of the fixture each one starts. */
const noLock = (root: string) => join(root, "no-dev-lock.json");

const exitingServer = (root: string) => {
  const file = join(root, "exits.mjs");
  writeFileSync(file, "process.exit(3);\n");
  return file;
};

/** Dies by a signal, so `exitCode` stays null and only `signalCode` says it is gone. */
const killedServer = (root: string) => {
  const file = join(root, "killed.mjs");
  writeFileSync(file, 'process.kill(process.pid, "SIGKILL");\n');
  return file;
};

/** A loopback port nothing is listening on right now. */
const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = createNetServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });

type Probe = { ok: boolean; status?: number; error?: string };

const probeOnce = async (baseUrl: string): Promise<Probe> => {
  try {
    const response = await fetch(baseUrl, { signal: AbortSignal.timeout(1000) });
    return { ok: response.status === 200, status: response.status };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
};

/**
 * The first call answers at once — that is the "is something already serving?" check.
 * Later calls keep asking for up to `patienceMs`, so a test waits for its fixture to
 * listen rather than for the library's one-second poll.
 */
const patientProbe = (patienceMs: number) => {
  let calls = 0;
  return async (baseUrl: string): Promise<Probe> => {
    calls += 1;
    let probe = await probeOnce(baseUrl);
    const deadline = Date.now() + (calls === 1 ? 0 : patienceMs);
    while (!probe.ok && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      probe = await probeOnce(baseUrl);
    }
    return probe;
  };
};

const hasExited = (child: ChildProcess | undefined) => child?.exitCode != null || child?.signalCode != null;

describe("withDevServer", () => {
  it("reuses a server that already answers, and leaves it running", async () => {
    const server = createHttpServer((request, response) => response.end("already up"));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;

    const statuses: string[] = [];
    try {
      const result = await withDevServer({
        baseUrl,
        outDir: workspace(),
        lockfilePath: noLock(workspace()),
        probe: probeOnce,
        onStatus: (message: string) => statuses.push(message),
        body: async (url: string, started?: unknown) => ({ url, started, text: await (await fetch(url)).text() }),
      });

      assert.deepEqual(result, { url: baseUrl, started: undefined, text: "already up" });
      assert.match(statuses.join("\n"), /Reusing the server already listening/);
      assert.equal(await (await fetch(baseUrl)).text(), "already up", "a server it did not start must survive");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("reuses this checkout's dev server from vinext's lock file, wherever it listens", async () => {
    const server = createHttpServer((request, response) => response.end("checkout server"));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const appUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
    const root = workspace();
    const lockfilePath = join(root, "lock.json");
    writeFileSync(lockfilePath, JSON.stringify({ pid: process.pid, port: 0, hostname: "127.0.0.1", appUrl, startedAt: 0, cwd: root }));

    const statuses: string[] = [];
    try {
      const result = await withDevServer({
        baseUrl: `http://127.0.0.1:${await freePort()}`,
        outDir: root,
        lockfilePath,
        probe: probeOnce,
        onStatus: (message: string) => statuses.push(message),
        body: async (url: string, started?: unknown) => ({ url, started }),
      });

      assert.deepEqual(result, { url: appUrl, started: undefined });
      assert.match(statuses.join("\n"), /Reusing this checkout's dev server/);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("starts a server, waits for it, hands it to the work, and stops it afterwards", async () => {
    const root = workspace();
    const baseUrl = `http://127.0.0.1:${await freePort()}`;
    let child: ChildProcess | undefined;
    let workDoneAt = 0;

    const text = await withDevServer({
      baseUrl,
      outDir: root,
      lockfilePath: noLock(root),
      devScript: fixtureServer(root),
      logName: "fixture.log",
      timeoutMs: 15000,
      probe: patientProbe(10000),
      body: async (url: string, started?: StartedDevServer) => {
        assert.ok(started, "a server this call started is handed to the work");
        child = started.child;
        assert.equal(started.logPath, join(root, "fixture.log"));
        assert.equal(hasExited(child), false, "the server is up while the work runs");
        const answer = await (await fetch(url)).text();
        workDoneAt = Date.now();
        return answer;
      },
    });

    /*
     * The `bun run` wrapper dies of the SIGTERM, which leaves `exitCode` null. Teardown
     * used to read only `exitCode`, so it waited out its whole five seconds on every run
     * — in the landmark audit, on every push — before SIGKILLing a group already gone.
     */
    assert.ok(Date.now() - workDoneAt < 4000, `teardown took ${Date.now() - workDoneAt}ms`);
    assert.equal(text, "fixture");
    assert.ok(existsSync(join(root, "fixture.log")), "the server's output goes to a log, not the console");
    assert.equal(hasExited(child), true, "a server this call started is stopped when the work is done");
    assert.equal((await probeOnce(baseUrl)).ok, false, "and nothing answers there any more");
  });

  it("stops the server it started even when the work throws", async () => {
    const root = workspace();
    let child: ChildProcess | undefined;

    await assert.rejects(
      withDevServer({
        baseUrl: `http://127.0.0.1:${await freePort()}`,
        outDir: root,
        lockfilePath: noLock(root),
        devScript: fixtureServer(root),
        timeoutMs: 15000,
        probe: patientProbe(10000),
        body: async (url: string, started?: StartedDevServer) => {
          child = started?.child;
          throw new Error("the audit failed");
        },
      }),
      /the audit failed/,
    );

    assert.equal(hasExited(child), true);
  });

  it("moves to a nearby port when the requested one is held by something that does not answer", async () => {
    // Accepts connections and drops them: bound, so the port is taken, but never a usable server.
    const holder = createNetServer((socket) => socket.destroy());
    await new Promise<void>((resolve) => holder.listen(0, "127.0.0.1", resolve));
    servers.push(holder);
    const address = holder.address();
    const heldPort = typeof address === "object" && address ? address.port : 0;

    const root = workspace();
    const statuses: string[] = [];
    const usedUrl = await withDevServer({
      baseUrl: `http://127.0.0.1:${heldPort}`,
      outDir: root,
      lockfilePath: noLock(root),
      devScript: fixtureServer(root),
      timeoutMs: 15000,
      probe: patientProbe(10000),
      onStatus: (message: string) => statuses.push(message),
      body: async (url: string) => url,
    });

    const usedPort = Number(new URL(usedUrl).port);
    assert.ok(usedPort > heldPort && usedPort <= heldPort + 5, `expected a port just above ${heldPort}, got ${usedPort}`);
    assert.match(statuses.join("\n"), /is not usable .*Starting a clean dev server at/);
  });

  it("fails fast, naming its log, when the server exits before it is ready", async () => {
    const root = workspace();
    const startedAt = Date.now();

    await assert.rejects(
      withDevServer({
        baseUrl: `http://127.0.0.1:${await freePort()}`,
        outDir: root,
        lockfilePath: noLock(root),
        devScript: exitingServer(root),
        timeoutMs: 60000,
        probe: patientProbe(300),
        body: async () => assert.fail("the work must not run against a server that never came up"),
      }),
      (error: unknown) =>
        error instanceof Error &&
        /exited before .* became ready/.test(error.message) &&
        error.message.includes(join(root, "dev-server.log")),
    );

    assert.ok(Date.now() - startedAt < 10000, "an exited server must not cost the whole readiness timeout");
  });

  it("fails fast when the server is killed by a signal before it is ready", async () => {
    const root = workspace();
    const startedAt = Date.now();

    await assert.rejects(
      withDevServer({
        baseUrl: `http://127.0.0.1:${await freePort()}`,
        outDir: root,
        lockfilePath: noLock(root),
        devScript: killedServer(root),
        timeoutMs: 60000,
        probe: patientProbe(300),
        body: async () => assert.fail("the work must not run against a server that never came up"),
      }),
      /exited before .* became ready/,
    );

    assert.ok(Date.now() - startedAt < 10000, "a killed server must not cost the whole readiness timeout");
  });

  it("times out naming the last probe when the server never becomes ready, and still stops it", async () => {
    const root = workspace();
    let calls = 0;

    await assert.rejects(
      withDevServer({
        baseUrl: `http://127.0.0.1:${await freePort()}`,
        outDir: root,
        lockfilePath: noLock(root),
        devScript: fixtureServer(root, { status: 503 }),
        timeoutMs: 200,
        probe: async (baseUrl: string) => {
          calls += 1;
          return calls === 1 ? probeOnce(baseUrl) : { ok: false, status: 503 };
        },
        body: async () => assert.fail("the work must not run against a server that never became ready"),
      }),
      /Timed out after 200ms waiting for .* \(status 503\)/,
    );
  });
});
