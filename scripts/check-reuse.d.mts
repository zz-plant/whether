/** A worktree's recorded passes: which tree they are for, and when each task passed on it. */
export type PassRecord = { version: number; fingerprint: string; passes: Record<string, number> };

/** How long a recorded pass stands, in milliseconds. */
export const REUSE_WINDOW_MS: number;

/** The variable that rules reuse out for this run, or `null`. */
export function reuseBlockedBy(env?: Record<string, string | undefined>): string | null;

/** How long ago `task` passed on the tree `fingerprint` names, or `null` when no recorded pass stands. */
export function passAge(record: PassRecord | null, fingerprint: string | null, task: string, now?: number): number | null;

/** `record` with `tasks` passing at `now` on `fingerprint`; a record for another tree is dropped. */
export function withPasses(record: PassRecord | null, fingerprint: string, tasks: string[], now?: number): PassRecord;

/** The run's handle on the record, or `null` when reuse cannot apply. */
export function openReuse(options?: {
  cwd?: string;
  env?: Record<string, string | undefined>;
  now?: () => number;
}): { ageOf: (task: string) => number | null; record: (tasks: string[]) => boolean } | null;
