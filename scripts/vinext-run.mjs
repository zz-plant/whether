import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { passedChecks } from "./check-gate-marker.mjs";
import { presetTasks } from "./check-tasks.mjs";
import { withDeployGate } from "./deploy-gate.mjs";

/** The branch whose builds ship to production. */
const PRODUCTION_BRANCH = "main";

/**
 * What must have passed before this build proceeds: every task of the `deploy` preset
 * `check:vinext` runs, because they are the same gate reached from two directions — the
 * build command, and the deploy command that lands here afterwards. Read from the preset
 * (scripts/check-tasks.mjs) rather than written out again, so the two cannot drift.
 */
export const GATE_TASKS = presetTasks("deploy");

/**
 * The gate tasks still owed for this commit.
 *
 * `check:vinext` records what it proved (scripts/check-gate-marker.mjs), so on a
 * normal Workers build this is empty and the build starts immediately instead of
 * repeating a minute of checks the outer command has already run against the same
 * tree. Anything the marker does not cover is still run here, so a build reached
 * some other way is gated exactly as it was before.
 */
export function outstandingChecks(alreadyPassed = passedChecks()) {
  const proven = new Set(alreadyPassed);
  return GATE_TASKS.filter((task) => !proven.has(task));
}

/**
 * Whether a build should run the check suite before building.
 *
 * GitHub Actions has been unable to start a job since the account stopped paying for
 * minutes, so the Cloudflare build is the only remote signal left. Running the suite here
 * turns it into a real gate — but only on preview builds. A production build that fails
 * on a flaky test would block a deploy, and the flakiness in this repo is real: whetherCli
 * tests fail under CPU contention. A pull request's build is the right place to be strict,
 * because being wrong there costs a rerun instead of an outage.
 *
 * Unknown branch means skip. A missing environment variable should never be the reason a
 * deploy is blocked, so the gate fails open — and says so, loudly, in the build log, since
 * a gate that quietly stops running is worse than no gate at all.
 */
export function resolveBranchFromGit() {
  try {
    const result = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" });
    const branch = (result.stdout ?? "").trim();
    // A CI checkout is often detached, where this answers "HEAD" and tells us nothing.
    return branch && branch !== "HEAD" ? branch : "";
  } catch {
    return "";
  }
}

export function shouldRunChecks(env = process.env, gitBranch = resolveBranchFromGit) {
  // Named variables first, git second. The gate was written against WORKERS_CI_BRANCH
  // without being able to confirm the Cloudflare build environment sets it — and a gate
  // that silently stops running is the failure mode to design against, so the branch is
  // read from whatever answers.
  const inRemoteBuild =
    env.WORKERS_CI === "1" ||
    Boolean(env.WORKERS_CI_BUILD_UUID) ||
    env.CI === "1" ||
    env.CI === "true";
  if (!inRemoteBuild) {
    return { run: false, reason: "not a remote build" };
  }

  const branch =
    env.WORKERS_CI_BRANCH ?? env.CF_PAGES_BRANCH ?? env.GITHUB_REF_NAME ?? gitBranch();
  if (!branch) {
    return { run: false, reason: "branch unknown — gate skipped rather than risk the deploy" };
  }

  if (branch === PRODUCTION_BRANCH) {
    return { run: false, reason: `${branch} is the production branch` };
  }

  return { run: true, reason: `preview build for ${branch}` };
}

function main() {
  const args = process.argv.slice(2);
  const [command, ...rest] = args;
  const majorVersion = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);

  if (!command) {
    console.error("Usage: node scripts/vinext-run.mjs <command> [...args]");
    process.exit(1);
  }

  if (majorVersion < 22) {
    console.error(
      `Vinext requires Node >=22. Current runtime is ${process.version}. Switch to Node 22+ before using the Vinext lane.`,
    );
    process.exit(1);
  }

  const vinextCliPath = join(process.cwd(), "node_modules", "vinext", "dist", "cli.js");

  if (!existsSync(vinextCliPath)) {
    console.error(`Unable to locate the Vinext CLI at ${vinextCliPath}. Run bun install first.`);
    process.exit(1);
  }

  if (command === "build") {
    const gate = shouldRunChecks();
    console.log(`[vinext-run] check gate: ${gate.run ? "running" : "skipped"} — ${gate.reason}`);

    if (gate.run) {
      const outstanding = outstandingChecks();

      if (outstanding.length === 0) {
        console.log(
          `[vinext-run] check gate: already proved ${GATE_TASKS.join(", ")} for this commit — not repeating them.`,
        );
      } else {
        console.log(`[vinext-run] check gate: running ${outstanding.join(", ")}.`);

        // The deploy-gate signal tells the test runner it is inside the deploy path,
        // so it leaves out tests/tools/ — suites that drive external interpreters
        // the build image does not guarantee — and gives each test a longer
        // ceiling, because this container is smaller than a dev machine (see
        // scripts/run-tests.mjs). Those tests still run on every `bun run check`
        // and on pre-push; what they must not do is block a deploy over a
        // dependency that cannot affect the built artifact. The outstanding tasks
        // run as one stage, as they always have here.
        const checks = spawnSync("bun", ["scripts/run-checks.mjs", ...outstanding], {
          env: withDeployGate(process.env),
          stdio: "inherit",
        });

        if (checks.status !== 0) {
          console.error("[vinext-run] checks failed — not building.");
          process.exit(checks.status ?? 1);
        }
      }
    }
  }

  const result = spawnSync(process.execPath, ["--no-deprecation", vinextCliPath, command, ...rest], {
    env: process.env,
    stdio: "inherit",
  });

  process.exit(result.status ?? 1);
}

// Run only when invoked as the command, so importing shouldRunChecks for a test does not
// start a build.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
