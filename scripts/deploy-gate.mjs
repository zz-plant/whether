/**
 * The one place the deploy-gate signal is read and set.
 *
 * `WHETHER_DEPLOY_GATE=1` marks a run as inside the deploy path: the `deploy` preset of
 * `scripts/run-checks.mjs`, which Workers Builds runs as `bun run check:vinext`. Under it,
 * `run-checks.mjs` refuses a tree that is not its commit, `run-tests.mjs` shuffles the suite
 * with a 120s ceiling and leaves out `tests/tools/`, and the landmark audit takes cold-start
 * bounds. Only exactly "1" counts. docs/agents/lessons/automation-and-deploy-gate.md has the
 * history.
 */
const DEPLOY_GATE_VARIABLE = "WHETHER_DEPLOY_GATE";

/** Whether this run is inside the deploy gate. */
export const isDeployGate = (env = process.env) => env[DEPLOY_GATE_VARIABLE] === "1";

/** `env` with the deploy-gate signal set, for a child that must run under the gate's rules. */
export const withDeployGate = (env = process.env) => ({ ...env, [DEPLOY_GATE_VARIABLE]: "1" });
