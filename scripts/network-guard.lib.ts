/**
 * A `fetch` that refuses to leave the machine. Loopback and relative URLs pass; everything
 * else throws, naming only the origin. The suite's own choices (escape hatch, guidance,
 * the per-run ingestion store) are `scripts/test-network-guard.ts`; nothing here names them.
 * docs/agents/lessons/toolchain-and-gates.md, "The suite runs offline".
 */

/** What the wrapped fetch calls itself, and what it tells a test the first time it blocks one. */
export type NetworkGuardOptions = {
  /** The bracketed prefix on the thrown message, e.g. "test-network-guard". */
  label: string;
  /** Printed once per process, the first time a request is blocked. */
  guidance: string;
};

/** Loopback and relative URLs: a server the suite itself started. */
export const isLocalTarget = (url: string): boolean => {
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) return true; // relative: never leaves the process
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return true; // not a URL we can judge; let fetch report it
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return true;
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "::1") return true;
  // RFC 6761 reserves .localhost for loopback.
  if (host.endsWith(".localhost")) return true;
  // 127.0.0.0/8 as four octets, not as a prefix: `127.0.0.1.example.com` is a remote host.
  const octets = host.split(".");
  return (
    octets.length === 4 &&
    octets[0] === "127" &&
    octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255)
  );
};

/** The request target, whatever shape `fetch` was handed. */
export const targetUrl = (input: Parameters<typeof fetch>[0]): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  if (typeof input === "object" && input !== null && "url" in input) return String(input.url);
  return String(input);
};

/**
 * The origin and nothing after it. A webhook URL holds its secret in the path and an API
 * key rides in the query, so the origin is the only part a log line may carry; it also
 * names the upstream to serve, which is the decision the reader has to make.
 */
export const redactTarget = (url: string): string => {
  try {
    return new URL(url).origin;
  } catch {
    return "an unparseable URL";
  }
};

/**
 * Wraps `passThrough` so anything but a local target throws instead of leaving the box.
 * The thrown message is one line; the guidance prints once per process.
 */
export function createGuardedFetch(
  passThrough: typeof fetch,
  explain: (text: string) => void,
  { label, guidance }: NetworkGuardOptions,
): typeof fetch {
  let explained = false;

  // Annotated, not asserted, so the parameters are contextually typed from `fetch` itself.
  const guardedFetch: typeof fetch = async (input, init) => {
    const url = targetUrl(input);
    if (isLocalTarget(url)) return passThrough(input, init);

    if (!explained) {
      explained = true;
      explain(guidance);
    }

    throw new Error(`[${label}] blocked outbound fetch to ${redactTarget(url)}`);
  };

  return guardedFetch;
}
