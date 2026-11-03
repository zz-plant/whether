/**
 * The commit range of the first ref update in a pre-push hook's stdin plan
 * ("<local ref> <local sha> <remote ref> <remote sha>" per line): the remote sha as `base`,
 * the local sha as `head`, and the ref being updated on the remote. Null when no line
 * qualifies (a new branch, a deletion, no input).
 */
export function parsePrePushRange(text: string): { base: string; head: string; remoteRef: string } | null;

/**
 * The base a push is judged against: the remote sha, unless the push brings main into a
 * branch, when it is the merge-base with main. A push to main is always its remote sha.
 */
export function resolvePushBase(input: {
  remoteSha: string;
  remoteRef: string;
  mergeBase: string;
  remoteHasMergeBase: boolean;
}): string;
