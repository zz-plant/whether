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
import { createWriteStream } from "node:fs";
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

export const canBindPort = async ({ host, port }) =>
  new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ host, port }, () => {
      server.close(() => resolve(true));
    });
  });

/**
 * Where to actually start the server. A remote or already-serving base URL is
 * used as-is; a local one whose port is taken walks up to five ports forward, so
 * a dev server someone left running does not fail the run.
 */
export const resolveAutoStartBaseUrl = async ({ baseUrl, initialProbe }) => {
  const parsedBaseUrl = new URL(baseUrl);
  const hostname = normalizeHostname(parsedBaseUrl.hostname);

  if (initialProbe.ok || !isLocalHostname(hostname)) {
    return { baseUrl, reusedRequestedPort: true, reason: null };
  }

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
export const waitForBaseUrl = async ({ baseUrl, timeoutMs, child, logPath, probe }) => {
  const startedAt = Date.now();
  let lastProbe = null;

  while (Date.now() - startedAt < timeoutMs) {
    lastProbe = await probe(baseUrl);
    if (lastProbe.ok) {
      return lastProbe;
    }

    if (child?.exitCode != null) {
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

export const stopDevServer = async (child) => {
  if (!child) {
    return;
  }

  if (child.exitCode == null) {
    signalGroup(child, "SIGTERM");

    const startedAt = Date.now();
    while (child.exitCode == null && Date.now() - startedAt < 5000) {
      await wait(100);
    }

    if (child.exitCode == null) {
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
export const startDevServer = async ({ baseUrl, outDir, devScript, logName }) => {
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
  const child = spawn("bun", ["run", devScript, "--", "--hostname", host, "--port", port], {
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
}) => {
  const initialProbe = await probe(baseUrl);

  if (initialProbe.ok) {
    onStatus(`Reusing the server already listening at ${baseUrl}`);
    return body(baseUrl);
  }

  const target = await resolveAutoStartBaseUrl({ baseUrl, initialProbe });

  if (!target.reusedRequestedPort && target.reason) {
    onStatus(
      `${baseUrl} is not usable (${target.reason}). Starting a clean dev server at ${target.baseUrl} instead.`,
    );
  } else {
    onStatus(`Starting dev server with \`bun run ${devScript}\` for ${target.baseUrl}`);
  }

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
    return await body(target.baseUrl, started);
  } finally {
    await stopDevServer(started.child);
  }
};
