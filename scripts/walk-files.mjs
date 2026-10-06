/**
 * One recursive directory walk for the scripts that scan this tree.
 *
 * The two census checks, the test runner's discovery guards and the agent index each
 * carried their own copy of this loop, and the copies had drifted in the one way that
 * matters: `check-dead-exports.ts` guarded its `statSync`, because a dangling symlink or
 * a path that vanishes between the `readdirSync` and the stat used to crash the whole
 * census instead of skipping one entry, and `check-suppression-census.ts` called the same
 * `statSync` unguarded. A fix made in one copy is a fix the others never get, so there is
 * one copy.
 *
 * What a caller leaves out is the caller's business (`skip`); what the walk itself
 * promises is that it never throws for the tree's sake. An unreadable directory
 * contributes nothing, and an entry that cannot be stat'ed is skipped. A caller that must
 * not score a partial tree — the dead-export census does refuse one — checks what came
 * back; the walk only reports what it could read.
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** "directory", "file", "other" (socket, FIFO, device), or null when it cannot be read. */
const statKind = (path) => {
  try {
    const stats = statSync(path);
    return stats.isDirectory() ? "directory" : stats.isFile() ? "file" : "other";
  } catch {
    return null;
  }
};

const direntKind = (entry) =>
  entry.isDirectory() ? "directory" : entry.isFile() ? "file" : entry.isSymbolicLink() ? "symlink" : "other";

/**
 * Every regular file under `directory`, as paths joined onto it, in directory-read order.
 *
 * `skip(name, isDirectory)` leaves an entry out, and for a directory everything under it.
 * `followSymlinks` (default true) resolves a link with `stat` and treats it as what it
 * points at, which is what the census checks have always done; false leaves links out, as
 * a plain `Dirent` walk does.
 */
export function walkFiles(directory, { skip = () => false, followSymlinks = true } = {}) {
  const files = [];

  const visit = (current) => {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const path = join(current, entry.name);
      let kind = direntKind(entry);
      if (kind === "symlink") {
        if (!followSymlinks) continue;
        kind = statKind(path);
      }
      if (kind === null || kind === "other") continue;

      const isDirectory = kind === "directory";
      if (skip(entry.name, isDirectory)) continue;

      if (isDirectory) visit(path);
      else files.push(path);
    }
  };

  visit(directory);
  return files;
}
