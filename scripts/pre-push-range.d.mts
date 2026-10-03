/**
 * The commit range a `git push` is about to send, parsed from the pre-push
 * hook's stdin plan ("<local ref> <local sha> <remote ref> <remote sha>" per
 * line). Returns null when no line qualifies — a new branch, a deletion, or no
 * input — which is the hook's signal to keep the preflight's default range.
 */
export function parsePrePushRange(text: string): { base: string; head: string } | null;
