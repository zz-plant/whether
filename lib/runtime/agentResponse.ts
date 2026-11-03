import { WHETHER_AGENT_MANIFEST_PATH } from "../agent/discovery";
import { resolveSiteUrl } from "../siteUrl";

/**
 * Two response-level handshakes for agents, applied by worker/index.ts:
 *
 * - Markdown negotiation: an agent that asks for `text/markdown` at the homepage is
 *   served the Markdown brief (`/brief.md`) instead of HTML. Browsers never send that
 *   Accept header, so HTML readers see no change; the negotiation rewrites the request,
 *   so `/brief.md`'s own caching and headers are the ones that apply.
 * - Link headers: the HTTP form of the `<link rel="alternate">` tags the root layout
 *   already emits in <head>, for an agent that reads headers and not HTML. Where an
 *   agent learns the site's machine surfaces, without parsing a page.
 */
const BRIEF_MARKDOWN_PATH = "/brief.md";

/**
 * The rewritten request when the client asked for markdown, or null when it did not.
 * Only the homepage negotiates: it is the page whose content *is* the brief, and
 * `/brief.md` is its published Markdown form. An Accept header that names no type
 * explicitly (curl's wildcard default, a prefetcher) is deliberately not a request
 * for markdown; only an explicit `text/markdown` is.
 */
export const negotiateMarkdown = (request: Request): Request | null => {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  if (url.pathname !== "/") return null;
  const accept = request.headers.get("accept");
  if (!accept || !accept.toLowerCase().includes("text/markdown")) return null;
  return new Request(new URL(BRIEF_MARKDOWN_PATH, url), {
    method: request.method,
    headers: request.headers,
  });
};

/** Adds the agent discovery links to HTML responses; every other type passes through. */
export const withAgentDiscoveryLinks = (response: Response): Response => {
  if (!(response.headers.get("content-type") ?? "").includes("text/html")) return response;
  const headers = new Headers(response.headers);
  // appends, not sets: a response that already carries a Link keeps it.
  headers.append("Link", `<${resolveSiteUrl()}${WHETHER_AGENT_MANIFEST_PATH}>; rel="describedby"; type="application/json"`);
  headers.append("Link", `<${resolveSiteUrl()}/llms.txt>; rel="describedby"; type="text/plain"`);
  headers.append("Link", `<${resolveSiteUrl()}${BRIEF_MARKDOWN_PATH}>; rel="alternate"; type="text/markdown"`);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
