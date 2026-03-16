import Link from "next/link";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";

const CANONICAL_ACTIONS = [
  { label: "Weekly brief", href: "/", description: "Reset on the current posture, bounded call, and share-ready artifact." },
  { label: "Signals", href: "/signals", description: "Open the deep evidence appendix when the weekly brief needs source-level validation." },
  { label: "Operations", href: "/operations", description: "Open detailed execution guardrails after the weekly workspace is aligned." },
  { label: "Decide", href: "/decide", description: "Jump straight to role paths, utilities, and runnable toolkits." },
  { label: "Toolkits", href: "/toolkits", description: "Run a reusable instrument once the decision path is already clear." },
  { label: "Learn", href: "/learn", description: "Use concepts and failure modes only for optional background context." },
  { label: "Method", href: "/method", description: "Audit trust, sources, and formulas without leaving the weekly loop." },
] as const;

const recommendedActionByPath = [
  { match: "/", href: "/operations" },
  { match: "/signals", href: "/" },
  { match: "/operations", href: "/" },
  { match: "/decide", href: "/" },
  { match: "/toolkits", href: "/" },
  { match: "/learn", href: "/" },
  { match: "/method", href: "/" },
] as const;

export function NextStepRail({ currentPath }: { currentPath: string }) {
  const currentAction = CANONICAL_ACTIONS.find((action) => pathMatchesLink(action.href, currentPath));
  const recommendedHref = recommendedActionByPath.find((item) => pathMatchesLink(item.match, currentPath))?.href ?? "/";
  const recommendedAction = CANONICAL_ACTIONS.find((action) => action.href === recommendedHref) ?? CANONICAL_ACTIONS[0];

  return (
    <section className="weather-panel space-y-4 px-6 py-5" aria-label="Next step rail">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Next step</p>
          <p className="text-sm text-slate-300">Use Weekly Brief as the canonical workspace. Open depth pages only when the decision needs more detail.</p>
        </div>
        {currentAction ? (
          <div className="weather-stat-card min-w-[14rem]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">You are here</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{currentAction.label}</p>
          </div>
        ) : null}
      </div>

      <div className="weather-route-card flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-200">
            {recommendedAction.href === "/" ? "Canonical workspace" : "Best next move"}
          </p>
          <h2 className="text-base font-semibold text-slate-100">{recommendedAction.label}</h2>
          <p className="max-w-2xl text-sm text-slate-300">{recommendedAction.description}</p>
        </div>
        <Link
          href={recommendedAction.href}
          className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
        >
          {recommendedAction.href === "/" ? "Return to Weekly Brief" : `Open ${recommendedAction.label}`}
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {CANONICAL_ACTIONS.map((action) => {
          const isCurrent = pathMatchesLink(action.href, currentPath);

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
