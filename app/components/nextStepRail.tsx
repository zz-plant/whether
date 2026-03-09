import Link from "next/link";

const CANONICAL_ACTIONS = [
  { label: "Weekly brief", href: "/" },
  { label: "Learn", href: "/learn" },
  { label: "Review evidence", href: "/signals" },
  { label: "Apply operations", href: "/operations" },
  { label: "Choose decision path", href: "/decide" },
  { label: "Run toolkit", href: "/toolkits" },
  { label: "Inspect methodology", href: "/method" },
] as const;

export function NextStepRail({ currentPath }: { currentPath: string }) {
  return (
    <section className="weather-panel space-y-3 px-6 py-5" aria-label="Next step rail">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Next step</p>
      <div className="flex flex-wrap gap-2">
        {CANONICAL_ACTIONS.map((action) => {
          const isCurrent = action.href === currentPath;

          if (isCurrent) {
            return (
              <span
                key={action.href}
                aria-current="page"
                className="weather-pill inline-flex min-h-[44px] items-center border-sky-300/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-100"
              >
                {action.label}
              </span>
            );
          }

          return (
            <Link
              key={action.href}
              href={action.href}
              className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-200 hover:border-sky-400/70 hover:text-slate-100"
            >
              {action.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
