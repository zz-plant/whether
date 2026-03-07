import type { Route } from "next";
import { navigationLayers } from "./informationArchitecture";

export type PrimaryNavigationItem = {
  id: string;
  href: Route;
  label: string;
  description: string;
};

export const primaryNavigation: PrimaryNavigationItem[] = navigationLayers.map((layer) => ({
  id: layer.key,
  href: layer.href,
  label: layer.label,
  description: layer.description,
}));
