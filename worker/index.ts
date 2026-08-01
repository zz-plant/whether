import { handleImageOptimization } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { executeIngest } from "../lib/ingestion/executeIngest";

interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
  EMAIL?: {
    send(msg: {
      to: string;
      from: { email: string; name: string };
      subject: string;
      html: string;
      text: string;
    }): Promise<unknown>;
  };
  WHETHER_CRON_SECRET?: string;
  SITE_URL?: string;
  WHETHER_DURABLE_KV: { get(key: string): Promise<string | null>; put(key: string, value: string): Promise<void> };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ScheduledEvent = { cron: string; scheduledTime: number; type: "scheduled" };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ExecutionContext = { waitUntil(promise: Promise<unknown>): void; passThroughOnException(): void };

/**
 * Bindings reach library code through globalThis, so they must be installed on every
 * entry point. Missing them is silent: the storage repositories fall back to per-isolate
 * in-memory stores and appear to work while persisting nothing.
 */
const installBindings = (env: Env) => {
  if (!env) return;
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined && key !== "ASSETS" && key !== "IMAGES") {
      (globalThis as Record<string, unknown>)[key] = value;
    }
  }
};

const CRON_STEP_TIMEOUT_MS = 60_000;

/**
 * Cron steps are independent: a failing ingest should not silently cancel the weekly
 * email and alert delivery that follow it. Each step is bounded and its outcome logged
 * rather than thrown, so one bad dependency degrades a single step.
 */
const runCronStep = async (label: string, url: string, headers: Record<string, string>) => {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(CRON_STEP_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`[cron] ${label} responded ${response.status}`);
    }
  } catch (error) {
    console.error(`[cron] ${label} failed`, error);
  }
};

export default {
  async scheduled(event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    installBindings(env);

    const isDailyIngestion = event.cron === "0 2 * * *";

    /* Always ingest fresh signals to KV — call directly instead of self-fetch */
    const ingestResult = await executeIngest();
    if (!ingestResult.ok) {
      console.error("[cron] ingest failed", ingestResult.error);
    }

    if (isDailyIngestion) {
      /* Daily cron: ingestion only, no email or alerts */
      return;
    }

    const secret = env.WHETHER_CRON_SECRET;
    const headers: Record<string, string> = {};
    if (secret) headers["Authorization"] = `Bearer ${secret}`;

    const site = env.SITE_URL || "https://whether.work";

    /* Weekly cron: send briefs, check regime change, deliver alerts */
    await runCronStep("email/send-weekly", `${site}/api/email/send-weekly`, headers);
    await runCronStep("check-regime-change", `${site}/api/check-regime-change`, headers);
    await runCronStep("alert-deliveries", `${site}/api/alert-deliveries`, headers);
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES
            .input(body)
            .transform(width > 0 ? { width } : {})
            .output({ format, quality });

          return result.response();
        },
      });
    }

    installBindings(env);

    const response = await handler.fetch(request);

    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader && /whether-(company-stage|rate-sensitivity|ticker)=/.test(cookieHeader)) {
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "private, no-store");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return response;
  },
};
