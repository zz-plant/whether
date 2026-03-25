import { NextRequest, NextResponse } from "next/server";
import { parseAsOfSearchParam, rejectUnsupportedCliQuery } from "../cli/queryContracts";
import { loadWeeklyBriefSnapshot } from "../report/weeklyBriefSnapshot";
import type { ReportSearchParams } from "../report/reportData";

export const INVALID_AS_OF_ERROR = "Invalid asOf input. Expected YYYY-MM.";

export const parseCliRouteRequest = (
  request: NextRequest,
  endpointAllowlist: readonly string[],
): { asOf?: { year: number; month: number } } | NextResponse => {
  const invalidQuery = rejectUnsupportedCliQuery(request, endpointAllowlist);
  if (invalidQuery) {
    return invalidQuery;
  }

  const parsedAsOf = parseAsOfSearchParam(request.nextUrl.searchParams.get("asOf"));
  if (parsedAsOf === null) {
    return NextResponse.json({ error: INVALID_AS_OF_ERROR }, { status: 400 });
  }

  if (!parsedAsOf.year || !parsedAsOf.month) {
    return {};
  }

  return {
    asOf: {
      year: Number(parsedAsOf.year),
      month: Number(parsedAsOf.month),
    },
  };
};

export const loadCliRouteContext = async ({
  route,
  searchParams,
}: {
  route: string;
  searchParams?: ReportSearchParams;
}) => {
  const { reportData, degraded, snapshot } = await loadWeeklyBriefSnapshot(searchParams, { route });
  if (!snapshot.postureState) {
    throw new Error(`CLI route ${route} could not build posture state.`);
  }

  return {
    reportData,
    degraded,
    postureState: snapshot.postureState,
    snapshot,
  };
};
