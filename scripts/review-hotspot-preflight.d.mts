/**
 * Line numbers (1-based) of every line in `source` that sits inside a comment, so a
 * scanner can tell prose from code by position rather than by re-reading the line.
 */
export function blockCommentLines(source: string): Set<number>;

/** Whether one line of code carries a type assertion, ignoring comments and quoted prose. */
export function isUnsafeAssertion(code: string): boolean;
