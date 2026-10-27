/**
 * The commit range of the first ref update in a pre-push hook's stdin plan
 * ("<local ref> <local sha> <remote ref> <remote sha>" per line): the remote sha as `base`
 * and the local sha as `head`. Null when no line qualifies (a new branch, a deletion, no input).
 */
export function parsePrePushRange(text: string): { base: string; head: string } | null;
