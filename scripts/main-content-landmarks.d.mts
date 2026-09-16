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
 * Same-page `#anchor` targets the rendered page does not carry, sorted. Reads
 * the flight payload's ids as well as the literal markup's, because a streamed
 * route's landmark arrives escaped rather than as an element.
 */
export function inspectInPageAnchors(html: string): string[];

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
