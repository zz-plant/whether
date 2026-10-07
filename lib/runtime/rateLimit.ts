/**
 * Workers rate limiting bindings (`[[ratelimits]]` in wrangler.toml, installed on globalThis
 * with every other binding). One binding carries one limit: the subscribe endpoints (each
 * accepted POST sends mail from this domain) and the public writes (telemetry intake, the
 * quote proxy whose upstream limits the Worker as a whole). Permissive and eventually
 * consistent, which is right for abuse control and wrong for accounting. Absent the binding
 * every check allows and reports `enforced: false`. docs/agents/lessons/runtime-helpers.md.
 */
type RateLimiterName = "WHETHER_SUBSCRIBE_RATE_LIMITER" | "WHETHER_PUBLIC_WRITE_RATE_LIMITER";

type RateLimiterBinding = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

type RateLimitDecision =
  | { allowed: true; enforced: boolean }
  | { allowed: false; enforced: true };

// Narrowed at runtime: the binding is whatever the runtime installed on globalThis.
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
 * The caller's address as Cloudflare saw it (`cf-connecting-ip` cannot be forged past the
 * edge; `x-forwarded-for` is the local-dev stand-in). With neither, every anonymous caller
 * shares one bucket, which is the safe direction to fail.
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
