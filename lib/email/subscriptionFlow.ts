import { createCloudflareEmailAdapter, type EmailDeliveryAdapter } from "./emailDelivery";
import { getSubscriberStore } from "./subscriberStore";
import { checkRateLimit, clientKeyFor, RateLimitedError } from "../runtime/rateLimit";
import { describePlanLineAreas, type PlanLines } from "../alert/planLines";

const DEFAULT_APP_BASE_URL = "https://whether.work";

const normalizeBaseUrl = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
};

const resolvePublicAppBaseUrl = (request?: Request) => {
  const configured = normalizeBaseUrl(process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL);
  if (configured) return configured;

  if (request) {
    const origin = normalizeBaseUrl(new URL(request.url).origin);
    if (origin) return origin;
  }

  return DEFAULT_APP_BASE_URL;
};

const buildEmailActionUrl = (path: string, request?: Request) => {
  const baseUrl = resolvePublicAppBaseUrl(request);
  return new URL(path, baseUrl).toString();
};

/** What the confirmation promises, stated from the stored record rather than the request. */
export const describeSubscription = ({
  alerts,
  weekly,
  pendingPlanLines,
}: {
  alerts: boolean;
  weekly: boolean;
  /** Lines this confirmation would set; the promise names their areas, or says they are cleared. */
  pendingPlanLines?: readonly PlanLines[];
}) => {
  if (pendingPlanLines) {
    if (pendingPlanLines.length === 0) return "to clear the lines you set for your plan on Whether";
    return `an email from Whether the day one of the lines you set for ${describePlanLineAreas(pendingPlanLines)} is crossed`;
  }
  if (weekly && alerts) return "the Whether weekly brief, plus an email when conditions change between Mondays";
  if (weekly) return "the Whether weekly brief";
  if (alerts) return "an email from Whether when conditions change, and no weekly brief";
  // Both off is an existing subscriber who turned alerts off and had already left the
  // weekly brief; confirming still reactivates the record, so say what it holds.
  return "your Whether subscription";
};

export const subscribeAndSendVerification = async ({
  email,
  alerts,
  weekly,
  planLines,
  request,
  adapter = createCloudflareEmailAdapter(),
}: {
  email: string;
  /** Opt-in to regime-change alert mail. Omitted leaves an existing choice alone. */
  alerts?: boolean;
  /** The Monday brief. Omitted leaves an existing choice alone; a new record gets it. */
  weekly?: boolean;
  /** Lines for the reader's own plan; they take effect when the address confirms. */
  planLines?: PlanLines[];
  request?: Request;
  adapter?: EmailDeliveryAdapter;
}) => {
  /* Checked before anything is written or sent: every accepted call mails a stranger's
     address from this domain, so the limit has to sit in front of the store, not after
     it. Throws so the three routes that share this flow each answer 429 in their own
     shape (lib/runtime/rateLimit.ts). */
  if (request) {
    const decision = await checkRateLimit("WHETHER_SUBSCRIBE_RATE_LIMITER", clientKeyFor(request));
    if (!decision.allowed) throw new RateLimitedError();
  }

  const store = getSubscriberStore();
  const subscriber = await store.subscribe(email, { alerts, weekly, planLines });
  const promise = describeSubscription(subscriber);
  const verifyUrl = buildEmailActionUrl(
    `/api/email/verify?token=${encodeURIComponent(subscriber.token)}`,
    request,
  );

  const result = await adapter.send({
    to: { email: subscriber.email },
    subject: "Confirm your Whether subscription",
    html: [
      "<!DOCTYPE html><html><body style='font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px;color:#1e293b;'>",
      "<h1 style='font-size:1.1rem;font-weight:600;'>Confirm your subscription</h1>",
      `<p style='font-size:0.95rem;'>Click the button to confirm you want ${promise}.</p>`,
      `<a href='${verifyUrl}' style='display:inline-block;padding:10px 20px;border-radius:6px;background:#0f172a;color:#fff;text-decoration:none;font-weight:600;'>Confirm subscription</a>`,
      "<p style='font-size:0.8rem;color:#64748b;margin-top:20px;'>If you didn't request this, ignore this email.</p>",
      "</body></html>",
    ].join(""),
    text: `Confirm your Whether subscription (${promise}): ${verifyUrl}`,
  });

  if (!result.ok) throw new Error(result.error);

  return { subscriber, verifyUrl };
};
