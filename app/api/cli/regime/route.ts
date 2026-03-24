import { NextRequest, NextResponse } from "next/server";
import { buildCliRegimeContract } from "../../../../lib/cli/contracts";
import { CLI_QUERY_ALLOWLIST_BY_ENDPOINT, parseAsOfSearchParam, rejectUnsupportedCliQuery } from "../../../../lib/cli/queryContracts";
import { loadCliRouteContext } from "../../../../lib/api/cliRoute";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const invalidQuery = rejectUnsupportedCliQuery(request, CLI_QUERY_ALLOWLIST_BY_ENDPOINT.regime);
  if (invalidQuery) return invalidQuery;

  const searchParams = parseAsOfSearchParam(request.nextUrl.searchParams.get("asOf"));
  if (searchParams === null) {
    return NextResponse.json({ error: "Invalid asOf input. Expected YYYY-MM." }, { status: 400 });
  }

  const { reportData, degraded, postureState } = await loadCliRouteContext({
    route: "/api/cli/regime",
    searchParams: searchParams ?? undefined,
  });

  return NextResponse.json(
    buildCliRegimeContract({
      reportData,
      postureState,
      degraded,
    })
  );
}
