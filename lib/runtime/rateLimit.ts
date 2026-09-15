/**
 * Workers rate limiting bindings, declared as `[[ratelimits]]` in wrangler.toml and
 * installed on globalThis with every other binding (worker/index.ts, `installBindings`).
 *
 * Two limiters, because one binding carries one limit:
 *
 * - WHETHER_SUBSCRIBE_RATE_LIMITER guards the subscribe endpoints. Each accepted POST sends
 *   a verification email from this product's domain, so an unguarded endpoint is a way to
 *   flood a stranger's inbox with mail signed by whether.work and to burn the send quota.
 * - WHETHER_PUBLIC_WRITE_RATE_LIMITER guards the browser telemetry intake and the per-ticker
 *   quote proxy. The intake is public by necessity; the proxy's upstream rate-limits this
 *   Worker as a whole, so one abusive caller used to cost every visitor the comps.
 *
 * The binding is permissive and eventually consistent: counters are per Cloudflare
 * location and updated in the background, so a burst can briefly exceed the limit. That
 * is the right tool for abuse control and the wrong one for accounting, which nothing
 * here uses it for.
 *
 * Absent the binding — bun tests, node scripts, `bun run dev` — every check allows the
 * request and reports `enforced: false`, so a deployment without the binding behaves as it
 * did before this file existed rather than refusing everyone.
 */

export type RateLimiterName = "WHETHER_SUBSCRIBE_RATE_LIMITER" | "WHETHER_PUBLIC_WRITE_RATE_LIMITER";

type RateLimiterBinding = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

export type RateLimitDecision =
  | { allowed: true; enforced: boolean }
  | { allowed: false; enforced: true };

/* Narrowed at runtime rather than asserted: the binding is whatever the runtime installed on
   globalThis, so both the method and the shape of its answer are checked before use. */
const resolveBinding = (name: RateLimiterName): RateLimiterBinding | null => {
  const candidate: unknown = Reflect.get(globalThis, name);
  if (typeof candidate !== "object" || candidate === null) return null;
  const limit: unknown = Reflect.get(candidate, "limit");
  if (typeof limit !== "function") return null;
  return {
    async limit(options) {
      const answer: unknown = await Reflect.apply(limit, candidate, [options]);
      const success = typeof answer === "object" && answer !== null && Reflect.get(answer, "success") === true;
      return { success };
    },
  };
};

/**
 * The caller's address, as Cloudflare saw it. `cf-connecting-ip` is set by the edge and
 * cannot be forged past it; `x-forwarded-for` is the local-dev stand-in. With neither,
 * every anonymous caller shares one bucket, which is the safe direction to fail.
 */
export const clientKeyFor = (request: Request): string => {
  const edgeAddress = request.headers.get("cf-connecting-ip")?.trim();
  if (edgeAddress) return edgeAddress;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "anonymous";
};

export const checkRateLimit = async (name: RateLimiterName, key: string): Promise<RateLimitDecision> => {
  const binding = resolveBinding(name);
  if (!binding) return { allowed: true, enforced: false };

  try {
    const { success } = await binding.limit({ key });
    return success ? { allowed: true, enforced: true } : { allowed: false, enforced: true };
  } catch (error) {
    // Fail open: a limiter outage must not take the endpoint down with it.
    console.warn(`[rate-limit:${name}] check failed; allowing`, error);
    return { allowed: true, enforced: false };
  }
};

/** Thrown from shared flows (the subscribe flow) so each route can answer 429 in its own shape. */
export class RateLimitedError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds = 60) {
    super("Too many requests. Try again in a minute.");
    this.name = "RateLimitedError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const rateLimitedResponse = (retryAfterSeconds = 60): Response =>
  new Response(JSON.stringify({ ok: false, error: "rate_limited" }), {
    status: 429,
    headers: {
      "content-type": "application/json",
      "retry-after": String(retryAfterSeconds),
    },
  });
