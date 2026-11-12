/**
 * Reading a file the site serves from `public/` (a share card's font) from inside a request.
 *
 * In production a route cannot fetch its own origin: the Worker's subrequest to its own
 * hostname does not reach the static files, so `loadOgFonts` failed on every request and
 * every share card drew Satori's built-in face instead of the site's (found 2026-11-12;
 * the cards had been in that face since they moved to fetched fonts). The worker entry
 * installs the static-assets binding here, the way it installs `waitUntil`, through
 * globalThis because the entry and the app can be separate module graphs. Outside
 * Workers (the dev server, tests) nothing is installed and the file is fetched from the
 * request's origin, as before.
 */
type AssetFetcher = (request: Request) => Promise<Response>;

const ASSET_FETCHER_GLOBAL = "WHETHER_ASSET_FETCHER";

export const installAssetFetcher = (fetcher: AssetFetcher | null) => {
  Reflect.set(globalThis, ASSET_FETCHER_GLOBAL, fetcher);
};

/** The file at `path` on the site serving `requestUrl`, from the static assets where installed. */
export const fetchStaticAsset = (path: string, requestUrl: string): Promise<Response> => {
  const request = new Request(new URL(path, requestUrl));
  const fetcher: unknown = Reflect.get(globalThis, ASSET_FETCHER_GLOBAL);
  return typeof fetcher === "function" ? Promise.resolve(Reflect.apply(fetcher, undefined, [request])) : fetch(request);
};
