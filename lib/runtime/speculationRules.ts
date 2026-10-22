/**
 * Hover prefetch for same-origin links, delivered the one way a server can:
 * the Speculation-Rules response header. The HTML standard requires
 * `type="speculationrules"` scripts to be inline and fires an error on one
 * with a `src`, so a script element loading its rules from a URL prefetched
 * nothing; URL-hosted rules ride this header instead. Document rules, moderate
 * eagerness: one request per hovered link, deduplicated by URL, nothing
 * executed, and /api excluded because a speculative load of an endpoint is not
 * a page anyone is navigating to. Consumed by worker/index.ts, which sets it
 * on document responses.
 */
export const SPECULATION_RULES = JSON.stringify({
  prefetch: [
    {
      source: "document",
      where: { and: [{ href_matches: "/**" }, { not: { href_matches: "/api/**" } }] },
      eagerness: "moderate",
    },
  ],
});

/** Sets the speculation rules on document responses; other types pass through untouched. */
export const withSpeculationRules = (response: Response): Response => {
  if (!(response.headers.get("content-type") ?? "").includes("text/html")) return response;
  const headers = new Headers(response.headers);
  headers.set("Speculation-Rules", SPECULATION_RULES);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
