import process from "node:process";
import {
  captureTargets,
  ensureBaseUrlReachable,
  hasFlag,
  listCaptureTargets,
  parseCaptureOptions,
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

const run = async () => {
  await ensureBaseUrlReachable(options.baseUrl);
  const captures = await captureTargets(options);
  const artifacts = await writeCaptureArtifacts({
    baseUrl: options.baseUrl,
    outDir: options.outDir,
    theme: options.theme,
    visitor: options.visitor,
    captures,
  });

  console.log(`Gallery: ${artifacts.galleryPath}`);
  console.log(`Manifest: ${artifacts.manifestPath}`);
};

run().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
