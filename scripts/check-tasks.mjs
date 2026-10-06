/**
 * Every check `scripts/run-checks.mjs` can run, and the named sets the gates run.
 *
 * The gate lists used to be written out four times — `run-checks.mjs` itself, the
 * pre-push hook, `check:vinext` in package.json, and `GATE_TASKS` in `vinext-run.mjs` —
 * and a test compared only two of them. A task added to one and not the others was a
 * task one gate silently stopped running. Each list now exists once, here, and the
 * consumers name a preset: `.husky/pre-push` runs `--preset pre-push`, `check:vinext`
 * runs `--preset deploy`, and `vinext-run.mjs` derives the inner gate's tasks from the
 * deploy preset. `tests/deployGateTestScope.test.ts` holds every consumer to this file.
 *
 * Side-effect free on purpose: `run-checks.mjs` is a command, and `vinext-run.mjs` and
 * the tests import this rather than it.
 */
import { isDeployGate } from "./deploy-gate.mjs";

/** Declaration order is run order and report order, whatever order a caller names them in. */
const CHECK_TASKS = [
  { name: "lint", script: "lint" },
  /*
   * Type-aware oxlint, advisory since 2026-09-06 and enforced from 2026-09-16.
   * It catches what the syntactic pass structurally cannot — a floating promise,
   * a value stringified through `Object.prototype.toString` — and it sat at zero
   * for ten days. It was at zero, rather: the two findings that promoting it
   * surfaced were both in code written the day before, one of them the exact
   * `RequestInfo | URL` trap the burn-down had already cleared from eight test
   * files. Advisory means nobody runs it, which is the whole argument.
   *
   * On pre-push and `bun run check`, not the deploy gate. It reads the type
   * graph, so it is the slowest task here, and docs/agents/lessons/toolchain-and-gates.md records one run that
   * reported findings later runs could not reproduce. A check that might flake
   * belongs where a human is standing next to it, not where the only log is one
   * nobody can read.
   */
  { name: "lint:types", script: "lint:types" },
  { name: "typecheck", script: "typecheck" },
  { name: "test", script: "test" },
  { name: "assets", script: "assets:check" },
  // Guards every other ratchet in this gate. Each one — the disabled-rule
  // burn-down, lint:types, the suite — can be turned green by suppressing the
  // finding instead of fixing it, and no other task here notices. This counts
  // the suppressions themselves, so the shortcut costs more than the fix.
  { name: "suppressions", script: "check:suppressions" },
  // An export nothing references is not a lint finding, a type error, or a
  // failing test, so nothing else here notices one. A 2026-09-15 sweep found
  // 556 of them; this holds the count at zero.
  { name: "dead-exports", script: "check:dead-exports" },
  // The hand-curated macro series have no live fetcher, so nothing in the
  // ingest path refreshes them and nothing else notices when the quarterly
  // curation pass slips. Warn-only by default; see the script header for why.
  { name: "curated-freshness", script: "check:curated-freshness" },
  // Gated at `critical` on purpose. There are currently 38 high advisories, all
  // in transitive dev/build dependencies (picomatch via vinext's glob chain, for
  // one) rather than anything the Worker ships. Blocking on those would make
  // this permanently red, which is exactly how the old dependency-review check
  // became worthless. `bun audit` still prints the full report, so the highs
  // stay visible; only a critical advisory stops the build.
  { name: "audit", script: "audit" },
  { name: "hotspot-preflight", script: "review:hotspot-preflight" },
  // Boots a dev server and fetches every route: the skip-link target is
  // assembled from layouts and shells at request time, so nothing cheaper sees
  // a duplicated or missing <main>.
  { name: "landmarks", script: "check:landmarks" },
];

/**
 * A preset is one or more stages. Tasks in a stage run together; a stage runs only
 * after every task in the one before it passed, the way `a && b` would.
 */
const CHECK_PRESETS = {
  /*
   * `.husky/pre-push`, the check gate since the GitHub workflows went manual-only on
   * 2026-08-22. Everything but two: `audit` needs the network, and a hook that fails
   * offline teaches people to pass --no-verify, so it runs in `bun run check` before a
   * merge instead; `curated-freshness` only warns.
   */
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
   * The deploy gate: `bun run check:vinext`, which Workers Builds runs on every push,
   * `main` included, before anything is built or deployed. Under the deploy-gate signal,
   * so the suite shuffles, takes a longer ceiling and leaves out `tests/tools/`, the tree
   * is refused if it is not its commit, and what passed is recorded for `vinext-run`.
   *
   * Not `lint:types` (it reads the type graph and has reported findings later runs could
   * not reproduce — a check that might flake belongs where someone is watching), not
   * `audit` (network) and not `hotspot-preflight` (git history): each runs on pre-push.
   *
   * The landmark audit is its own stage, after the rest pass. It spawns a dev server and
   * compiles every route against it; on a small box a server competing with lint, tsc and
   * the suite for cores turns a slow route into one that "never answered".
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
 * runs under the signal (`vinext-run.mjs` names its outstanding tasks that way). Any
 * other flag is ignored, as it always was. Throws on an unknown task or preset.
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
