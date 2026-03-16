import type { Route } from "./routeType";
import { primaryNavigationLayers } from "./informationArchitecture";

export type PrimaryNavigationItem = {
  id: string;
  href: Route;
  label: string;
  description: string;
  group: "core" | "workflow" | "reference";
};

export const primaryNavigation: PrimaryNavigationItem[] = primaryNavigationLayers.map((layer) => ({
  id: layer.key,
  href: layer.href,
  label: layer.label,
  description: layer.description,
  group: layer.group,
}));
