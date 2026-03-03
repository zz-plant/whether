import { NextResponse } from "next/server";
import { resolveSiteUrl } from "../../../lib/siteUrl";
import { supportedAgentCadences } from "../../../lib/agentInterface";

export const runtime = "edge";
export const revalidate = 3600;

export async function GET() {
  const baseUrl = resolveSiteUrl();

  return NextResponse.json({
    service: "whether",
    version: "v1",
    generatedAt: new Date().toISOString(),
    baseUrl,
    defaultCadence: "weekly",
    supportedCadences: [...supportedAgentCadences],
    endpoints: {
      agent: `${baseUrl}/api/agent`,
      llms: `${baseUrl}/llms.txt`,
      weekly: `${baseUrl}/api/weekly`,
      monthly: `${baseUrl}/api/monthly`,
      quarterly: `${baseUrl}/api/quarterly`,
      yearly: `${baseUrl}/api/yearly`,
      cadence: `${baseUrl}/api/cadence`,
      treasury: `${baseUrl}/api/treasury`,
      health: `${baseUrl}/api/health`,
    },
    examples: {
      weekly: `${baseUrl}/api/agent?cadence=weekly`,
    },
    agent: {
      invalidCadenceStatus: 400,
    },
  });
}
