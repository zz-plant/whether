/**
 * Time Machine selection helpers for tying URL configuration to historical report views.
 * Keeps time travel inputs consistent across metadata and report rendering.
 */
import { formatHistoricalBanner, resolveHistoricalDate } from "./timeMachine";
import { hasTimeMachineEntry } from "./timeMachineCache";

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
