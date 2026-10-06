/**
 * The one place the deploy-gate signal is read and set.
 *
 * `WHETHER_DEPLOY_GATE=1` marks a run as inside the deploy path — the `deploy` preset of
 * `scripts/run-checks.mjs`, which Workers Builds runs as `bun run check:vinext`, and the
 * inner gate `scripts/vinext-run.mjs` runs before a preview build. What it changes is
 * spread across the scripts that read it, which is why the read lives here once:
 *
 * - `run-checks.mjs` refuses a tree that is not its commit, and records what passed
 *   (`check-gate-marker.mjs`) so the inner gate does not repeat it;
 * - `run-tests.mjs` gives each test a 120s ceiling, shuffles the order, and leaves out
 *   `tests/tools/`;
 * - `check-main-content-landmarks.mjs` gives readiness and each route a cold-start bound.
 *
 * Only exactly "1" counts. docs/agents/lessons/automation-and-deploy-gate.md has the history.
 */
const DEPLOY_GATE_VARIABLE = "WHETHER_DEPLOY_GATE";

/** Whether this run is inside the deploy gate. */
export const isDeployGate = (env = process.env) => env[DEPLOY_GATE_VARIABLE] === "1";

/** `env` with the deploy-gate signal set, for a child that must run under the gate's rules. */
export const withDeployGate = (env = process.env) => ({ ...env, [DEPLOY_GATE_VARIABLE]: "1" });
