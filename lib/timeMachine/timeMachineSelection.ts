/**
 * Time Machine selection helpers for tying URL configuration to historical report views.
 * Keeps time travel inputs consistent across metadata and report rendering.
 */
import { formatHistoricalBanner, resolveHistoricalDate } from "./timeMachine";
import { getAdjacentTimeMachineEntry, hasTimeMachineEntry } from "./timeMachineCache";

export interface TimeMachineRequest {
  month: number;
  year: number;
}

export interface TimeMachineSelection extends TimeMachineRequest {
  asOf: string;
  banner: string;
}

export const parseTimeMachineRequest = (searchParams?: {
  month?: string;
  year?: string;
}): TimeMachineRequest | null => {
  if (!searchParams?.month || !searchParams?.year) {
    return null;
  }

  const month = Number(searchParams.month);
  const year = Number(searchParams.year);

  if (!Number.isInteger(month) || !Number.isInteger(year)) {
    return null;
  }

  if (month < 1 || month > 12) {
    return null;
  }

  if (year < 2000) {
    return null;
  }

  return { month, year };
};

export const resolveTimeMachineSelection = (searchParams?: {
  month?: string;
  year?: string;
}): TimeMachineSelection | null => {
  const request = parseTimeMachineRequest(searchParams);
  if (!request) {
    return null;
  }

  if (!hasTimeMachineEntry(request.year, request.month)) {
    return null;
  }

  const asOf = resolveHistoricalDate(request.year, request.month);

  return {
    ...request,
    asOf,
    banner: formatHistoricalBanner(request.year, request.month),
  };
};

export const buildTimeMachineHref = (
  href: string,
  selection?: TimeMachineRequest | null
) => {
  if (!selection) {
    return href;
  }

  const [baseHref, hash = ""] = href.split("#");
  const [pathname, queryString = ""] = baseHref.split("?");
  const params = new URLSearchParams(queryString);

  params.set("month", String(selection.month));
  params.set("year", String(selection.year));

  const query = params.toString();
  const hashSuffix = hash ? `#${hash}` : "";

  return query ? `${pathname}?${query}${hashSuffix}` : `${pathname}${hashSuffix}`;
};

export const getAdjacentTimeMachineRequest = (
  selection: TimeMachineRequest,
  direction: "previous" | "next"
): TimeMachineRequest | null => {
  return getAdjacentTimeMachineEntry(selection.year, selection.month, direction);
};
