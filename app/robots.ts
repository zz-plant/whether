import type { MetadataRoute } from "next";
import { WHETHER_AGENT_MANIFEST_PATH, buildAgentEndpoints } from "../lib/agent/discovery";
import { siteUrl } from "../lib/siteUrl";

// Capital Posture Governance SEO guardrails: make the dashboard discoverable and scannable.

/*
 * `/api/` is closed by default, and every API path a public document advertises
 * is opened. Three documents advertise them: the agent manifest, `/llms.txt` and
 * `/api-docs`. Until 2026-10-27 this list was held to llms.txt alone, so the
 * manifest's own endpoints (`/api/weekly`, `/api/cadence`, `/api/treasury` and four
 * more) and most of `/api-docs` were advertised and closed at once.
 * `tests/robotsRoute.test.ts` reads all three now and checks each `/api/...` path
 * they name against these rules.
 */

/* The manifest's endpoints, by path, from the builder the manifest and llms.txt read. */
const MANIFEST_PATHS = Object.values(buildAgentEndpoints("")).map((url) => url.replace(/\?.*$/, ""));

/* The rest of what `/api-docs` documents. A prefix opens a family whose members are all
   public reads: every `/api/cli/*` route answers the CLI, every `/api/image/*` route an image. */
const DOCUMENTED_API_PATHS = [
  "/api/og",
  "/api/posture/current",
  "/api/scores",
  "/api/comps",
  "/api/regime-alerts",
  "/api/decision",
  "/api/integrations/weekly-mandate",
  "/api/brief/slack",
  "/api/image/",
  "/api/export/board-slide",
  "/api/embed",
  "/api/badge",
  "/api/cli/",
];

const ALLOWED_PATHS = [
  ...new Set([
    "/",
    ...MANIFEST_PATHS,
    ...DOCUMENTED_API_PATHS,
    WHETHER_AGENT_MANIFEST_PATH,
    "/.well-known/webmcp.json",
    "/.well-known/mcp.json",
    "/llms.txt",
    "/llms-full.txt",
  ]),
];

/*
 * The most specific rule wins (RFC 9309 §2.2.2), so an open path would also open every
 * route its path is a prefix of. These are the closed ones that share a prefix with an
 * open one: a route the cron calls with its secret, and the alert digest, which no
 * document advertises. `/api/health` and `/api/telemetry/*` need no line of their own.
 */
const DISALLOWED_PATHS = ["/api/", "/api/brief/slack/deliver", "/api/decision-events", "/api/weekly-digest"];

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
    /* The feed is submitted as a sitemap of its own, which is how Google takes
       an RSS feed: it names the newest weeks, the URLs a crawler most needs to
       find quickly. It used to sit inside sitemap.xml as a <url> entry, where it
       is not a page and was crawled as one. */
    sitemap: [`${siteUrl}/sitemap.xml`, `${siteUrl}/news-sitemap.xml`, `${siteUrl}/feed.xml`],
    host: siteUrl,
  };
}
