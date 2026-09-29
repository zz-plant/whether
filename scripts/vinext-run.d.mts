/** The checked-out branch, or "" when the checkout is detached or git is unavailable. */
export function resolveBranchFromGit(): string;

/**
 * Whether this build must prove the checks before building.
 *
 * Only preview builds do. Production is gated too, but by the configured build
 * command (`check:vinext`), which runs on every push before anything is built —
 * this is the inner arrival, reached from the deploy command afterwards. See
 * docs/agents/lessons/automation-and-deploy-gate.md for why the two-gate shape once read as "production skips the gate".
 */
export function shouldRunChecks(
  env?: Record<string, string | undefined>,
  gitBranch?: () => string,
): { run: boolean; reason: string };

/** The checks that must have passed before a build proceeds. */
export const GATE_TASKS: string[];

/** Which of `GATE_TASKS` are not covered by what has already passed for this commit. */
export function outstandingChecks(alreadyPassed?: string[]): string[];
