import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface ActionItem {
  id: string | number;
  text: string;
  href?: string;
}

export interface ActionsThisWeekCardProps {
  actions?: ActionItem[];
  operateHref?: string;
  className?: string;
}

const DEFAULT_ACTIONS: ActionItem[] = [
  {
    id: 1,
    text: "Recheck fixed-cost approvals before net-new headcount.",
    href: "/operate#hiring",
  },
  {
    id: 2,
    text: "Re-approve discretionary spend before new burn commitments.",
    href: "/operate#spend",
  },
  {
    id: 3,
    text: "Keep expansion bets only where activation and retention are already on track.",
    href: "/operate#roadmap",
  },
];

export function ActionsThisWeekCard({
  actions = DEFAULT_ACTIONS,
  operateHref = "/operate",
  className = "",
}: ActionsThisWeekCardProps) {
  const items = actions.length > 0 ? actions.slice(0, 3) : DEFAULT_ACTIONS;

  return (
    <section
      aria-labelledby="actions-this-week-heading"
      className={`weather-brief-card ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 id="actions-this-week-heading" className="text-sm font-semibold tracking-tight text-white">
          Actions this week
        </h3>
        <span className="text-xs font-medium text-slate-400">
          Turn insight into progress
        </span>
      </div>

      <ul className="space-y-2.5">
        {items.map((item, index) => {
          const href = item.href ?? operateHref;
          return (
            <li key={item.id ?? index}>
              <Link
                href={href}
                className="group flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-slate-950/40 p-2.5 transition-colors hover:border-teal-500/30 hover:bg-slate-900/60 focus-visible:outline-2 focus-visible:outline-teal-400"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-xs font-semibold text-slate-200">
                    {index + 1}
                  </span>
                  <span className="text-xs font-medium text-slate-200 group-hover:text-white line-clamp-2">
                    {item.text}
                  </span>
                </div>
                <ChevronRight
                  size={16}
                  className="shrink-0 text-slate-500 transition-colors group-hover:text-teal-400 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
