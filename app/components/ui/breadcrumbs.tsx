import Link from "next/link";
import type { Route } from "../../../lib/navigation/routeType";

type BreadcrumbEntry = {
  label: string;
  href?: Route;
};

export function Breadcrumbs({
  items,
  className = "",
}: {
  items: BreadcrumbEntry[];
  className?: string;
}) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.href ?? item.label}-${index}`} className="inline-flex items-center gap-1.5">
              {index > 0 ? (
                <span className="text-slate-600 select-none text-fluid-xs" aria-hidden="true">
                  /
                </span>
              ) : null}
              {isLast || !item.href ? (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className="font-medium text-slate-200 truncate max-w-[240px] sm:max-w-none"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-slate-400 hover:text-slate-200 transition-colors rounded-[var(--radius-sm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
