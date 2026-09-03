/**
 * The commit under test, or "" when git cannot answer or the tree is dirty — either
 * way there is no commit a record could honestly name, so the marker is disabled.
 */
export function headCommit(cwd?: string): string;

/**
 * Checks already proved for `commit`. Empty whenever nothing is recorded, the record
 * names another commit, or it is too old to trust, so a broken marker costs a repeated
 * run rather than a skipped gate.
 */
export function passedChecks(commit?: string, now?: number): string[];

/** Adds `tasks` to what has passed for `commit`, unioning with any existing record. */
export function recordPassedChecks(tasks: string[], commit?: string): boolean;
