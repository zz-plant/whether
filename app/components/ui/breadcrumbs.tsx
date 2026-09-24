import Link from "next/link";
import type { Route } from "../../../lib/navigation/routeType";
import { buildCanonicalUrl } from "../../../lib/seo";
import { JsonLdScript } from "../jsonLdScript";

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

  /* The trail as structured data, from the same items the reader sees. Eleven
     routes drew a breadcrumb and only two described one, and one of those two
     described a different trail (Home › Week, over a visible Home › History ›
     Week). The current page, last and unlinked, carries no `item`, which
     schema.org allows for the final crumb. A trail with an unlinked crumb
     before the last has no URL to give it, so it emits nothing. */
  const describable = items.every((item, index) => index === items.length - 1 || item.href);
  const structuredData = describable && items.length > 1
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.label,
          ...(item.href ? { item: buildCanonicalUrl(item.href) } : {}),
        })),
      }
    : null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      {structuredData ? <JsonLdScript data={structuredData} /> : null}
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
