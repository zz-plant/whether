import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
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

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  try {
    const initialProbe = await probeBaseUrl(options.baseUrl);
    if (!initialProbe.ok) {
      if (!shouldAutoStartDev) {
        await ensureBaseUrlReachable(options.baseUrl);
      }

      console.log(`Starting dev server with \`bun run ${devScript}\` for ${options.baseUrl}`);
      startedServer = await startDevServer({
        baseUrl: options.baseUrl,
        outDir: options.outDir,
        devScript,
      });
      await waitForBaseUrl({
        baseUrl: options.baseUrl,
        timeoutMs,
        child: startedServer.child,
        logPath: startedServer.logPath,
      });
    }

    const captures = await captureTargets(options);
    const artifacts = await writeCaptureArtifacts({
      baseUrl: options.baseUrl,
      outDir: options.outDir,
      captures,
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
