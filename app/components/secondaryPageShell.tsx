import type { ReactNode } from "react";

/* No eyebrow on either (2026-10-09). "Reading list" over a question and "Page not
   found" over "That page moved." were the last two; the title carries the page. */
type SecondaryPageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

type SecondaryPageSectionProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

const joinClasses = (...values: Array<string | undefined>) => values.filter(Boolean).join(" ");

export function SecondaryPageHeader({
  title,
  description,
  actions,
}: SecondaryPageHeaderProps) {
  return (
    <section className="weather-panel weather-secondary-header">
      <div className="weather-secondary-heading">
        <h1 className="weather-secondary-title">{title}</h1>
        {description ? <p className="weather-secondary-description">{description}</p> : null}
        {actions ? <div className="weather-secondary-actions">{actions}</div> : null}
      </div>
    </section>
  );
}

export function SecondaryPageSection({
  title,
  description,
  actions,
  children,
  className,
}: SecondaryPageSectionProps) {
  return (
    <section className={joinClasses("weather-panel weather-secondary-section", className)}>
      {title || description || actions ? (
        <div className="weather-secondary-section-header">
          {title ? <h2 className="weather-secondary-section-title">{title}</h2> : null}
          {description ? <p className="weather-secondary-section-description">{description}</p> : null}
          {actions ? <div className="weather-secondary-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
