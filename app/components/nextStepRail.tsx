import Link from "next/link";
import {
  navigationLayerByKey,
  navigationLayers,
  primaryNavigationLayers,
  resolveNavigationRouteCue,
  resolvePrimaryNavigationSurfaceCue,
} from "../../lib/navigation/informationArchitecture";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";

const PRIMARY_ACTIONS = primaryNavigationLayers.map((layer) => ({
  label: layer.label,
  href: layer.href,
  description: layer.description,
}));

const recommendedPrimaryHrefByKey = {
  "weekly-brief": "/operations",
  signals: "/",
  operations: "/",
  decide: "/operations",
  method: "/",
} as const;

export function NextStepRail({ currentPath }: { currentPath: string }) {
  const currentLayer = navigationLayers.find((layer) => pathMatchesLink(layer.href, currentPath));
  const currentAction = currentLayer
    ? { label: currentLayer.label, href: currentLayer.href, description: currentLayer.description }
    : null;
  const parentLayer = currentLayer?.parentKey ? navigationLayerByKey[currentLayer.parentKey] : null;
  const recommendedHref = currentLayer?.tier === "supporting"
    ? parentLayer?.href
    : currentLayer
      ? recommendedPrimaryHrefByKey[currentLayer.key as keyof typeof recommendedPrimaryHrefByKey]
      : "/";
  const recommendedAction = PRIMARY_ACTIONS.find((action) => action.href === recommendedHref) ?? PRIMARY_ACTIONS[0];
  const introCopy = currentLayer?.tier === "supporting" && parentLayer
    ? `${currentLayer.label} supports ${parentLayer.label}. Use the main path for orientation, then come here only when you need this deeper library.`
    : "Use one deeper page to answer one unresolved question, then return to the weekly brief or plan.";

  return (
    <section className="weather-hub-section" aria-label="Next step rail">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="weather-hub-section-eyebrow">Next step</p>
          <h2 className="text-xl font-semibold text-white">Keep the weekly brief as the decision anchor</h2>
          <p className="max-w-3xl text-sm leading-7 text-slate-300">{introCopy}</p>
        </div>
        {currentAction ? (
          <div className="weather-hub-card min-w-[14rem] px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              {currentLayer?.tier === "supporting" ? "Supporting page" : "You are here"}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{currentAction.label}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-700/80 bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                {resolvePrimaryNavigationSurfaceCue(currentAction.href)}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {resolveNavigationRouteCue(currentAction.href)}
              </span>
            </div>
            {parentLayer ? (
              <p className="mt-1 text-xs text-slate-300">Primary parent: {parentLayer.label}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="weather-hub-card flex flex-col gap-3 px-4 py-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200">
            {currentLayer?.tier === "supporting" && parentLayer
              ? "Primary parent"
              : recommendedAction.href === "/"
                ? "Canonical workspace"
                : "Best next move"}
          </p>
          <h2 className="text-base font-semibold text-slate-100">{recommendedAction.label}</h2>
          <p className="max-w-2xl text-sm text-slate-300">{recommendedAction.description}</p>
        </div>
        <Link
          href={recommendedAction.href}
          className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
        >
          {currentLayer?.tier === "supporting" && parentLayer
            ? `Return to ${recommendedAction.label}`
            : recommendedAction.href === "/"
              ? "Return to Weekly Brief"
              : `Open ${recommendedAction.label}`}
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRIMARY_ACTIONS.map((action) => {
          const isCurrent = pathMatchesLink(action.href, currentPath);

          if (isCurrent) {
            return (
              <span
                key={action.href}
                aria-current="page"
                className="weather-hub-chip weather-hub-chip-active"
              >
                {action.label}
              </span>
            );
          }

          return (
            <Link
              key={action.href}
              href={action.href}
              className="weather-hub-chip"
            >
              {action.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
