import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/siteUrl";

// Capital Posture Governance SEO guardrails: make the dashboard discoverable and scannable.

/*
 * `/api/` is closed by default; every API path a public document advertises
 * is opened here by name. `/api/mcp` was the one that slipped: llms.txt led
 * with it as the tool endpoint for agents while this file told the same
 * agents not to fetch it. `tests/robotsRoute.test.ts` now reads llms.txt and
 * checks each `/api/...` path it names against this allow list.
 */
const ALLOWED_PATHS = [
  "/",
  "/api/og",
  "/brief.md",
  "/api/agent",
  "/api/mcp",
  "/.well-known/whether-agent.json",
  "/llms.txt",
  "/llms-full.txt",
  "/api/posture/current",
];

const DISALLOWED_PATHS = ["/api/"];

/**
 * The crawlers that fetch a page to answer a question being asked right now,
 * and cite it in the answer.
 *
 * These are the ones this site exists to be read by: the agent surface, the
 * Markdown brief and the machine-readable endpoints are all built for a reader
 * that arrives with a question. Blocking them would remove the site from the
 * answers, not protect anything.
 */
const RETRIEVAL_CRAWLERS = ["OAI-SearchBot", "PerplexityBot", "ClaudeBot", "Amazonbot"];

/**
 * The crawlers that collect pages for model training rather than to answer a
 * live question.
 *
 * Kept open, which is the same thing a lone `User-Agent: *` group already did —
 * but as a decision on the record rather than a default nobody chose. The two
 * groups are separable and the distinction is real: the first sends readers and
 * attribution back, the second does not. If that trade stops being worth it,
 * this is the one list to change, and it will not touch the group above.
 *
 * `Google-Extended` and `Applebot-Extended` are not fetchers — they are the
 * opt-out tokens for Gemini and Apple Intelligence training — so they belong in
 * this group and nowhere else. Naming them is the only way to say "yes"
 * deliberately; silence reads as the same yes, without the decision.
 */
const TRAINING_CRAWLERS = [
  "GPTBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "anthropic-ai",
  "meta-externalagent",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: ALLOWED_PATHS, disallow: DISALLOWED_PATHS },
      { userAgent: RETRIEVAL_CRAWLERS, allow: ALLOWED_PATHS, disallow: DISALLOWED_PATHS },
      { userAgent: TRAINING_CRAWLERS, allow: ALLOWED_PATHS, disallow: DISALLOWED_PATHS },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
