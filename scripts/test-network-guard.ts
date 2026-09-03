/**
 * Blocks outbound network from the test suite.
 *
 * Loaded for every `bun test` run through `bunfig.toml`, so it applies to the
 * runner, to `bun run test <path>`, and to a bare `bun test` alike.
 *
 * The suite already serves its own upstreams wherever a test asserts on data:
 * `tests/architectureInvariants.test.ts` hands the read path a fixture fetcher,
 * and `scripts/run-tests.mjs` strips `FRED_API_KEY` and `ALPHA_VANTAGE_API_KEY`
 * so a shell cannot reroute a fixture-driven test to a real API. What it did not
 * do was stop the *un*-asserted reads: code under test that calls FRED or
 * Treasury on a path the test never checks, and simply waits for whatever the
 * box happens to allow.
 *
 * That waiting was most of the suite. Measured on 2026-09-03, blocking outbound
 * fetch took the full run from 49.3s to 13.7s with all 1169 tests still passing
 * — not one test needed the network. Three files held ~18s of it on their own
 * (`/api/health` 8.5s -> 0.4s, `whetherClientSdk` 5.3s -> 0.4s,
 * `mcpCommitmentLinter` 4.8s -> 0.4s), all of it spent on FRED reads whose
 * results nothing asserted against.
 *
 * Speed is the smaller half. A suite that inherits the network gives a different
 * answer depending on where it runs, and this repo has already paid for that:
 * Invariant 1 ("reading performs zero writes") passed in a sandbox that reaches
 * nothing and failed every Cloudflare build from 2026-08-30 to 2026-09-02, where
 * FRED answers and the read path therefore ingested and took the refresh lock.
 * CLAUDE.md draws the rule from it — "a test about writes has to serve its own
 * upstreams" — and this makes the rule the default instead of a thing each test
 * has to remember. The same argument the runner already makes about a stray API
 * key: a result that depends on what the environment happens to allow is not a
 * result about the code.
 *
 * Loopback stays open. `tests/whetherCli.test.ts` starts a local server and
 * points the CLI at it, which is the suite serving its own upstream rather than
 * reaching for someone else's.
 *
 * A test that replaces `globalThis.fetch` with its own mock still wins — it
 * assigns over this one, which is the intended way to serve a fixture. The guard
 * only decides what an *unmocked* call does.
 *
 * Escape hatch, for deliberately exercising a real upstream:
 *   WHETHER_TEST_ALLOW_NETWORK=1 bun run test <path>
 */
const ALLOW_NETWORK = process.env.WHETHER_TEST_ALLOW_NETWORK === "1";

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
 * The message goes to test output and, in the deploy gate, to a build log — so it must not
 * carry a credential. Plenty of URLs here are credentials in their entirety:
 * `SLACK_WEBHOOK_URL` and `PREMIUM_FUNNEL_WEBHOOK_URL` hold their secret in the *path*
 * (`hooks.slack.com/services/T…/B…/…`), and `lib/premiumFunnel.ts` hands that value
 * straight to the global `fetch` this guard wraps. Query strings are no safer — the repo
 * already carries `redactFredApiKey` and `redactAlphaVantageKey` for exactly that.
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
 * them (`[families] Ingest error for family ...`), so a multi-line message is
 * reprinted for every blocked call and buries the run. The guidance is worth having
 * once per process, the first time a run is blocked, and never again.
 */
export function createGuardedFetch(passThrough: typeof fetch, explain: (text: string) => void): typeof fetch {
  let explained = false;

  // Annotated as the return type rather than asserted onto one: the parameters are
  // then contextually typed from `fetch` itself, so this stays honest about the
  // signature instead of asking the compiler to take its word for it.
  const guardedFetch: typeof fetch = async (input, init) => {
    const url = targetUrl(input);
    if (isLocalTarget(url)) return passThrough(input, init);

    if (!explained) {
      explained = true;
      explain(
        "[test-network-guard] This suite serves its own upstreams so a run means the same thing on every box.\n" +
          "  Serve one: pass a fixture fetcher into the code under test (see fixtureFetch in\n" +
          "  tests/architectureInvariants.test.ts), or assign globalThis.fetch in the test and restore it after.\n" +
          "  To exercise the real upstream on purpose: WHETHER_TEST_ALLOW_NETWORK=1.\n",
      );
    }

    throw new Error(`[test-network-guard] blocked outbound fetch to ${redactTarget(url)}`);
  };

  return guardedFetch;
}

if (!ALLOW_NETWORK) {
  globalThis.fetch = createGuardedFetch(globalThis.fetch, (text) => process.stderr.write(text));
}
