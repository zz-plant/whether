import { WHETHER_AGENT_MANIFEST_PATH, buildAgentEndpoints } from "../agent/discovery";
import { siteUrl } from "../siteUrl";

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
    "/auth.md",
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

/**
 * The Content-Signal line (contentsignals.org) declared in every group.
 *
 * All three granted, on the record, matching the crawler decisions above: the
 * site is built to be indexed, answered from, and trained on, and `/llms.txt`
 * is the entry point an agent is pointed at. Declaring it here rather than via
 * Cloudflare's managed robots.txt (Bot Preference Sync) is deliberate: with
 * every AI bot policy set to allow, that feature publishes nothing, and set to
 * block it would prepend Disallow rules and an edge block for exactly the
 * crawlers this site chooses to serve.
 */
export const CONTENT_SIGNAL = "search=yes, ai-input=yes, ai-train=yes";

export type RobotsRule = {
  userAgent: string | string[];
  allow?: string | string[];
  disallow?: string | string[];
  contentSignal?: string;
};

/** The structured rules every surface reads; the rendered file cannot drift from them. */
export const buildRobotsRules = (): RobotsRule[] => [
  { userAgent: "*", allow: ALLOWED_PATHS, disallow: DISALLOWED_PATHS, contentSignal: CONTENT_SIGNAL },
  { userAgent: RETRIEVAL_CRAWLERS, allow: ALLOWED_PATHS, disallow: DISALLOWED_PATHS, contentSignal: CONTENT_SIGNAL },
  { userAgent: TRAINING_CRAWLERS, allow: ALLOWED_PATHS, disallow: DISALLOWED_PATHS, contentSignal: CONTENT_SIGNAL },
];

/** The feeds and sitemaps submitted from robots.txt. */
export const robotsSitemapPaths = [
  `${siteUrl}/sitemap.xml`,
  `${siteUrl}/news-sitemap.xml`,
  `${siteUrl}/feed.xml`,
];

const directiveLines = (values: string | string[] | undefined, directive: string): string[] =>
  (Array.isArray(values) ? values : values ? [values] : []).map((value) => `${directive}: ${value}`);

const renderRule = (rule: RobotsRule): string[] => [
  ...(Array.isArray(rule.userAgent) ? rule.userAgent : [rule.userAgent]).map((agent) => `User-Agent: ${agent}`),
  ...(rule.contentSignal ? [`Content-Signal: ${rule.contentSignal}`] : []),
  ...directiveLines(rule.allow, "Allow"),
  ...directiveLines(rule.disallow, "Disallow"),
];

/**
 * The whole file as text, served by `app/robots.txt/route.ts`. The Content-Signal
 * line is not representable in Next's `MetadataRoute.Robots`, so the metadata route
 * became a plain route handler rendering from the same rules the tests check.
 */
export const renderRobotsTxt = (): string =>
  [
    [
      "# Whether's robots.txt. Rendered from lib/seo/robotsTxt.ts — edit the rules there, not here.",
      "# Cloudflare's managed robots.txt (Bot Preference Sync) is left off on purpose: with every",
      "# AI bot policy set to allow it publishes nothing, and set to block it would prepend",
      "# Disallow rules for the crawlers the groups below choose to serve.",
      "",
      "# Content-Signal (contentsignals.org) declares how this site's content may be used:",
      "#   search   = indexed to answer searches",
      "#   ai-input = fed to an AI model to answer a live question (retrieval, grounding)",
      "#   ai-train = collected to train models",
      "# All three are granted: the agent surface at /llms.txt is built for exactly these readers.",
    ].join("\n"),
    buildRobotsRules()
      .map((rule) => renderRule(rule).join("\n"))
      .join("\n\n"),
    robotsSitemapPaths.map((url) => `Sitemap: ${url}`).join("\n"),
    `Host: ${siteUrl}`,
    "",
  ].join("\n");
