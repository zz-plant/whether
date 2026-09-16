/** What one route's HTML says about its `<main>` landmark and skip-link target. */
export interface MainContentInspection {
  mainCount: number;
  mainContentIdCount: number;
  skipLinkCount: number;
  nestedMain: boolean;
  /** Empty when the route owns exactly one correctly-targeted `<main>`. */
  issues: string[];
}

/** One audited route: its inspection, plus how the fetch itself went. */
export interface MainContentRouteResult extends MainContentInspection {
  route: string;
  url: string;
  finalUrl: string;
  /** `null` when the fetch threw before a response arrived. */
  status: number | null;
  ok: boolean;
  /**
   * The route did not render, so it has no landmark to judge. Callers report
   * these separately instead of counting an unrelated outage as a violation.
   */
  unauditable: boolean;
}

/** Counts `<main>` landmarks and `#main-content` targets in a rendered page. */
export function inspectMainContentHtml(html: string): MainContentInspection;

/**
 * The ids a rendered page carries and the same-page `#anchor` targets it links
 * to, both sorted. Ids come from the flight payload as well as the literal
 * markup, because a streamed route's landmark arrives escaped rather than as an
 * element. `#top` is excluded: it needs no id.
 */
export function inspectInPageAnchors(html: string): { ids: string[]; anchors: string[] };

/**
 * Per route, the anchors it links to that no audited route renders an id for.
 * Aggregated before judging, because whether a given section is on screen
 * depends on the data a route got; whether the id exists at all does not.
 */
export function collectUnresolvedAnchors(
  results: Array<{ route: string; anchorIds?: string[]; inPageAnchors?: string[] }>,
): Array<{ route: string; missing: string[] }>;

/**
 * Every page route under `appDir`, with dynamic segments replaced by the
 * representative URLs pinned in `main-content-landmarks.mjs`. Throws when a
 * dynamic page has no sample, so a new route cannot silently skip the audit.
 */
export function collectMainContentRouteSamples(options?: {
  appDir?: string;
}): Promise<string[]>;

/** Fetches and inspects every route, up to `concurrency` at a time. */
export function auditMainContentRoutes(options: {
  baseUrl: string;
  routes: string[];
  fetchImpl?: typeof fetch;
  concurrency?: number;
}): Promise<MainContentRouteResult[]>;
