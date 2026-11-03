/**
 * The lines (1-based) of `source` that hold an `as` type assertion other than `as const`,
 * read from its syntax tree. `file` picks the grammar. Null when the source does not parse.
 */
export function typeAssertionLines(file: string, source: string): Promise<Set<number> | null>;

/** The line numbers each file gains in a `git diff --unified=0`. */
export function addedLinesByFile(diff: string): Map<string, Set<number>>;

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
