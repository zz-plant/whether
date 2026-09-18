/**
 * Line numbers (1-based) of every line in `source` that sits inside a comment, so a
 * scanner can tell prose from code by position rather than by re-reading the line.
 */
export function blockCommentLines(source: string): Set<number>;

/** Whether one line of code carries a type assertion, ignoring comments and quoted prose. */
export function isUnsafeAssertion(code: string): boolean;

/**
 * The default range to scan, given what HEAD turns out to be.
 *
 * `HEAD~1` is the first parent, which is the previous commit on an ordinary
 * commit and the pre-merge branch tip on a merge — where it makes the base's
 * own lines read as newly added. A merge takes `HEAD^2...HEAD` instead: the
 * second parent is the branch being merged in, so the range is this branch
 * since it last agreed with the base.
 */
export function resolveDefaultDiffRange(input: {
  hasHeadParent: boolean;
  parentCount: number;
}): string[];

/** Says, in words, which commits and which uncommitted edits a range covers. */
export function describeDiffRange(diffRange: string | string[]): string;
