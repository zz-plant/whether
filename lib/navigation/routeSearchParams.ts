import type { Route } from "next";
import type { ReportSearchParams } from "../report/reportData";

export const appendSearchParamsToRoute = (
  href: Route,
  searchParams?: ReportSearchParams
): string => {
  if (!searchParams) {
    return href;
  }

  const query = Object.entries(searchParams).reduce<URLSearchParams>((acc, [key, value]) => {
    if (typeof value === "string" && value.length > 0) {
      acc.set(key, value);
    }
    return acc;
  }, new URLSearchParams());

  const queryString = query.toString();
  return queryString.length > 0 ? `${href}?${queryString}` : href;
};
