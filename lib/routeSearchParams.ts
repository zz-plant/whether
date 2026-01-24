import type { Route } from "next";
import type { ReportSearchParams } from "./reportData";

export const appendSearchParamsToRoute = (
  href: Route,
  searchParams?: ReportSearchParams
) => {
  if (!searchParams) {
    return href;
  }

  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (typeof value !== "string" || value.length === 0) {
      return;
    }

    params.set(key, value);
  });

  const queryString = params.toString();
  return queryString ? `${href}?${queryString}` : href;
};
