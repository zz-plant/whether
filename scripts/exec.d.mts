/** A command's stdout, untrimmed. Throws when it cannot run or exits non-zero. */
export function execOutput(command: string, args: string[], cwd?: string): string;

/** A command's stdout, trimmed. */
export function execText(command: string, args: string[], cwd?: string): string;

/** `git status --porcelain` as `{ code, path }` entries. */
export function parseGitStatus(output: string | null | undefined): Array<{ code: string; path: string }>;

/** A tracked path on disk that differs from the commit, with git's status letter. */
export type WorktreeChange = { code: string; path: string };

/**
 * What the working tree holds that its commit does not, or `null` when git cannot answer
 * at all.
 */
export function worktreeDrift(
  cwd?: string,
): { commit: string; tracked: WorktreeChange[]; untracked: string[] } | null;

/** Resets tracked files to HEAD (build containers only) and returns the drift that remains. */
export function restoreTrackedFromHead(
  cwd?: string,
): { commit: string; tracked: WorktreeChange[]; untracked: string[] } | null;

/** The commit a build should report: CI's, else a clean checkout's HEAD, else "". */
export function buildCommit(options?: { env?: Record<string, string | undefined>; cwd?: string }): string;
