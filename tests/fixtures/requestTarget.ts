/**
 * The URL and body of a stubbed `fetch` call, without stringifying an object.
 *
 * Tests that assert on a stubbed upstream all wrote `String(input)`, where
 * `input` is `RequestInfo | URL` — a `Request` there stringifies to
 * "[object Object]" and the assertion compares two pieces of nonsense. It has
 * not bitten yet only because every call site happens to pass a string. These
 * read the field that actually holds the value, so the assertion stays true if
 * a caller ever passes a `Request`.
 */

export const requestUrl = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
};

/**
 * The text of a stubbed request body.
 *
 * `BodyInit` also covers Blob, ArrayBuffer and ReadableStream, which have no
 * useful `toString` — that is what the lint rule objects to. The two kinds
 * these tests actually send do: a string, and the URLSearchParams the Stripe
 * client posts. Anything else has no text form and returns "".
 */
export const requestBodyText = (body: BodyInit | null | undefined): string => {
  if (typeof body === "string") return body;
  if (body instanceof URLSearchParams) return body.toString();
  return "";
};
