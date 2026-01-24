import type { Route } from "next";
import type { UrlObject } from "url";
import type { ReportSearchParams } from "./reportData";

export const appendSearchParamsToRoute = (
  href: Route,
  searchParams?: ReportSearchParams
): Route | UrlObject => {
  if (!searchParams) {
    return href;
  }

  const query = Object.entries(searchParams).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (typeof value !== "string" || value.length === 0) {
        return acc;
      }
      acc[key] = value;
      return acc;
    },
    {}
  );

  return Object.keys(query).length > 0 ? { pathname: href, query } : href;
};
