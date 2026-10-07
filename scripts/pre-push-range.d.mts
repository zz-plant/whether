/**
 * The remote sha of the first ref update in a pre-push hook's stdin plan
 * ("<local ref> <local sha> <remote ref> <remote sha>" per line), or null when no line
 * qualifies (a new branch, a deletion, no input).
 */
export function parsePrePushBase(text: string): string | null;
