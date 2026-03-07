import { navigationLayers } from "../../lib/navigation/informationArchitecture";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";
import { reportShellCorePaths } from "../../lib/report/reportNavigation";

type NavigationZone = "core" | "workflow" | "reference";

const zoneLabels: Record<NavigationZone, string> = {
  core: "Now section",
  workflow: "Operate section",
  reference: "Reference section",
};

const zoneBadgeStyles: Record<NavigationZone, string> = {
  core: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  workflow: "border-sky-300/30 bg-sky-400/10 text-sky-100",
  reference: "border-violet-300/30 bg-violet-400/10 text-violet-100",
};

const zoneOrder: NavigationZone[] = ["core", "workflow", "reference"];

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
      className={`inline-flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-950/70 p-1 ${className ?? ""}`}
      aria-label="Navigation zone orientation (not macro posture)"
    >
      {zoneOrder.map((zone) => {
        const isActive = zone === activeZone;

        return (
          <span
            key={zone}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${isActive ? zoneBadgeStyles[zone] : "border-slate-700/70 text-slate-400"}`}
          >
            {zoneLabels[zone]}
          </span>
        );
      })}
    </div>
  );
}
