/** Line numbers (1-based) of every line in `source` that sits inside a comment. */
export function blockCommentLines(source: string): Set<number>;

/** Whether one line of code carries a type assertion, ignoring comments and quoted prose. */
export function isUnsafeAssertion(code: string): boolean;

/**
 * The commit the working tree is compared with: an explicit ref, else the merge-base with
 * main when it is not HEAD itself, else `HEAD~1`, else `HEAD` in a repository with one commit.
 */
export function resolveDiffBase(input: {
  explicit?: string;
  mergeBase?: string;
  head?: string;
  hasParent?: boolean;
}): string;
