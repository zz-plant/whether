import type { ReactNode } from "react";

const widthClassNames = {
  compact: "weather-page-shell-compact",
  narrow: "weather-page-shell-narrow",
  standard: "weather-page-shell-standard",
  wide: "weather-page-shell-wide",
} as const;

type SecondaryPageShellProps = {
  children: ReactNode;
  width?: keyof typeof widthClassNames;
};

type SecondaryPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  aside?: ReactNode;
};

type SecondaryPageSectionProps = {
  title?: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

const joinClasses = (...values: Array<string | undefined>) => values.filter(Boolean).join(" ");

export function SecondaryPageShell({
  children,
  width = "standard",
}: SecondaryPageShellProps) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={joinClasses("weather-page-shell weather-secondary-shell", widthClassNames[width])}
    >
      <div className="weather-secondary-shell-backdrop" aria-hidden="true" />
      {children}
    </main>
  );
}

export function SecondaryPageHeader({
  eyebrow,
  title,
  description,
  actions,
  aside,
}: SecondaryPageHeaderProps) {
  return (
    <section className="weather-panel weather-secondary-header">
      <div className="weather-secondary-header-layout">
        <div className="weather-secondary-heading">
          {eyebrow ? <p className="weather-secondary-eyebrow">{eyebrow}</p> : null}
          <h1 className="weather-secondary-title">{title}</h1>
          {description ? <p className="weather-secondary-description">{description}</p> : null}
          {actions ? <div className="weather-secondary-actions">{actions}</div> : null}
        </div>
        {aside ? <div className="weather-secondary-aside">{aside}</div> : null}
      </div>
    </section>
  );
}

export function SecondaryPageSection({
  title,
  description,
  eyebrow,
  actions,
  children,
  className,
}: SecondaryPageSectionProps) {
  return (
    <section className={joinClasses("weather-panel weather-secondary-section", className)}>
      {title || description || eyebrow || actions ? (
        <div className="weather-secondary-section-header">
          {eyebrow ? <p className="weather-secondary-eyebrow">{eyebrow}</p> : null}
          {title ? <h2 className="weather-secondary-section-title">{title}</h2> : null}
          {description ? <p className="weather-secondary-section-description">{description}</p> : null}
          {actions ? <div className="weather-secondary-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
