import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const BUILD_META_PATH = join(".vercel", "output", "static", "_worker.js", "build-meta.json");

const run = (command, args, env = process.env) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
    env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runCapture = (command, args, env = process.env) =>
  spawnSync(command, args, {
    stdio: "pipe",
    shell: true,
    env,
    encoding: "utf8",
  });

const readBuildMeta = () => {
  if (!existsSync(BUILD_META_PATH)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(BUILD_META_PATH, "utf8"));
  } catch {
    return null;
  }
};

const currentCommitSha =
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  null;

const buildMeta = readBuildMeta();
const hasMatchingCommit =
  Boolean(currentCommitSha) &&
  Boolean(buildMeta?.commitSha) &&
  buildMeta.commitSha === currentCommitSha;
const hasReusableOutput =
  Boolean(buildMeta?.buildTarget === "cloudflare") &&
  Boolean(buildMeta?.useNextOnPages) &&
  Boolean(buildMeta?.workerIndexExists) &&
  Boolean(buildMeta?.commandSucceeded) &&
  hasMatchingCommit;

if (hasReusableOutput) {
  run("bun", ["run", "build:pages:skip-next-build"]);
} else {
  run("bun", ["run", "build:pages"]);
}

const workerUpload = runCapture("bunx", ["wrangler", "versions", "upload"]);
if (workerUpload.stdout) {
  process.stdout.write(workerUpload.stdout);
}
if (workerUpload.stderr) {
  process.stderr.write(workerUpload.stderr);
}

if (workerUpload.status === 0) {
  process.exit(0);
}

const combinedOutput = `${workerUpload.stdout ?? ""}\n${workerUpload.stderr ?? ""}`;
const workerTooLarge =
  combinedOutput.includes("exceeded the size limit of 10 MiB") || combinedOutput.includes("code: 10027");

if (!workerTooLarge) {
  process.exit(workerUpload.status ?? 1);
}

const pagesProjectName = process.env.CLOUDFLARE_PAGES_PROJECT ?? process.env.CF_PAGES_PROJECT_NAME;
if (!pagesProjectName) {
  console.error(
    "\nWorker upload failed due to 10 MiB size limit. Set CLOUDFLARE_PAGES_PROJECT (or CF_PAGES_PROJECT_NAME) to enable automatic fallback to wrangler pages deploy.",
  );
  process.exit(workerUpload.status ?? 1);
}

console.warn(
  `\nWorker upload exceeded 10 MiB; retrying deployment as Cloudflare Pages project \"${pagesProjectName}\".`,
);
run("bunx", [
  "wrangler",
  "pages",
  "deploy",
  ".vercel/output/static",
  "--project-name",
  pagesProjectName,
]);
