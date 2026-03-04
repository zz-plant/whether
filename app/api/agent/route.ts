import { NextResponse } from "next/server";
import {
  buildAgentInterfaceResponse,
  isAgentCadence,
  supportedAgentCadences,
} from "../../../lib/agentInterface";
import { agentApiCorsHeaders } from "../../../lib/agentApiCors";

export { edgeRuntime as runtime } from "../../../lib/next-runtime";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedCadence = searchParams.get("cadence") ?? "weekly";

  if (!isAgentCadence(requestedCadence)) {
    return NextResponse.json(
      {
        error: "Invalid cadence.",
        allowedCadences: supportedAgentCadences,
      },
      {
        status: 400,
        headers: agentApiCorsHeaders,
      }
    );
  }

  const payload = await buildAgentInterfaceResponse(requestedCadence);

  return NextResponse.json(payload, {
    headers: agentApiCorsHeaders,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: agentApiCorsHeaders,
  });
}
