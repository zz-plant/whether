import {
  navigationGroupLabels,
  navigationLayers,
} from "../../lib/navigation/informationArchitecture";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";
import { reportShellCorePaths } from "../../lib/report/reportNavigation";

type NavigationZone = "core" | "workflow" | "reference";

const zoneLabels: Record<NavigationZone, string> = {
  core: navigationGroupLabels.core,
  workflow: navigationGroupLabels.workflow,
  reference: navigationGroupLabels.reference,
};

const zoneDescriptors: Record<NavigationZone, string> = {
  core: "Weekly call and bounded actions for this week",
  workflow: "Evidence, execution, and decision depth pages that support the Weekly Brief",
  reference: "Trust, provenance, and evidence-reference pages",
};

const zoneCompactLabels: Record<NavigationZone, string> = {
  core: navigationGroupLabels.core,
  workflow: navigationGroupLabels.workflow,
  reference: navigationGroupLabels.reference,
};

const zoneBadgeStyles: Record<NavigationZone, string> = {
  core: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  workflow: "border-sky-300/30 bg-sky-400/10 text-sky-100",
  reference: "border-violet-300/30 bg-violet-400/10 text-violet-100",
};

const zoneOrder: NavigationZone[] = ["core", "workflow", "reference"];

const zoneDefaultHref: Record<NavigationZone, string> = {
  core: "/",
  workflow: "/signals",
  reference: "/method",
};

const normalizePath = (path: string) =>
  path !== "/" && path.endsWith("/") ? path.slice(0, -1) : path;

const resolveActiveZone = (path: string): NavigationZone | null => {
  const normalizedPath = normalizePath(path);
  const matchingLayer = navigationLayers.find((link) => pathMatchesLink(link.href, normalizedPath));

  if (matchingLayer) {
    return matchingLayer.group;
  }

  const isReportShellPath = reportShellCorePaths.some((route) => pathMatchesLink(route, normalizedPath));
  return isReportShellPath ? "core" : null;
};

export function NavigationOrientationBadge({
  currentPath,
  className,
}: {
  currentPath: string;
  className?: string;
}) {
  const activeZone = resolveActiveZone(currentPath);
  const normalizedCurrentPath = normalizePath(currentPath);

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Where To Go
          </p>
          <p className="text-[11px] leading-5 text-slate-300">
            Start with the weekly brief, then open one deeper page only when needed.
          </p>
        </div>
        <span className="rounded-full border border-slate-700/80 bg-slate-950/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
          Main routes
        </span>
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 rounded-l-xl bg-gradient-to-r from-slate-950/80 to-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 rounded-r-xl bg-gradient-to-l from-slate-950/80 to-transparent" aria-hidden="true" />
        <div
          className="flex max-w-full flex-nowrap items-center gap-1 overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-950/70 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:rounded-full"
          aria-label="Navigation zone orientation (not macro posture)"
        >
          {zoneOrder.map((zone) => {
            const isActive = zone === activeZone;
            const isExactCurrentLink = zoneDefaultHref[zone] === normalizedCurrentPath;

            return (
              <a
                key={zone}
                href={zoneDefaultHref[zone]}
                aria-label={zoneLabels[zone]}
                aria-current={isExactCurrentLink ? "page" : undefined}
                className={`inline-flex min-h-[36px] min-w-[84px] flex-shrink-0 items-center justify-center rounded-full border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors hover:border-sky-300/60 hover:text-sky-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${isActive ? zoneBadgeStyles[zone] : "border-slate-700/70 text-slate-400"}`}
                title={zoneDescriptors[zone]}
              >
                <span>{zoneCompactLabels[zone]}</span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
