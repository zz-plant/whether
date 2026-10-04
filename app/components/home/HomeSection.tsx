import type { ReactNode } from "react";

/**
 * One of the homepage's questions, as a section with its own heading.
 *
 * The five answers used to be interleaved inside one hero card; each is a
 * section now, in the reader's order, so a reader who has learned the page can
 * link to, skip or copy one on its own, and J/K can stop on it
 * (`data-page-section`). No box: the section is the outermost thing in the
 * brief column after the hero, and a frame around a table that already has
 * its own rules is a card in a card (§XIII). The heading sits over a hairline,
 * in the section register the report shells use.
 */
export function HomeSection({
  id,
  heading,
  lead,
  action,
  className = "",
  children,
}: {
  id: string;
  heading: string;
  /** One sentence under the heading, when the section has something to say before its table. */
  lead?: ReactNode;
  /** A control that belongs to the whole section, drawn beside the heading. */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      data-page-section={id}
      tabIndex={-1}
      aria-labelledby={headingId}
      className={`weather-section-stack weather-home-section border-t border-slate-800/70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400 ${className}`.trim()}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 id={headingId} className="text-base font-semibold tracking-[-0.02em] text-slate-100 sm:text-lg">
          {heading}
        </h2>
        {action}
      </div>
      {lead ? <p className="max-w-3xl text-fluid-xs leading-5 text-slate-300">{lead}</p> : null}
      {children}
    </section>
  );
}
