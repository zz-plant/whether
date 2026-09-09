import { resolveSiteUrl } from "./siteUrl";
import { supportedAgentCadences } from "./agentInterface";
import {
  REVISABLE_DELEGATION_RECORD_SCHEMA_VERSION,
  REVISABLE_DELEGATION_SCHEMA_URL,
  REVISABLE_DELEGATION_VERIFIER_URL,
  REVISABLE_DELEGATION_STANDARD_URL,
  WHETHER_REVISABLE_DELEGATION_CONFORMANCE_LEVEL,
} from "./export/revisableDelegationRecord";

/**
 * The agent discovery manifest, and the one path that can actually serve it.
 *
 * This lived at `app/.well-known/whether-agent.json/route.ts` and returned 404
 * in production for as long as it existed. vinext enumerates App Router files
 * with Node's `glob`, where `*` does not match a leading dot, so a route under
 * `app/.well-known/` is never registered — the request fell through to the app
 * shell and rendered HTML. Nothing caught it: `tests/agentRoutes.test.ts`
 * imported the route module and called `GET()` directly, which exercises the
 * handler but never the router. Meanwhile `robots.ts`, the `<link>` in
 * `app/layout.tsx`, `/llms.txt`, `agentInterface.links.discovery` and four docs
 * all advertised the URL, so every agent following the documented entry point
 * hit a dead end.
 *
 * `.well-known` URIs are reserved at the origin (RFC 8615) and this one has to
 * keep its advertised path, so the Worker serves it ahead of the Next handler
 * rather than the route moving somewhere the scanner can see. That also keeps
 * it working in `bun run dev`, which runs this same Worker entry.
 */
export const WHETHER_AGENT_MANIFEST_PATH = "/.well-known/whether-agent.json";

export const buildAgentManifest = (baseUrl = resolveSiteUrl()) => ({
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

export const agentManifestResponse = () =>
  new Response(JSON.stringify(buildAgentManifest()), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Matches the `revalidate = 3600` the unreachable route declared.
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      // A discovery manifest is meant to be read cross-origin by agent clients,
      // the same reason /api/agent carries permissive read-only CORS.
      "Access-Control-Allow-Origin": "*",
    },
  });
