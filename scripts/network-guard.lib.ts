/**
 * A `fetch` that refuses to leave the machine.
 *
 * The mechanism behind `scripts/test-network-guard.ts`, which is what `bunfig.toml`
 * preloads and where this repo's own choices live: the escape-hatch variable, the
 * guidance a blocked test prints, and the per-run ingestion store. Nothing here names
 * them, so the guard reads the same in any suite that wants its tests to serve their
 * own upstreams.
 *
 * Loopback and relative URLs pass: a server the suite itself started is the suite
 * owning its upstream rather than reaching for someone else's. Everything else throws,
 * with a message that names only the origin.
 */

/** What the wrapped fetch calls itself, and what it tells a test the first time it blocks one. */
export type NetworkGuardOptions = {
  /** The bracketed prefix on the thrown message, e.g. "test-network-guard". */
  label: string;
  /** Printed once per process, the first time a request is blocked. */
  guidance: string;
};

/**
 * Loopback and relative URLs — a server the suite itself started, so serving it is
 * the suite owning its upstream rather than reaching for someone else's.
 */
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
  /*
   * 127.0.0.0/8, matched as an address rather than as a prefix. `/^127\./` also
   * accepts `127.0.0.1.example.com`, which is a perfectly ordinary remote host that
   * anyone can register — the check has to see four octets and nothing else.
   */
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
 * What a blocked request may safely be called in an error: its origin, and nothing after.
 *
 * The message goes to test output and, in a deploy gate, to a build log — so it must not
 * carry a credential. Plenty of URLs are credentials in their entirety: a webhook URL
 * holds its secret in the *path* (`hooks.slack.com/services/T…/B…/…`), and query strings
 * are no safer — API keys ride in them.
 *
 * The origin is kept and everything else dropped, rather than the path being scrubbed by
 * pattern. A heuristic has to be right about every shape of secret anyone adds later; the
 * origin is right by construction, and it is the whole of what the message needs to be
 * useful — it names the upstream to serve, which is the decision the reader has to make.
 * `URL.origin` also drops any `user:pass@` userinfo.
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
 *
 * The thrown message is one line on purpose. Code under test catches these and logs
 * them, so a multi-line message is reprinted for every blocked call and buries the run.
 * The guidance is worth having once per process, the first time a run is blocked, and
 * never again.
 */
export function createGuardedFetch(
  passThrough: typeof fetch,
  explain: (text: string) => void,
  { label, guidance }: NetworkGuardOptions,
): typeof fetch {
  let explained = false;

  // Annotated as the return type rather than asserted onto one: the parameters are
  // then contextually typed from `fetch` itself, so this stays honest about the
  // signature instead of asking the compiler to take its word for it.
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
