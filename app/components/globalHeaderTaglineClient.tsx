"use client";

import { usePathname } from "next/navigation";
import { navigationLayerByKey, navigationLayers } from "../../lib/navigation/informationArchitecture";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";

export function GlobalHeaderTaglineClient() {
  const pathname = usePathname();
  const isHome = pathMatchesLink("/", pathname);
  const activeLayer = navigationLayers.find((layer) => pathMatchesLink(layer.href, pathname));
  const parentLayer =
    activeLayer?.parentKey ? navigationLayerByKey[activeLayer.parentKey] : null;

  if (isHome) {
    return (
      <div className="mt-1 space-y-1">
        <p className="text-base font-semibold tracking-tight text-slate-100 sm:text-lg">
          Startup market weather: weekly posture for hiring, fundraising, and runway.
        </p>
        <p className="max-w-2xl text-sm text-slate-300">
          Scan the call, lock the decision, and open the right execution surface.
        </p>
      </div>
    );
  }

  if (activeLayer) {
    return (
      <div className="mt-1 space-y-1">
        <p className="text-sm font-semibold text-slate-100 sm:text-base">
          {activeLayer.label}
        </p>
        <p className="max-w-2xl text-sm text-slate-300">
          {activeLayer.tier === "supporting" && parentLayer
            ? `${activeLayer.description} Primary parent: ${parentLayer.label}.`
            : activeLayer.description}
        </p>
      </div>
    );
  }

  return (
    <p className="mt-1 text-sm font-medium text-slate-300 sm:text-base">
      Operating posture navigation
    </p>
  );
}
