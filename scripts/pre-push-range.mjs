#!/usr/bin/env node
/**
 * Prints the commit range a `git push` should be judged on, for the review preflight.
 *
 * Git writes one `<local ref> <local sha> <remote ref> <remote sha>` line per ref to a
 * pre-push hook's stdin. For the first real update, `<remote sha> <local sha>` is exactly
 * the commits being sent; the local sha matters because the pushed ref need not be the one
 * checked out. A push that brings main into a branch sends main's commits too, and those
 * are not the branch's work, so its base moves to the merge-base with main (see
 * `resolvePushBase`). Prints nothing when no line qualifies (a new branch, a deletion, no
 * input), and the hook keeps the preflight's default base.
 */

import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const ZEROS = /^0+$/;
const MAIN_REF = "refs/heads/main";

/** The `{ base, head, remoteRef }` of the first ref update in a pre-push stdin plan, or null. */
export function parsePrePushRange(text) {
  for (const line of text.split("\n")) {
    const [localRef, localSha, remoteRef, remoteSha] = line.trim().split(/\s+/);
    if (!localRef || !localSha) continue;
    if (ZEROS.test(localSha)) continue; // a deletion sends nothing
    if (!remoteSha || ZEROS.test(remoteSha)) continue; // a new branch has no prior remote state
    return { base: remoteSha, head: localSha, remoteRef };
  }
  return null;
}

/**
 * The base a push is judged against. Pure, so the choice is tested without a repository:
 * the caller supplies what git said.
 *
 * The remote tip, while it already holds the point where the branch last agreed with main:
 * then the range is the branch's own commits. When it does not, the push brought main in
 * (by a merge or a rebase) and the remote tip would read everything main did as this
 * branch's change, which on 2026-10-27 was 530 files and a failure in code the branch never
 * touched. A remote sha git has never fetched lands here too, since nothing shows it holds
 * the merge-base. A push to main itself is always the commits it sends.
 */
export function resolvePushBase({ remoteSha, remoteRef, mergeBase, remoteHasMergeBase }) {
  if (remoteRef === MAIN_REF || !mergeBase || remoteHasMergeBase) return remoteSha;
  return mergeBase;
}

function mergeBaseWithMain(head) {
  for (const main of ["origin/main", "main"]) {
    const run = spawnSync("git", ["merge-base", head, main], { encoding: "utf8" });
    const sha = (run.stdout ?? "").trim();
    if (run.status === 0 && sha) return sha;
  }
  return "";
}

// Run only when invoked as the command, so importing the parser does not wait on stdin.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const text = await new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });

  const range = parsePrePushRange(text);
  if (range) {
    const mergeBase = mergeBaseWithMain(range.head);
    const remoteHasMergeBase =
      Boolean(mergeBase) &&
      spawnSync("git", ["merge-base", "--is-ancestor", mergeBase, range.base]).status === 0;
    const base = resolvePushBase({ remoteSha: range.base, remoteRef: range.remoteRef, mergeBase, remoteHasMergeBase });
    process.stdout.write(`${base} ${range.head}\n`);
  }
}
