import type { ReactNode } from "react";

const widthClassNames = {
  standard: "weather-page-shell-standard",
  wide: "weather-page-shell-wide",
} as const;

type HubPageShellProps = {
  children: ReactNode;
  width?: keyof typeof widthClassNames;
};

type HubHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  actionLayout?: "wrap" | "stacked-mobile";
  aside?: ReactNode;
  stats?: Array<{
    label: string;
    value: string;
    detail?: string;
  }>;
  statsVariant?: "hub" | "report";
};

type HubSectionProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function HubPageShell({ children, width = "wide" }: HubPageShellProps) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={`weather-page-shell ${widthClassNames[width]} weather-hub-shell`}
    >
      <div className="weather-hub-backdrop" aria-hidden="true" />
      {children}
    </main>
  );
}

export function HubHero({
  eyebrow,
  title,
  description,
  actions,
  actionLayout = "wrap",
  aside,
  stats,
  statsVariant = "hub",
}: HubHeroProps) {
  return (
    <section className="weather-hub-hero">
      <div className="space-y-5">
        <div className="space-y-3">
          <p className="weather-hub-eyebrow">{eyebrow}</p>
          <h1 className="weather-hub-title">{title}</h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-200 sm:text-[15px]">
            {description}
          </p>
        </div>
        {actions ? (
          <div
            className={
              actionLayout === "stacked-mobile"
                ? "flex flex-col gap-3 sm:flex-row sm:flex-wrap"
                : "flex flex-wrap gap-3"
            }
          >
            {actions}
          </div>
        ) : null}
        {stats?.length ? (
          statsVariant === "report" ? (
            <div className="grid gap-2 sm:grid-cols-3">
              {stats.map((item) => (
                <div key={item.label} className="weather-stat-card">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">{item.value}</p>
                  {item.detail ? <p className="mt-1 text-xs leading-5 text-slate-300">{item.detail}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="weather-hub-stat-grid">
              {stats.map((item) => (
                <div key={item.label} className="weather-hub-stat">
                  <p className="weather-hub-stat-label">{item.label}</p>
                  <p className="weather-hub-stat-value">{item.value}</p>
                  {item.detail ? <p className="text-xs leading-5 text-slate-300">{item.detail}</p> : null}
                </div>
              ))}
            </div>
          )
        ) : null}
      </div>
      {aside ? <div className="weather-hub-sidecar">{aside}</div> : null}
    </section>
  );
}

export function HubSection({
  id,
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: HubSectionProps) {
  return (
    <section
      id={id}
      className={`weather-hub-section${className ? ` ${className}` : ""}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          {eyebrow ? <p className="weather-hub-section-eyebrow">{eyebrow}</p> : null}
          <h2 className="text-xl font-semibold text-white sm:text-2xl">{title}</h2>
          {description ? <p className="max-w-3xl text-sm leading-7 text-slate-300">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
