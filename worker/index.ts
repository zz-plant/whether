import { handleImageOptimization } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

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

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const secret = env.WHETHER_CRON_SECRET;
    const headers: Record<string, string> = {};
    if (secret) headers["Authorization"] = `Bearer ${secret}`;

    /* Send weekly brief to email subscribers */
    const site = env.SITE_URL || "https://whether.work";
    await fetch(`${site}/api/email/send-weekly`, { method: "POST", headers });

    /* Check if regime changed and alert if so */
    await fetch(`${site}/api/check-regime-change`, { method: "POST", headers });

    /* Evaluate alert conditions and deliver to subscribers */
    await fetch(`${site}/api/alert-deliveries`, { method: "POST", headers });
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

    if (env.WHETHER_DURABLE_KV) {
      (globalThis as Record<string, unknown>).WHETHER_DURABLE_KV = env.WHETHER_DURABLE_KV;
    }

    return handler.fetch(request);
  },
};
