/**
 * The link a "Copy page link" hands out (2026-11-18). The page's address can carry a
 * hypothetical the reader chose — the conditions chart after two Fed cuts
 * (`?reading=cut-2`, or the old `?counted=1`), the /trust rate moved (`?rate=`) — and a
 * view of their own (`?compare=`, `?trail=`). A teammate opening a pasted link would read the
 * hypothetical as this week's guidance, so those keys stay behind. The area the reader has
 * open (`?decision=`, or its alias `?rule=`) travels, as Copy brief carries it, and so does
 * anything that names the page itself (a time-machine month, a cadence).
 */
const VIEW_ONLY_PARAMS = ["reading", "counted", "rate", "compare", "trail"] as const;

export const shareablePageLink = (href: string): string => {
  const url = new URL(href);
  for (const key of VIEW_ONLY_PARAMS) url.searchParams.delete(key);
  return url.toString();
};
