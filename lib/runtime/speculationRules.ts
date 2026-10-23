/**
 * Hover prefetch for same-origin links, delivered the one way a server can: the
 * `Speculation-Rules` response header. The header is a Structured Fields list
 * of URLs whose resources contain the rules JSON, not the JSON itself (the
 * HTML standard); the rules document lives at `/speculation-rules.json`.
 * Document rules, moderate eagerness: one request per hovered link,
 * deduplicated by URL, nothing executed, and /api excluded because a
 * speculative load of an endpoint is not a page anyone is navigating to.
 * Consumed by worker/index.ts, which sets the header on document responses.
 */
export const SPECULATION_RULES_PATH = "/speculation-rules.json";

/** Sets the speculation rules on document responses; other types pass through untouched. */
export const withSpeculationRules = (response: Response): Response => {
  if (!(response.headers.get("content-type") ?? "").includes("text/html")) return response;
  const headers = new Headers(response.headers);
  headers.set("Speculation-Rules", `"${SPECULATION_RULES_PATH}"`);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};