/**
 * Every regular file under `directory`, as paths joined onto it. Never throws for the
 * tree's sake: an unreadable directory contributes nothing and an entry whose stat fails
 * (a dangling symlink, a path removed mid-walk) is skipped.
 */
export function walkFiles(
  directory: string,
  options?: {
    /** Leave an entry out; for a directory, everything under it too. */
    skip?: (name: string, isDirectory: boolean) => boolean;
    /** Resolve symlinks and treat them as their target (default), or leave them out. */
    followSymlinks?: boolean;
  },
): string[];
