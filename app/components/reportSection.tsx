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
};

export function ReportSection({
  id,
  title,
  description,
  children,
  variant = "unified",
  label,
  headingLevel,
  hideHeader = false,
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
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/80">
              {label}
            </span>
          ) : null}
          <HeadingTag id={headingId} className="mt-1 max-w-2xl text-base font-semibold tracking-[-0.02em] text-slate-100 sm:text-lg">
            {title}
          </HeadingTag>
          {description ? (
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-300 sm:text-sm">
              {description}
            </p>
          ) : null}
        </div>
        )}
        <div className="rounded border border-slate-800/55 bg-slate-950/35 p-4 shadow-[0_18px_34px_-28px_rgba(2,6,23,0.75)] sm:p-5">
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
      <div>
        <HeadingTag id={headingId} className="text-xl font-semibold text-white sm:text-2xl">
          {title}
        </HeadingTag>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
