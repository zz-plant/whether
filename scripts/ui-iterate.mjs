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
import { withDevServer } from "./dev-server.lib.mjs";

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

const run = async () => {
  const capture = async (captureBaseUrl, startedServer) => {
    const captures = await captureTargets({
      ...options,
      baseUrl: captureBaseUrl,
    });
    const artifacts = await writeCaptureArtifacts({
      baseUrl: captureBaseUrl,
      outDir: options.outDir,
      theme: options.theme,
      visitor: options.visitor,
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
  };

  // `--no-dev` means the caller is running their own server and wants a clear
  // error rather than a second one started behind their back.
  if (!shouldAutoStartDev) {
    await ensureBaseUrlReachable(options.baseUrl);
    return capture(options.baseUrl, null);
  }

  return withDevServer({
    baseUrl: options.baseUrl,
    outDir: options.outDir,
    devScript,
    logName: "ui-iterate.dev.log",
    timeoutMs,
    // A --base-url the caller passed names the thing to capture; the default is
    // this checkout's own server, which the ownership rule picks or starts.
    explicitBaseUrl: args.includes("--base-url"),
    probe: probeBaseUrl,
    onStatus: (message) => console.log(message),
    body: capture,
  });
};

run().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
