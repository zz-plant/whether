/**
 * Every check `scripts/run-checks.mjs` can run, and the named sets the gates run.
 *
 * Each list exists once, here: `.husky/pre-push` runs `--preset pre-push` and
 * `check:vinext` runs `--preset deploy`. `tests/deployGateTestScope.test.ts` holds every
 * consumer to this file. Side-effect free: the tests import this, not `run-checks.mjs`.
 *
 * Why each task is in or out of a gate: docs/agents/lessons/toolchain-and-gates.md and
 * docs/agents/lessons/automation-and-deploy-gate.md.
 */
import { isDeployGate } from "./deploy-gate.mjs";

/** Declaration order is run order and report order, whatever order a caller names them in. */
const CHECK_TASKS = [
  { name: "lint", script: "lint" },
  // Type-aware oxlint: slowest task, has flaked once, so pre-push and `check` but not deploy.
  { name: "lint:types", script: "lint:types" },
  { name: "typecheck", script: "typecheck" },
  { name: "test", script: "test" },
  { name: "assets", script: "assets:check" },
  // Counts the suppressions that could turn every other ratchet green without a fix.
  { name: "suppressions", script: "check:suppressions" },
  // Exports nothing references, held at zero.
  { name: "dead-exports", script: "check:dead-exports" },
  // Hand-curated series have no live fetcher; warn-only (see the script header).
  { name: "curated-freshness", script: "check:curated-freshness" },
  // Gated at `critical`: the highs are dev-only transitives, and a permanently red check is worthless.
  { name: "audit", script: "audit" },
  { name: "hotspot-preflight", script: "review:hotspot-preflight" },
  // Boots a dev server and fetches every route: the skip-link target is assembled at request time.
  { name: "landmarks", script: "check:landmarks" },
];

/**
 * A preset is one or more stages. Tasks in a stage run together; a stage runs only
 * after every task in the one before it passed, the way `a && b` would.
 */
const CHECK_PRESETS = {
  // Everything but `audit` (network; a hook that fails offline teaches --no-verify) and
  // `curated-freshness` (warn-only).
  "pre-push": {
    deployGate: false,
    stages: [
      [
        "lint",
        "lint:types",
        "typecheck",
        "test",
        "assets",
        "suppressions",
        "dead-exports",
        "hotspot-preflight",
        "landmarks",
      ],
    ],
  },
  /*
   * `bun run check:vinext`, which Workers Builds runs on every push before anything is
   * built or deployed. Not `lint:types` (might flake where nobody is watching), `audit`
   * (network) or `hotspot-preflight` (git history). The landmark audit is its own stage: it
   * spawns a dev server, and on a small box one competing with lint, tsc and the suite turns
   * a slow route into one that "never answered".
   */
  deploy: {
    deployGate: true,
    stages: [["lint", "typecheck", "test", "assets", "suppressions", "dead-exports"], ["landmarks"]],
  },
};

const taskNames = () => CHECK_TASKS.map((task) => task.name).join(", ");

/** The tasks named, in declaration order. Throws on a name that is not a task. */
const selectTasks = (names) => {
  const unknown = names.filter((name) => !CHECK_TASKS.some((task) => task.name === name));
  if (unknown.length > 0) {
    throw new Error(`Unknown check(s): ${unknown.join(", ")}\nAvailable: ${taskNames()}`);
  }
  return CHECK_TASKS.filter((task) => names.includes(task.name));
};

const presetFor = (name) => {
  const preset = Object.hasOwn(CHECK_PRESETS, name) ? CHECK_PRESETS[name] : undefined;
  if (!preset) {
    throw new Error(`Unknown preset: ${name}\nAvailable: ${Object.keys(CHECK_PRESETS).join(", ")}`);
  }
  return preset;
};

/** Every task a preset runs, across its stages, in run order. */
export function presetTasks(name) {
  return presetFor(name).stages.flatMap((stage) => selectTasks(stage).map((task) => task.name));
}

/**
 * What a `run-checks.mjs` invocation runs.
 *
 *   (no names)          every task, one stage
 *   <name>...           those tasks, one stage, in declaration order
 *   --preset <preset>   that preset's stages (also `--preset=<preset>`)
 *   --serial            fail-fast sequencing within a stage (or CHECK_SERIAL=1)
 *
 * `deployGate` is true for a preset that is the deploy gate, or when the caller already
 * runs under the signal. Any other flag is ignored. Throws on an unknown task or preset.
 */
export function resolveCheckPlan(args, env = process.env) {
  let serial = env.CHECK_SERIAL === "1";
  let presetName = null;
  const names = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--serial") serial = true;
    else if (arg === "--preset") {
      presetName = args[index + 1] ?? "";
      index += 1;
    } else if (arg.startsWith("--preset=")) presetName = arg.slice("--preset=".length);
    else if (!arg.startsWith("-")) names.push(arg);
  }

  if (presetName === null) {
    return {
      stages: [names.length > 0 ? selectTasks(names) : [...CHECK_TASKS]],
      serial,
      deployGate: isDeployGate(env),
    };
  }

  if (names.length > 0) {
    throw new Error(`Pass a preset or check names, not both (got --preset ${presetName} and ${names.join(", ")}).`);
  }

  const preset = presetFor(presetName);
  return {
    stages: preset.stages.map((stage) => selectTasks(stage)),
    serial,
    deployGate: preset.deployGate || isDeployGate(env),
  };
}
