/**
 * Query-string helpers for disclosure state, shared by every panel that carries
 * its open state in the URL (see section XII of docs/agents/ui-ux-standards.md).
 *
 * Pure and framework-free so both the server (resolving the initial state from
 * `searchParams`) and the client (rewriting the URL on toggle) can use them.
 */

export const resolveDisclosureInitialOpen = (
  searchParams: Pick<URLSearchParams, "get"> | null,
  queryKey?: string,
  queryValue = "1",
  defaultOpen = false,
) => {
  if (!queryKey) {
    return defaultOpen;
  }
  return searchParams?.get(queryKey) === queryValue;
};

export const buildDisclosureHref = (
  pathname: string,
  searchParams: Pick<URLSearchParams, "toString"> | null,
  queryKey: string,
  nextOpen: boolean,
  queryValue = "1",
) => {
  const nextParams = new URLSearchParams(searchParams?.toString() ?? "");
  if (nextOpen) {
    nextParams.set(queryKey, queryValue);
  } else {
    nextParams.delete(queryKey);
  }
  const nextQuery = nextParams.toString();
  return nextQuery.length > 0 ? `${pathname}?${nextQuery}` : pathname;
};

/**
 * Server-side counterpart: route components receive `searchParams` as a plain
 * object, not a `URLSearchParams`. Keeps the "what counts as open" convention in
 * one place rather than letting each page hardcode `=== "1"`.
 */
export const isDisclosureOpenInParams = (
  searchParams: Record<string, string | undefined> | undefined,
  queryKey: string,
  queryValue = "1",
) => searchParams?.[queryKey] === queryValue;
