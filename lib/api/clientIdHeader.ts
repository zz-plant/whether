/**
 * The header that names which browser owns a stored record.
 *
 * Split out of `clientOwnership.ts` so the browser can import it: that module
 * pulls in `next/server` for its 401 and 403 responses, which has no business
 * in a client bundle. Before this the string existed in three places — the
 * guard, the API docs page, and every caller written from the docs — so the one
 * name that has to match on both ends of every owned request was the one thing
 * nothing held.
 */
export const CLIENT_ID_HEADER = "x-whether-client-id";
