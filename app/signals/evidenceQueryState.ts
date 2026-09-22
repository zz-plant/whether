import { parseMonthInput } from "./components/timeMachineUtils";

export const focusTabs = ["all", "growth", "inflation", "labor", "financial"] as const;

export type FocusTab = (typeof focusTabs)[number];
type SignalsSearchParamRecord = Record<string, string | undefined>;

type SearchParamsLike = {
  get(name: string): string | null;
  toString(): string;
};

type SearchParamsInput =
  | SignalsSearchParamRecord
  | URLSearchParams
  | SearchParamsLike
  | undefined;

type SearchParamValue = string | number | null | undefined;

const hasGet = (value: SearchParamsInput): value is SearchParamsLike =>
  Boolean(value) && typeof value === "object" && "get" in value && "toString" in value;

const cloneSearchParams = (searchParams?: SearchParamsInput) => {
  if (!searchParams) {
    return new URLSearchParams();
  }

  if (searchParams instanceof URLSearchParams || hasGet(searchParams)) {
    return new URLSearchParams(searchParams.toString());
  }

  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (typeof value === "string" && value.length > 0) {
      params.set(key, value);
    }
  });
  return params;
};

const buildHrefFromParams = (
  pathname: string,
  params: URLSearchParams,
  anchor?: string,
) => {
  const query = params.toString();
  const hash = anchor ? `#${anchor.replace(/^#/, "")}` : "";
  return query ? `${pathname}?${query}${hash}` : `${pathname}${hash}`;
};

const buildSignalsHref = ({
  pathname = "/signals",
  searchParams,
  remove = [],
  set = {},
  anchor,
}: {
  pathname?: string;
  searchParams?: SearchParamsInput;
  remove?: string[];
  set?: Record<string, SearchParamValue>;
  anchor?: string;
}) => {
  const params = cloneSearchParams(searchParams);

  remove.forEach((key) => {
    params.delete(key);
  });

  Object.entries(set).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      params.delete(key);
      return;
    }
    params.set(key, String(value));
  });

  return buildHrefFromParams(pathname, params, anchor);
};

export const resolveSignalsFocus = (
  searchParams: SignalsSearchParamRecord | undefined,
): FocusTab => {
  const requestedFocus = searchParams?.focus;
  return requestedFocus && focusTabs.includes(requestedFocus as FocusTab)
    ? (requestedFocus as FocusTab)
    : "all";
};

export const buildSignalsFocusHref = (
  searchParams: SignalsSearchParamRecord | undefined,
  focus: FocusTab,
) =>
  buildSignalsHref({
    searchParams,
    remove: ["focus"],
    set: focus === "all" ? {} : { focus },
  });

export const buildTimeMachineSubmitHref = (
  pathname: string,
  searchParams: SearchParamsInput,
  selection: { year: number; month: number },
) =>
  buildSignalsHref({
    pathname,
    searchParams,
    remove: ["draftMonth", "draftYear"],
    set: { month: selection.month, year: selection.year },
  });

export const buildTimeMachineDraftHref = (
  pathname: string,
  searchParams: SearchParamsInput,
  selection: { year: number; month: number },
) =>
  buildSignalsHref({
    pathname,
    searchParams,
    set: { draftMonth: selection.month, draftYear: selection.year },
  });

export const buildTimeMachineClearDraftHref = (
  pathname: string,
  searchParams: SearchParamsInput,
) =>
  buildSignalsHref({
    pathname,
    searchParams,
    remove: ["draftMonth", "draftYear"],
  });

export const buildTimeMachineSnapshotHref = (
  pathname: string,
  searchParams: SearchParamsInput,
  selection: { year: number; month: number } | null,
) => {
  if (!selection) {
    return null;
  }

  return buildSignalsHref({
    pathname,
    searchParams,
    remove: ["draftMonth", "draftYear"],
    set: { month: selection.month, year: selection.year },
  });
};

export const buildTimeMachineNowHref = (
  pathname: string,
  searchParams: SearchParamsInput,
) =>
  buildSignalsHref({
    pathname,
    searchParams,
    remove: ["draftMonth", "draftYear", "month", "year"],
  });

export const buildTimeMachineJumpToLatestHref = (
  pathname: string,
  searchParams: SearchParamsInput,
  latestMonthValue: string,
) => {
  const parsed = parseMonthInput(latestMonthValue);
  if (!parsed) {
    return buildSignalsHref({ pathname, searchParams });
  }

  return buildSignalsHref({
    pathname,
    searchParams,
    remove: ["draftMonth", "draftYear"],
    set: { month: parsed.month, year: parsed.year },
  });
};
