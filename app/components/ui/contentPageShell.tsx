import type { ComponentProps } from "react";

/* The reading frame: the outer <main> for every page that is read rather than
 * operated — answers, toolkits, resources and their articles, signal clusters,
 * history periods, the published brief record, calibration, concepts,
 * decisions, about, contact and the 404. The report routes (/signals, /trust,
 * /operate, /resolve, /history) use `ReportShell`; those are the two frames.
 *
 * Until 2026-10-06 the reading pages were split across this, a
 * `SecondaryPageShell` with its own widths and a navy backdrop, and five
 * hand-rolled <main>s. The hand-rolled ones carried no `id`, so the layout's
 * skip link went nowhere on the brief record, about, contact and the resource
 * articles.
 *
 * Twelve call sites carried this exact class chain, character for character.
 * That is less a styling detail than a layout contract: these pages are meant
 * to share a measure, a rhythm and a set of mobile paddings, and a chain copied
 * twelve times drifts one page at a time the moment someone tunes a single
 * route. Kept as a component so changing the contract is one edit.
 *
 * className and id are deliberately not accepted — escape hatches are how the
 * layout and landmark contracts drift. Everything else a <main> takes is
 * forwarded because several routes hang `data-content-measurement-root` /
 * `data-page-cluster` attributes off the same element for instrumentation.
 */
const measureClassNames = {
  /* Tables and side columns: calibration, concepts, decisions, the articles' rail. */
  wide: "max-w-6xl",
  content: "max-w-4xl",
  prose: "max-w-3xl",
} as const;

type ContentPageShellProps = Omit<ComponentProps<"main">, "className" | "id"> & {
  measure?: keyof typeof measureClassNames;
};

export function ContentPageShell({
  children,
  measure = "content",
  ...mainProps
}: ContentPageShellProps) {
  return (
    <main
      {...mainProps}
      id="main-content"
      tabIndex={-1}
      className={`mx-auto flex w-full ${measureClassNames[measure]} flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10`}
    >
      {children}
    </main>
  );
}
