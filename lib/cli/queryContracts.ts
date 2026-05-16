import { NextResponse } from "next/server";
import { z } from "zod";

type CliQueryRequest = {
  nextUrl: {
    searchParams: URLSearchParams;
  };
};

export const CLI_QUERY_ALLOWLIST_BY_ENDPOINT = {
  status: ["asOf", "view"],
  call: ["asOf"],
  changes: ["asOf"],
  diagnostics: ["asOf"],
  regime: ["asOf"],
  history: ["asOf", "weeks"],
  scenario: ["tightness", "risk-appetite"],
} as const;

const toUnique = (values: string[]) => Array.from(new Set(values));

export const rejectUnsupportedCliQuery = (request: CliQueryRequest, supportedParams: readonly string[]) => {
  const allowed = new Set(supportedParams);
  const provided = toUnique(Array.from(request.nextUrl.searchParams.keys()));
  const unsupported = provided.filter((key) => !allowed.has(key));

  if (unsupported.length === 0) {
    return null;
  }

  return NextResponse.json(
    {
      error: "Unsupported query parameters.",
      unsupported,
      supported: supportedParams,
    },
    { status: 400 },
  );
};

const asOfMatchSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .transform((v) => v.split("-").map(Number))
  .refine(([year]) => year >= 2000, "Year out of range")
  .transform(([year, month]) => ({ month: String(month), year: String(year) }));

export const parseAsOfSearchParam = (asOf: string | null) => {
  if (!asOf) return {};
  const result = asOfMatchSchema.safeParse(asOf);
  if (!result.success) return null;
  return result.data;
};

const weeksMatchSchema = z
  .string()
  .regex(/^\d+$/)
  .transform((v) => Number(v))
  .refine((n) => Number.isInteger(n) && n >= 1, "Weeks must be a positive integer");

export const parseWeeksSearchParam = ({
  weeks,
  defaultWeeks,
  maxWeeks,
}: {
  weeks: string | null;
  defaultWeeks: number;
  maxWeeks: number;
}): { requestedWeeks: number; windowWeeks: number; truncatedToMax: boolean } | null => {
  if (weeks === null) {
    return {
      requestedWeeks: defaultWeeks,
      windowWeeks: defaultWeeks,
      truncatedToMax: false,
    };
  }

  const result = weeksMatchSchema.safeParse(weeks);
  if (!result.success) return null;

  if (result.data > maxWeeks) {
    return {
      requestedWeeks: result.data,
      windowWeeks: maxWeeks,
      truncatedToMax: true,
    };
  }

  return {
    requestedWeeks: result.data,
    windowWeeks: result.data,
    truncatedToMax: false,
  };
};
