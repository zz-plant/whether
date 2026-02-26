import type { Route } from "next";
import Link from "next/link";

type RelatedReportLink = {
  href: Route;
  label: string;
  description?: string;
};

export const RelatedReportLinks = ({
  title = "Related pages",
  links,
  variant = "full",
}: {
  title?: string;
  links: RelatedReportLink[];
  variant?: "full" | "compact";
}) => {
  if (variant === "compact") {
    return (
      <section className="weather-panel space-y-3 px-6 py-5" aria-label={title}>
        <h2 className="text-sm font-semibold tracking-[0.16em] text-slate-300">{title}</h2>
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.14em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="weather-panel space-y-3 px-6 py-5" aria-label={title}>
      <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">Related pages</p>
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="weather-surface space-y-2 p-4 transition-colors hover:border-sky-400/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
          >
            <p className="text-sm font-semibold text-slate-100">{link.label}</p>
            {link.description ? <p className="text-sm text-slate-300">{link.description}</p> : null}
            <p className="text-xs font-semibold tracking-[0.14em] text-sky-200">Open {link.label} →</p>
          </Link>
        ))}
      </div>
    </section>
  );
};
