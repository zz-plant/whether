import type { Route } from "./routeType";
import { navigationLayers } from "./informationArchitecture";

export type PrimaryNavigationItem = {
  id: string;
  href: Route;
  label: string;
  description: string;
  group: "core" | "workflow" | "reference";
};

export const primaryNavigation: PrimaryNavigationItem[] = navigationLayers.map((layer) => ({
  id: layer.key,
  href: layer.href,
  label: layer.label,
  description: layer.description,
  group: layer.group,
}));
