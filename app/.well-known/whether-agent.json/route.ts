import { NextResponse } from "next/server";
import { resolveSiteUrl } from "../../../lib/siteUrl";
import { supportedAgentCadences } from "../../../lib/agentInterface";
import {
  REVISABLE_DELEGATION_RECORD_SCHEMA_VERSION,
  REVISABLE_DELEGATION_SCHEMA_URL,
  REVISABLE_DELEGATION_VERIFIER_URL,
  REVISABLE_DELEGATION_STANDARD_URL,
  WHETHER_REVISABLE_DELEGATION_CONFORMANCE_LEVEL,
} from "../../../lib/export/revisableDelegationRecord";

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
    // Where Whether sits in the loop an institution runs when it delegates
    // work to machines, and what it emits in the shared record shape. Whether
    // authorizes nothing and acts on nothing, so it emits belief records only.
    revisableDelegation: {
      loopPosition: "act",
      loopRole: "turns changed conditions into a weekly operating call; the operator acts",
      standard: REVISABLE_DELEGATION_STANDARD_URL,
      schema: REVISABLE_DELEGATION_SCHEMA_URL,
      schemaVersion: REVISABLE_DELEGATION_RECORD_SCHEMA_VERSION,
      conformanceLevel: WHETHER_REVISABLE_DELEGATION_CONFORMANCE_LEVEL,
      // A declared level is worth what a reader can check. This names the one
      // that can contradict it, against the stream at `records` below.
      verifier: REVISABLE_DELEGATION_VERIFIER_URL,
      kinds: ["belief"],
      records: `${baseUrl}/api/decision-memory?format=records`,
      upstream: [],
      downstream: [],
    },
  });
}
