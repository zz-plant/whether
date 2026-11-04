/**
 * The section a click landed in: the nearest `data-page-section`, or a `<section>`'s id.
 * Only the id's shape is kept, and "" when there is none, so a stream that carries it holds
 * a name the page chose and never anything a reader typed.
 */
export const PAGE_SECTION_PATTERN = /^[a-z0-9-]{0,64}$/;

export const pageSectionOf = (element: Element): string => {
  const section = element.closest("[data-page-section]")?.getAttribute("data-page-section") ?? element.closest("section[id]")?.id ?? "";
  return PAGE_SECTION_PATTERN.test(section) ? section : "";
};
