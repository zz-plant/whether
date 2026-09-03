/**
 * Which outline entry is current.
 *
 * Split out of the sidebar because the bug it replaces was invisible in review:
 * the outline marked a section active with `pathname.includes(section.href)`,
 * where the href is a fragment ("#current-scores") and a pathname never carries
 * one. The branch type-checked, read plausibly, and could not fire — so the
 * table of contents on a 4,000px page never said where the reader was. Logic
 * that decides an active state belongs somewhere a test can reach it.
 */

export const sectionIdFromHref = (href: string): string | null =>
  href.startsWith("#") && href.length > 1 ? href.slice(1) : null;

export const sectionIdsFromHrefs = (hrefs: string[]): string[] =>
  hrefs.map(sectionIdFromHref).filter((id): id is string => id !== null);

/**
 * The topmost on-screen section in document order, or the previous answer when
 * none is on screen.
 *
 * Document order rather than the order the observer reports: entries arrive in
 * whatever order the callback batches them, so picking "the first entry that is
 * intersecting" would make the active item depend on scroll direction. Falling
 * back to `previous` keeps the outline from blanking mid-scroll between two
 * sections, or at the very bottom of a page where the band holds nothing.
 */
export const resolveActiveSectionId = (
  sectionIds: string[],
  onScreenIds: Iterable<string>,
  previous: string | null,
): string | null => {
  const onScreen = new Set(onScreenIds);
  return sectionIds.find((id) => onScreen.has(id)) ?? previous;
};
