import { siteUrl } from "../../lib/siteUrl";

/**
 * `/auth.md` answers, in one page, the question an agent asks before it tries anything:
 * what does it take to log in here. For Whether the answer is "nothing" — every endpoint
 * the agent surface advertises is a public read — and the authenticated routes are named
 * so an agent does not go looking for a login that does not exist. Pointed at from
 * `/llms.txt`'s discovery section (`tests/agentDiscoveryParity.test.ts` holds the list).
 */
const buildAuthMd = (): string => [
  "# Whether — authentication for agents",
  "",
  `Whether asks no agent to sign in: no account, no key, no OAuth. Every endpoint the [agent manifest](${siteUrl}/.well-known/whether-agent.json) and [/llms.txt](${siteUrl}/llms.txt) advertise answers a plain GET from anyone, with read-only CORS for a browser-based tool client.`,
  "",
  "- The one write that takes no credentials is subscribing an email to the weekly brief: `POST /api/mcp?tool=subscribe` with `{ \"email\": \"name@company.com\" }`.",
  "- Email confirmation links carry a one-time token, show what they would change, and apply it only when the confirm button is used.",
  "- The scheduler's routes (delivering the digest, decision events, alert deliveries) take `Authorization: Bearer <WHETHER_CRON_SECRET>`, stay closed in robots.txt, and are not for agents.",
  "- `/api/decision-memory` is reachable but owner-scoped: it answers 401 without an `x-whether-client-id` header naming the owner whose entries are read or written.",
  "- The CLI's `whether auth status` verifies a key you keep (`WHETHER_API_KEY`) against `GET /api/auth/status`; no public endpoint requires it.",
  "",
  "If authenticated agent access ever exists, this file is the first thing updated.",
  "",
].join("\n");

export async function GET() {
  return new Response(buildAuthMd(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      // Content changes only with a deploy; one hour, like /llms.txt.
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
