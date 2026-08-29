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
 * className is deliberately not accepted — an escape hatch is how the
 * duplication comes back. Everything else a <main> takes is forwarded, because
 * several of these routes hang `id` and `data-content-measurement-root` /
 * `data-page-cluster` attributes off the same element for instrumentation.
 */
type ContentPageShellProps = Omit<ComponentProps<"main">, "className">;

export function ContentPageShell({ children, ...mainProps }: ContentPageShellProps) {
  return (
    <main
      {...mainProps}
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10"
    >
      {children}
    </main>
  );
}
