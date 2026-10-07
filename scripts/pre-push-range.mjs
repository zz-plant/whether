#!/usr/bin/env node
/**
 * Prints the commit range a `git push` is about to send, for the review preflight.
 *
 * Git writes one `<local ref> <local sha> <remote ref> <remote sha>` line per ref to a
 * pre-push hook's stdin. For the first real update, `<remote sha> <local sha>` is exactly
 * the commits being sent; the local sha matters because the pushed ref need not be the one
 * checked out. Prints nothing when no line qualifies (a new branch, a deletion, no input),
 * and the hook keeps the preflight's default base.
 */

import { pathToFileURL } from "node:url";

const ZEROS = /^0+$/;

/** The `{ base, head }` of the first ref update in a pre-push stdin plan, or null. */
export function parsePrePushRange(text) {
  for (const line of text.split("\n")) {
    const [localRef, localSha, , remoteSha] = line.trim().split(/\s+/);
    if (!localRef || !localSha) continue;
    if (ZEROS.test(localSha)) continue; // a deletion sends nothing
    if (!remoteSha || ZEROS.test(remoteSha)) continue; // a new branch has no prior remote state
    return { base: remoteSha, head: localSha };
  }
  return null;
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
  if (range) process.stdout.write(`${range.base} ${range.head}\n`);
}
