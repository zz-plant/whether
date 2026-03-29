import { navigationLayers } from "../../lib/navigation/informationArchitecture";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";
import { reportShellCorePaths } from "../../lib/report/reportNavigation";

type NavigationZone = "core" | "workflow" | "reference";

const zoneLabels: Record<NavigationZone, string> = {
  core: "Now",
  workflow: "Workflows",
  reference: "Reference",
};

const zoneDescriptors: Record<NavigationZone, string> = {
  core: "Weekly call and bounded actions for this week",
  workflow: "Evidence, execution, and decision depth pages that support the Weekly Brief",
  reference: "Trust, provenance, and optional background reference pages",
};

const zoneCompactLabels: Record<NavigationZone, string> = {
  core: "Now",
  workflow: "Workflows",
  reference: "Reference",
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
    <div
      className={`flex max-w-full flex-wrap items-center gap-1 rounded-2xl border border-slate-700/80 bg-slate-950/70 p-1 sm:rounded-full ${className ?? ""}`}
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
            className={`inline-flex min-h-[44px] items-center rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors hover:border-sky-300/60 hover:text-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 ${isActive ? zoneBadgeStyles[zone] : "border-slate-700/70 text-slate-400"}`}
            title={zoneDescriptors[zone]}
          >
            <span>{zoneCompactLabels[zone]}</span>
          </a>
        );
      })}
    </div>
  );
}
