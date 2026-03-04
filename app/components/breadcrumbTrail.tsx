import Link from "next/link";

type BreadcrumbTrailItem = {
  label: string;
  href?: string;
};

export function BreadcrumbTrail({
  items,
  className,
}: {
  items: BreadcrumbTrailItem[];
  className?: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-slate-300 sm:text-sm">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="inline-flex min-h-[44px] items-center gap-1">
              {index > 0 ? (
                <span aria-hidden="true" className="text-slate-500">
                  / 
                </span>
              ) : null}
              {isCurrent || !item.href ? (
                <span aria-current={isCurrent ? "page" : undefined} className="truncate text-slate-100">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="truncate underline decoration-slate-500/80 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
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
