/**
 * Which ends of a sideways-scrolling row have content past them.
 *
 * Two phone rows scroll sideways under the header: a group's page tabs (`SectionTabs`)
 * and the section chips. A row that silently clips reads as broken labels ("Test a c",
 * "Finance s") rather than as something that scrolls, so each fades an edge exactly
 * while something sits beyond it (DD-001). Both measure the same way, here.
 */
type RowEdges = { start: boolean; end: boolean };

const readRowEdges = (row: Pick<HTMLElement, "scrollLeft" | "scrollWidth" | "clientWidth">): RowEdges => {
  const maxScrollLeft = row.scrollWidth - row.clientWidth;
  return { start: row.scrollLeft > 1, end: row.scrollLeft < maxScrollLeft - 1 };
};

/** Calls `onChange` now and on every scroll of the row and resize of the window; returns the cleanup. */
export const watchRowEdges = (row: HTMLElement, onChange: (edges: RowEdges) => void): (() => void) => {
  const sync = () => onChange(readRowEdges(row));
  sync();
  row.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync, { passive: true });
  return () => {
    row.removeEventListener("scroll", sync);
    window.removeEventListener("resize", sync);
  };
};
