/**
 * Dev-server lifecycle shared by the scripts that need a running app rather than
 * a static read of the source: `ui-iterate.mjs` screenshots routes, and
 * `check-main-content-landmarks.mjs` fetches them. Both have to find a free
 * port, start `bun run dev`, wait for readiness, and shut the child down even
 * when the work in between throws.
 *
 * Readiness is injected rather than fixed here. UI capture will not shoot a page
 * whose assets have not settled, so it passes its own asset-integrity probe;
 * the landmark audit only needs the server to answer, so it passes a plain one.
 */
import { createWriteStream, readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import process from "node:process";

const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "localhost", "::1"]);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeHostname = (hostname) =>
  hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;

export const isLocalHostname = (hostname) => LOCAL_HOSTNAMES.has(normalizeHostname(hostname));

const canBindPort = async ({ host, port }) =>
  new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ host, port }, () => {
      server.close(() => resolve(true));
    });
  });

/**
 * Where to actually start the server, for a local base URL that did not answer
 * (`withDevServer` handles a serving or remote one first). One whose port is taken
 * walks up to five ports forward, so a dev server someone left running does not
 * fail the run.
 */
const resolveAutoStartBaseUrl = async ({ baseUrl, initialProbe }) => {
  const parsedBaseUrl = new URL(baseUrl);
  const hostname = normalizeHostname(parsedBaseUrl.hostname);

  const defaultPort = parsedBaseUrl.protocol === "https:" ? 443 : 80;
  const requestedPort = Number.parseInt(parsedBaseUrl.port || String(defaultPort), 10);

  if (await canBindPort({ host: hostname, port: requestedPort })) {
    return { baseUrl, reusedRequestedPort: true, reason: initialProbe.error ?? null };
  }

  for (let offset = 1; offset <= 5; offset += 1) {
    const candidatePort = requestedPort + offset;
    if (!(await canBindPort({ host: hostname, port: candidatePort }))) {
      continue;
    }

    const candidateUrl = new URL(baseUrl);
    candidateUrl.port = String(candidatePort);
    return {
      baseUrl: candidateUrl.toString(),
      reusedRequestedPort: false,
      reason: initialProbe.error ?? `Port ${requestedPort} is already in use.`,
    };
  }

  throw new Error(
    `Could not auto-start a clean dev server near ${baseUrl}. The requested port is occupied and no nearby fallback port was available.`,
  );
};

/**
 * Polls until `probe` reports ready. Watching `child.exitCode` means a server
 * that dies on a build error fails in a second with a pointer to its log,
 * instead of burning the whole timeout.
 */
/*
 * Exited by code *or* by signal. A child killed by a signal keeps `exitCode` null and sets
 * `signalCode` instead — and a `bun run` wrapper answers the SIGTERM below that way — so
 * reading `exitCode` alone made every teardown wait out its full five seconds and then
 * SIGKILL a group that was already gone, and let a server killed during startup (OOM, a
 * stray signal) burn the whole readiness timeout. tests/devServerLib.test.ts pins both.
 */
const hasExited = (child) => child.exitCode != null || child.signalCode != null;

const waitForBaseUrl = async ({ baseUrl, timeoutMs, child, logPath, probe }) => {
  const startedAt = Date.now();
  let lastProbe = null;

  while (Date.now() - startedAt < timeoutMs) {
    lastProbe = await probe(baseUrl);
    if (lastProbe.ok) {
      return lastProbe;
    }

    if (child && hasExited(child)) {
      const statusDetail = lastProbe.error
        ? lastProbe.error
        : `status ${lastProbe.status ?? "unknown"}`;
      throw new Error(
        `The dev server exited before ${baseUrl} became ready (${statusDetail}). Check ${logPath}.`,
      );
    }

    await wait(1000);
  }

  const statusDetail = lastProbe?.error
    ? lastProbe.error
    : `status ${lastProbe?.status ?? "unknown"}`;
  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for ${baseUrl} (${statusDetail}). Check ${logPath}.`,
  );
};

/**
 * Signal the child's whole process group, falling back to the child alone.
 *
 * The negative pid is the group. Without it only the `bun run` wrapper is
 * signalled and the dev server it spawned survives.
 */
const signalGroup = (child, signal) => {
  try {
    process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      /* Already gone; nothing to signal. */
    }
  }
};

/** Whether any process in the child's group is alive: signal 0 asks without signalling. */
const groupAlive = (child) => {
  try {
    process.kill(-child.pid, 0);
    return true;
  } catch {
    return false;
  }
};

const stopDevServer = async (child) => {
  if (!child) {
    return;
  }

  if (!hasExited(child)) {
    signalGroup(child, "SIGTERM");

    /*
     * Until the whole group is gone, not just the wrapper: the wrapper dies on the
     * SIGTERM at once, and the dev server it spawned may take longer. The old wait
     * on the wrapper never ended early, so the SIGKILL after it always reached a
     * straggler; waiting on the group keeps that guarantee without the five seconds.
     */
    const startedAt = Date.now();
    while ((!hasExited(child) || groupAlive(child)) && Date.now() - startedAt < 5000) {
      await wait(100);
    }

    if (!hasExited(child) || groupAlive(child)) {
      signalGroup(child, "SIGKILL");
    }
  }

  /*
   * Destroyed even when the child had already exited: these are what kept the
   * loop open, and an exited wrapper is no guarantee its grandchild released
   * them. Cheap, and it makes the teardown independent of who died when.
   */
  child.stdout?.destroy();
  child.stderr?.destroy();
};

/**
 * Spawns `bun run <devScript>` bound to `baseUrl`. Output goes to `logName`
 * under `outDir` rather than the console, so the caller's own report stays
 * readable and a failure still has the server's side of the story.
 */
const startDevServer = async ({ baseUrl, outDir, devScript, logName }) => {
  const parsedBaseUrl = new URL(baseUrl);
  const host = parsedBaseUrl.hostname;
  const port = parsedBaseUrl.port || (parsedBaseUrl.protocol === "https:" ? "443" : "80");

  await mkdir(outDir, { recursive: true });

  const logPath = path.resolve(process.cwd(), outDir, logName);
  const logStream = createWriteStream(logPath, { flags: "w" });
  /*
   * Detached so the child leads its own process group. `bun run dev` is a wrapper:
   * the real dev server is its child, and it inherits these stdout/stderr pipes.
   * Signalling only the wrapper leaves that grandchild alive holding the write
   * ends, so the read ends never see EOF, Node's loop never drains, and a caller
   * that sets `process.exitCode` instead of calling `process.exit()` hangs after
   * finishing its work. A group leader can be signalled as a group, which is what
   * stopDevServer does.
   */
  const child = spawn("bun", ["run", devScript, "--", "--host", host, "--port", port], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });

  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);

  return { child, logPath };
};

/**
 * The dev server vinext says is already running in this checkout, from the lock file it
 * writes on start (`.vinext/dev/lock.json`). vinext refuses a second dev server in the same
 * directory, so before 2026-10-13 a preview server left up on another port made the
 * landmark audit, and so the pre-push hook, fail with "the dev server exited before it
 * became ready". A server in this directory serves this tree, so it is safe to reuse.
 */
const readCheckoutDevServer = (lockfilePath) => {
  try {
    const lock = JSON.parse(readFileSync(lockfilePath, "utf8"));
    if (!Number.isInteger(lock.pid) || lock.pid <= 0 || typeof lock.appUrl !== "string") return null;
    process.kill(lock.pid, 0);
    return lock.appUrl;
  } catch {
    return null;
  }
};

/**
 * Runs `body(baseUrl)` against a ready server, reusing one already listening at
 * `baseUrl` and otherwise starting one. Only a server this call started is
 * stopped afterwards — a dev server the user is running survives the check.
 */
export const withDevServer = async ({
  baseUrl,
  outDir,
  devScript = "dev",
  logName = "dev-server.log",
  timeoutMs = 90000,
  probe,
  onStatus = () => {},
  body,
  /** Fresh starts to try before readiness counts as failed. */
  startAttempts = 1,
  lockfilePath = path.join(process.cwd(), ".vinext", "dev", "lock.json"),
}) => {
  const initialProbe = await probe(baseUrl);

  if (initialProbe.ok) {
    onStatus(`Reusing the server already listening at ${baseUrl}`);
    return body(baseUrl);
  }

  /* A remote target (a preview or staging deployment) is the thing under test. Swapping in
     this checkout's dev server, or starting one, would report local code as that deployment. */
  if (!isLocalHostname(new URL(baseUrl).hostname)) {
    throw new Error(
      `${baseUrl} did not answer (${initialProbe.error ?? "not ready"}). It is not a local address, so no local server stands in for it.`,
    );
  }

  const checkoutServer = readCheckoutDevServer(lockfilePath);
  if (checkoutServer && (await probe(checkoutServer)).ok) {
    onStatus(`Reusing this checkout's dev server at ${checkoutServer}`);
    return body(checkoutServer);
  }

  const target = await resolveAutoStartBaseUrl({ baseUrl, initialProbe });

  if (!target.reusedRequestedPort && target.reason) {
    onStatus(
      `${baseUrl} is not usable (${target.reason}). Starting a clean dev server at ${target.baseUrl} instead.`,
    );
  } else {
    onStatus(`Starting dev server with \`bun run ${devScript}\` for ${target.baseUrl}`);
  }

  /* Only readiness is retried, never the work. The deploy gate's landmark audit failed
     production builds on 2026-10-14 (550d400, e267ede) when the dev server did not answer
     in 180s on a cold Workers Builds container, with builds either side passing; its log
     sat in the container where nobody could read it. Each failed start now prints the
     log's tail, and a caller can ask for a second, fresh start before giving up. */
  for (let attempt = 1; ; attempt += 1) {
    const started = await startDevServer({
      baseUrl: target.baseUrl,
      outDir,
      devScript,
      logName,
    });

    try {
      await waitForBaseUrl({
        baseUrl: target.baseUrl,
        timeoutMs,
        child: started.child,
        logPath: started.logPath,
        probe,
      });
    } catch (error) {
      await stopDevServer(started.child);
      const message = `${error instanceof Error ? error.message : String(error)}${formatLogTail(started.logPath)}`;
      if (attempt < startAttempts) {
        onStatus(`${message}\nStarting a fresh dev server (attempt ${attempt + 1} of ${startAttempts}).`);
        continue;
      }
      throw new Error(message, { cause: error });
    }

    try {
      return await body(target.baseUrl, started);
    } finally {
      await stopDevServer(started.child);
    }
  }
};

/** The last lines of a dev-server log, for an error that would otherwise only name the file. */
const formatLogTail = (logPath, lines = 30) => {
  try {
    const tail = readFileSync(logPath, "utf8").trimEnd().split("\n").slice(-lines).join("\n");
    return tail ? `\n--- last ${lines} lines of ${logPath} ---\n${tail}` : `\n(${logPath} is empty)`;
  } catch {
    return "";
  }
};
