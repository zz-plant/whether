/** The checked-out branch, or "" when the checkout is detached or git is unavailable. */
export function resolveBranchFromGit(): string;

/**
 * Whether a build should run the check suite first. Preview builds gate; production
 * builds and unknown branches do not, so a flaky test can never block a deploy.
 */
export function shouldRunChecks(
  env?: Record<string, string | undefined>,
  gitBranch?: () => string,
): { run: boolean; reason: string };
