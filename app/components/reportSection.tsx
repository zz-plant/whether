import type { ReactNode } from "react";

type ReportSectionProps = {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  variant?: "unified" | "split";
  label?: string;
  headingLevel?: "h2" | "h3" | "h4";
  /**
   * Hide the visible header when an enclosing surface (e.g. a stepper step) already
   * states this section's label, title, and description. The heading is still rendered
   * for screen readers so `aria-labelledby` and the `id` anchor keep working.
   */
  hideHeader?: boolean;
  /**
   * Trailing control for the section header — a toggle, an export link, a count.
   * Without this, any section needing one had to hand-roll the whole wrapper,
   * which is the other reason this component stayed unadopted outside /trust.
   */
  action?: ReactNode;
};

/**
 * A link to this section.
 *
 * Every section on these pages already carries an `id` — the outline sidebar
 * links to them and J/K jumps between them — but nothing exposed one, so a
 * reader who wanted to send a colleague to "What would flip the call" had to
 * hand-edit the URL bar. Section XII makes the case directly: this product's job
 * includes handing someone an artifact.
 *
 * Always visible rather than hover-revealed. Hover-reveal is the docs-site
 * convention, but it hides the affordance entirely on touch, where sharing a
 * link is more likely, not less.
 */
const SectionAnchor = ({ id, title }: { id: string; title: string }) => (
  <a
    href={`#${id}`}
    aria-label={`Link to this section: ${title}`}
    // -my-2 so the 44px target required by section II does not set the height of
    // the heading row it sits in.
    className="weather-section-anchor -my-2 inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md text-base font-normal text-slate-600 no-underline transition-colors hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
  >
    <span aria-hidden="true">#</span>
  </a>
);

export function ReportSection({
  id,
  title,
  description,
  children,
  variant = "unified",
  label,
  headingLevel,
  hideHeader = false,
  action,
}: ReportSectionProps) {
  const headingId = `section-${id}-heading`;
  const HeadingTag = headingLevel || (variant === "unified" ? "h2" : "h4");

  if (variant === "split") {
    // space-y-2, not -4: the header and the body below it are one section drawn
    // as two boxes, so they have to sit closer to each other than the items
    // inside the body (space-y-6) and far closer than the gap between whole
    // sections (reportShell's space-y-10). Previously all three were 16-24px,
    // which is why nothing on these pages chunked.
    return (
      <section id={id} className="space-y-2 scroll-mt-28" aria-labelledby={headingId}>
        {hideHeader ? (
          <HeadingTag id={headingId} className="sr-only">
            {title}
          </HeadingTag>
        ) : (
        <div className="weather-panel relative overflow-hidden px-5 py-4">
          <span
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/35 to-transparent"
            aria-hidden="true"
          />
          {label ? (
            <span className="type-eyebrow text-sky-200/80">
              {label}
            </span>
          ) : null}
          <div className="mt-1 flex items-center gap-1">
            <HeadingTag id={headingId} className="max-w-2xl text-base font-semibold tracking-[-0.02em] text-slate-100 sm:text-lg">
              {title}
            </HeadingTag>
            <SectionAnchor id={id} title={title} />
          </div>
          {description ? (
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-300 sm:text-sm">
              {description}
            </p>
          ) : null}
        </div>
        )}
        {/* No shadow: this body is always inside the report column, and on
            /operate inside a step panel as well. A nested container that casts
            its own shadow reads as floating above the thing containing it —
            the depth ladder in surfaces.css exists to prevent exactly that, and
            cannot see a bespoke one written as a utility. */}
        <div className="rounded border border-slate-800/55 bg-slate-950/35 p-4 sm:p-5">
          <div className="space-y-6">{children}</div>
        </div>
      </section>
    );
  }

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="weather-panel space-y-5 px-5 py-5 scroll-mt-28"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {/* The unified variant used to drop `label` on the floor — only the split
              variant rendered it. Every route that needed an eyebrow above its
              section title therefore hand-rolled the whole section instead of
              using this component, which is a large part of why it only ever got
              adopted on /trust. */}
          {label ? <p className="type-eyebrow mb-1">{label}</p> : null}
          <div className="flex items-center gap-1">
            <HeadingTag id={headingId} className="text-xl font-semibold text-white sm:text-2xl">
              {title}
            </HeadingTag>
            <SectionAnchor id={id} title={title} />
          </div>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
