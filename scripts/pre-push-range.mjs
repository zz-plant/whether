#!/usr/bin/env node
/**
 * Prints the remote sha a `git push` is about to update, for the review preflight.
 *
 * Git writes one `<local ref> <local sha> <remote ref> <remote sha>` line per ref to a
 * pre-push hook's stdin. The remote sha of the first real update is the base the push
 * should be judged against. Prints nothing when no line qualifies (a new branch, a
 * deletion, no input), and the hook keeps the preflight's default base.
 */

import { pathToFileURL } from "node:url";

const ZEROS = /^0+$/;

/** The remote sha of the first ref update in a pre-push stdin plan, or null. */
export function parsePrePushBase(text) {
  for (const line of text.split("\n")) {
    const [localRef, localSha, , remoteSha] = line.trim().split(/\s+/);
    if (!localRef || !localSha) continue;
    if (ZEROS.test(localSha)) continue; // a deletion sends nothing
    if (!remoteSha || ZEROS.test(remoteSha)) continue; // a new branch has no prior remote state
    return remoteSha;
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

  const base = parsePrePushBase(text);
  if (base) process.stdout.write(`${base}\n`);
}
