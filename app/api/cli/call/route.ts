import { NextRequest, NextResponse } from "next/server";
import { buildCliCallContract } from "../../../../lib/cli/contracts";
import { CLI_QUERIES, parseCliQuery } from "../../../../lib/cli/queryContracts";
import { loadCliRouteContext } from "../../../../lib/api/cliRoute";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = parseCliQuery(request, CLI_QUERIES.call);
  if (query instanceof NextResponse) return query;

  const { reportData, degraded, postureState } = await loadCliRouteContext({
    route: "/api/cli/call",
    searchParams: query.asOf,
  });

  return NextResponse.json(
    buildCliCallContract({
      reportData,
      postureState,
      degraded,
    })
  );
}
