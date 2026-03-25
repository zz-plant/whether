import { NextRequest, NextResponse } from "next/server";
import { buildCliChangesContract } from "../../../../lib/cli/contracts";
import { CLI_QUERY_ALLOWLIST_BY_ENDPOINT } from "../../../../lib/cli/queryContracts";
import { loadCliRouteContext, parseCliRouteRequest } from "../../../../lib/api/cliRoute";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const parsedRequest = parseCliRouteRequest(request, CLI_QUERY_ALLOWLIST_BY_ENDPOINT.changes);
  if (parsedRequest instanceof NextResponse) return parsedRequest;

  const searchParams = parsedRequest.asOf
    ? { year: String(parsedRequest.asOf.year), month: String(parsedRequest.asOf.month) }
    : undefined;

  const { reportData, degraded, postureState } = await loadCliRouteContext({
    route: "/api/cli/changes",
    searchParams: searchParams ?? undefined,
  });

  return NextResponse.json(
    buildCliChangesContract({
      reportData,
      postureState,
      degraded,
    })
  );
}
