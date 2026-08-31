import type { ComponentProps } from "react";

/* The outer <main> for the long-tail content routes — answer, toolkits,
 * resources, signals clusters, history periods.
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
