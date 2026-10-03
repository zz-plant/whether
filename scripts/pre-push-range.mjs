#!/usr/bin/env node
/**
 * Prints the commit range a `git push` is about to send, for the review preflight.
 *
 * Git writes one `<local ref> <local sha> <remote ref> <remote sha>` line per ref
 * it is about to update to a pre-push hook's stdin. The first line with a real
 * local sha and a real remote sha describes an update, and
 * `<remote sha> <local sha>` is exactly the commits being sent — which is what a
 * pre-push review should read. The preflight's default range (last commit plus
 * every uncommitted edit) gets both sides wrong for a push: it judges other
 * sessions' in-flight work that is not being sent, and it never sees commits
 * 2..n of a multi-commit push, which the deploy gate does not re-check either.
 *
 * Prints nothing when no line qualifies: a new branch has no remote sha to
 * review against, a deletion sends nothing, and no input is no push. The hook
 * keeps its default range in every one of those cases. A remote sha the local
 * repo has never fetched can still name a base — the preflight verifies the ref
 * before using it and falls back the same way.
 *
 * The pre-push hook exports the pair as REVIEW_HOTSPOT_BASE and
 * REVIEW_HOTSPOT_HEAD. Parsing is exported pure so the hook's stdin contract is
 * pinned by a test rather than living only in shell.
 */

import { pathToFileURL } from "node:url";

const ZEROS = /^0+$/;

export function parsePrePushRange(text) {
  for (const line of text.split("\n")) {
    const [localRef, localSha, , remoteSha] = line.trim().split(/\s+/);
    if (!localRef || !localSha) continue;
    // A deletion sends nothing, so there is nothing to review against it.
    if (ZEROS.test(localSha)) continue;
    // A new branch has no prior remote state; the hook's default range covers
    // the branch head and any uncommitted work instead.
    if (!remoteSha || ZEROS.test(remoteSha)) continue;
    return { base: remoteSha, head: localSha };
  }
  return null;
}

// Run only when invoked as the command, so importing the parser for a test does
// not hang on a stdin that never closes.
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
  if (range) process.stdout.write(`${range.base} ${range.head}\n`);
}
