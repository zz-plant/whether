import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import process from "node:process";
import {
  captureTargets,
  ensureBaseUrlReachable,
  hasFlag,
  listCaptureTargets,
  parseCaptureOptions,
  readArgValue,
  probeBaseUrl,
  writeCaptureArtifacts,
} from "./ui-capture.lib.mjs";

const args = process.argv.slice(2);
const options = parseCaptureOptions(args);

if (options.targets.length === 0) {
  console.error("No UI capture targets matched `--only`.");
  process.exit(1);
}

if (hasFlag(args, "--list")) {
  for (const line of listCaptureTargets()) {
    console.log(line);
  }
  process.exit(0);
}

const shouldAutoStartDev = !hasFlag(args, "--no-dev");
const devScript = readArgValue(args, "--dev-script", "dev");
const timeoutMs = Number.parseInt(readArgValue(args, "--timeout-ms", "90000"), 10);

if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
  console.error("`--timeout-ms` must be a positive integer.");
  process.exit(1);
}

const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "localhost", "::1"]);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeHostname = (hostname) =>
  hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;

const isLocalHostname = (hostname) => LOCAL_HOSTNAMES.has(normalizeHostname(hostname));

const canBindPort = async ({ host, port }) =>
  new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ host, port }, () => {
      server.close(() => resolve(true));
    });
  });

const resolveAutoStartBaseUrl = async ({ baseUrl, initialProbe }) => {
  const parsedBaseUrl = new URL(baseUrl);
  const hostname = normalizeHostname(parsedBaseUrl.hostname);

  if (initialProbe.ok || !isLocalHostname(hostname)) {
    return {
      baseUrl,
      reusedRequestedPort: true,
      reason: null,
    };
  }

  const defaultPort = parsedBaseUrl.protocol === "https:" ? 443 : 80;
  const requestedPort = Number.parseInt(parsedBaseUrl.port || String(defaultPort), 10);

  if (await canBindPort({ host: hostname, port: requestedPort })) {
    return {
      baseUrl,
      reusedRequestedPort: true,
      reason: initialProbe.error ?? null,
    };
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

const waitForBaseUrl = async ({ baseUrl, timeoutMs, child, logPath }) => {
  const startedAt = Date.now();
  let lastProbe = null;

  while (Date.now() - startedAt < timeoutMs) {
    lastProbe = await probeBaseUrl(baseUrl);
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

const stopDevServer = async (child) => {
  if (!child || child.exitCode != null) {
    return;
  }

  child.kill("SIGTERM");

  const startedAt = Date.now();
  while (child.exitCode == null && Date.now() - startedAt < 5000) {
    await wait(100);
  }

  if (child.exitCode == null) {
    child.kill("SIGKILL");
  }
};

const startDevServer = async ({ baseUrl, outDir, devScript }) => {
  const parsedBaseUrl = new URL(baseUrl);
  const host = parsedBaseUrl.hostname;
  const port = parsedBaseUrl.port || (parsedBaseUrl.protocol === "https:" ? "443" : "80");

  await mkdir(outDir, { recursive: true });

  const logPath = path.resolve(process.cwd(), outDir, "ui-iterate.dev.log");
  const logStream = createWriteStream(logPath, { flags: "w" });
  const child = spawn(
    "bun",
    ["run", devScript, "--", "--hostname", host, "--port", port],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);

  return { child, logPath };
};

const run = async () => {
  let startedServer = null;
  let captureBaseUrl = options.baseUrl;

  try {
    const initialProbe = await probeBaseUrl(options.baseUrl);
    if (!initialProbe.ok) {
      if (!shouldAutoStartDev) {
        await ensureBaseUrlReachable(options.baseUrl);
      }

      const autoStartTarget = await resolveAutoStartBaseUrl({
        baseUrl: options.baseUrl,
        initialProbe,
      });
      captureBaseUrl = autoStartTarget.baseUrl;

      if (!autoStartTarget.reusedRequestedPort && autoStartTarget.reason) {
        console.log(
          `Base URL ${options.baseUrl} is not capture-safe (${autoStartTarget.reason}). Starting a clean dev server at ${captureBaseUrl} instead.`,
        );
      } else {
        console.log(`Starting dev server with \`bun run ${devScript}\` for ${captureBaseUrl}`);
      }

      startedServer = await startDevServer({
        baseUrl: captureBaseUrl,
        outDir: options.outDir,
        devScript,
      });
      await waitForBaseUrl({
        baseUrl: captureBaseUrl,
        timeoutMs,
        child: startedServer.child,
        logPath: startedServer.logPath,
      });
    }

    const captures = await captureTargets({
      ...options,
      baseUrl: captureBaseUrl,
    });
    const artifacts = await writeCaptureArtifacts({
      baseUrl: captureBaseUrl,
      outDir: options.outDir,
      captures: captures.map((capture) => ({
        ...capture,
        url: new URL(capture.path, captureBaseUrl).toString(),
      })),
    });

    console.log(`Gallery: ${artifacts.galleryPath}`);
    console.log(`Manifest: ${artifacts.manifestPath}`);
    if (startedServer) {
      console.log(`Dev log: ${startedServer.logPath}`);
    }
  } finally {
    await stopDevServer(startedServer?.child);
  }
};

run().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
