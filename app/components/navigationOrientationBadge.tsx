import { navigationLayers } from "../../lib/navigation/informationArchitecture";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";
import { reportShellCorePaths } from "../../lib/report/reportNavigation";

type NavigationZone = "core" | "workflow" | "reference";

const zoneLabels: Record<NavigationZone, string> = {
  core: "Now section",
  workflow: "Operate section",
  reference: "Reference section",
};

const zoneDescriptors: Record<NavigationZone, string> = {
  core: "Decision call and bounded actions for this week",
  workflow: "Execution posture and operating rules",
  reference: "Evidence, provenance, and supporting context",
};

const zoneCompactLabels: Record<NavigationZone, string> = {
  core: "Now",
  workflow: "Operate",
  reference: "Reference",
};

const zoneBadgeStyles: Record<NavigationZone, string> = {
  core: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  workflow: "border-sky-300/30 bg-sky-400/10 text-sky-100",
  reference: "border-violet-300/30 bg-violet-400/10 text-violet-100",
};

const zoneOrder: NavigationZone[] = ["core", "workflow", "reference"];

const zoneDefaultHref: Record<NavigationZone, string> = zoneOrder.reduce((acc, zone) => {
  const layer = navigationLayers.find((item) => item.group === zone);
  acc[zone] = layer?.href ?? "/";
  return acc;
}, {} as Record<NavigationZone, string>);

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

  return (
    <div
      className={`flex max-w-full flex-wrap items-center gap-1 rounded-2xl border border-slate-700/80 bg-slate-950/70 p-1 sm:rounded-full ${className ?? ""}`}
      aria-label="Navigation zone orientation (not macro posture)"
    >
      {zoneOrder.map((zone) => {
        const isActive = zone === activeZone;

        return (
          <a
            key={zone}
            href={zoneDefaultHref[zone]}
            aria-label={zoneLabels[zone]}
            aria-current={isActive ? "true" : undefined}
            className={`inline-flex min-h-[32px] items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors hover:border-sky-300/60 hover:text-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 ${isActive ? zoneBadgeStyles[zone] : "border-slate-700/70 text-slate-400"}`}
            title={zoneDescriptors[zone]}
          >
            <span className="sm:hidden">{zoneCompactLabels[zone]}</span>
            <span className="hidden sm:inline">{zoneLabels[zone]}</span>
          </a>
        );
      })}
    </div>
  );
}
