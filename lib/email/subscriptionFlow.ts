import { createCloudflareEmailAdapter, type EmailDeliveryAdapter } from "./emailDelivery";
import { confirmationMailCapped, getSubscriberStore, withPendingApplied, type Subscriber } from "./subscriberStore";
import { checkRateLimit, clientKeyFor, RateLimitedError } from "../runtime/rateLimit";
import { describePlanLines, type PlanLines, type PlanRunway } from "../alert/planLines";
import { runwayBandPhrase, type RunwayBand } from "../report/operatorRunway";
import { siteUrl } from "../siteUrl";
import { escapeHtml } from "./emailShell";

const normalizeBaseUrl = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
};

/* Hosts a confirmation link may point at: the site, this worker on workers.dev
   (production, or a preview version's "<id>-whether.<account>.workers.dev"),
   and a developer's machine. A preview keeps its own host because its
   subscribers live in its own KV, where a whether.work link could not find them. */
const siteHost = new URL(siteUrl).hostname;
const isTrustedLinkHost = (hostname: string) =>
  hostname === siteHost
  || hostname === `www.${siteHost}`
  || /^(?:[a-z0-9-]+-)?whether\.[a-z0-9-]+\.workers\.dev$/.test(hostname)
  || hostname === "localhost"
  || hostname === "127.0.0.1"
  || hostname === "[::1]";

/**
 * Where a confirmation link points. Configured explicitly, that; otherwise the
 * host the request came in on, but only one of ours. Until 2026-10-02 any
 * request host was taken as given, so a request that reached the worker under a
 * forged Host header would mail a reader a confirm link to someone else's site,
 * and a link-scanning mail filter would hand that site the token.
 */
const resolvePublicAppBaseUrl = (request?: Request) => {
  const configured = normalizeBaseUrl(process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL);
  if (configured) return configured;

  if (request) {
    const url = new URL(request.url);
    if (isTrustedLinkHost(url.hostname)) return url.origin;
  }

  return siteUrl;
};

const buildEmailActionUrl = (path: string, request?: Request) => {
  const baseUrl = resolvePublicAppBaseUrl(request);
  return new URL(path, baseUrl).toString();
};

const joinClauses = (clauses: readonly string[]) =>
  clauses.length <= 1 ? (clauses[0] ?? "") : `${clauses.slice(0, -1).join(", ")} and ${clauses[clauses.length - 1]}`;

/** ", with what it means at 12–24 months of runway": the band the lines carry, named in the promise. */
const atRunwayClause = (runway: PlanRunway | undefined) =>
  runway ? `, with what it means at ${runwayBandPhrase(runway.band)} of runway` : "";

/** What a subscription delivers, from the record as it will stand once confirmed. */
export const describeSubscription = ({
  alerts,
  weekly,
  pendingPlanLines,
  planRunway,
}: {
  alerts: boolean;
  weekly: boolean;
  /** Lines the subscription watches; the promise names their areas. */
  pendingPlanLines?: readonly PlanLines[];
  /** The runway band stored beside those lines, which the promise names too: it is stored. */
  planRunway?: PlanRunway;
}) => {
  /* Every part of it, so a confirmation that sets lines still says what it does
     to the Monday brief: the lines clause used to return on its own. */
  const emails = [
    ...(alerts ? ["when conditions change between Mondays"] : []),
    ...(pendingPlanLines && pendingPlanLines.length > 0
      ? [`the day one of the lines you set is crossed (${describePlanLines(pendingPlanLines)})${atRunwayClause(planRunway)}`]
      : []),
  ];
  if (weekly) return emails.length > 0 ? `the Whether weekly brief, plus an email ${joinClauses(emails)}` : "the Whether weekly brief";
  if (emails.length > 0) return `an email from Whether ${joinClauses(emails)}, and no weekly brief`;
  // Both off is a confirmed subscriber who turned alerts off and had already left
  // the weekly brief; say what the record holds.
  return "your Whether subscription";
};

/** Each change a confirmed address is being asked to approve, in its reader's words. */
const describeChanges = (sub: Subscriber): string[] => {
  const after = withPendingApplied(sub);
  if (sub.pendingFlags?.reactivate) {
    return [`send this address Whether's emails again: ${describeSubscription({ ...after, pendingPlanLines: after.planLines })}`];
  }
  const changes: string[] = [];
  const { weekly, alerts } = sub.pendingFlags ?? {};
  if (weekly !== undefined) changes.push(`${weekly ? "start" : "stop"} the Whether weekly brief`);
  if (alerts !== undefined) changes.push(`${alerts ? "start" : "stop"} the email when conditions change between Mondays`);
  if (sub.pendingPlanLines) {
    changes.push(
      sub.pendingPlanLines.length === 0
        ? "clear the plan lines this address watches"
        : `email this address the day one of these lines is crossed${atRunwayClause(sub.pendingPlanRunway)}, replacing any it watched before: ${describePlanLines(sub.pendingPlanLines)}`,
    );
  }
  return changes;
};

/**
 * What the link in this inbox asks its reader to approve, said the same way in
 * the email and on the page the link opens. For an address that never confirmed,
 * the subscription; for one that did, the change, since it is the change the
 * reader is approving and a request can name anyone's address. Null when a
 * confirmed address asked for nothing it does not already have.
 */
export const describeConfirmation = (sub: Subscriber): { kind: "subscribe" | "change"; text: string } | null => {
  if (!sub.verified) {
    const after = withPendingApplied(sub);
    return { kind: "subscribe", text: describeSubscription({ ...after, pendingPlanLines: after.planLines }) };
  }
  const changes = describeChanges(sub);
  return changes.length > 0 ? { kind: "change", text: joinClauses(changes) } : null;
};

/** The sentence above the confirm button, in the email and on the page. */
export const confirmationLead = (confirmation: NonNullable<ReturnType<typeof describeConfirmation>>) =>
  confirmation.kind === "subscribe"
    ? `Confirm you want ${confirmation.text}.`
    : `Someone asked to ${confirmation.text}. Confirm only if that was you; otherwise ignore this and nothing changes.`;

const confirmationEmail = (sub: Subscriber, verifyUrl: string | null) => {
  const confirmation = describeConfirmation(sub);
  if (!confirmation || !verifyUrl) {
    const standing = describeSubscription({ ...sub, pendingPlanLines: sub.planLines });
    const note = `Someone asked to subscribe this address to Whether. It already gets ${standing}, so nothing has changed and there is nothing to confirm.`;
    return {
      subject: "Your Whether subscription",
      html: [
        "<!DOCTYPE html><html><body style='font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px;color:#121719;'>",
        `<p style='font-size:0.95rem;'>${escapeHtml(note)}</p>`,
        "</body></html>",
      ].join(""),
      text: note,
    };
  }
  const lead = confirmationLead(confirmation);
  const button = confirmation.kind === "subscribe" ? "Confirm subscription" : "Review and confirm";
  const expiry = "The link works for 7 days, and stops working if another request is made for this address.";
  return {
    subject: confirmation.kind === "subscribe" ? "Confirm your Whether subscription" : "Confirm a change to your Whether emails",
    html: [
      "<!DOCTYPE html><html><body style='font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px;color:#121719;'>",
      `<h1 style='font-size:1.1rem;font-weight:600;'>${confirmation.kind === "subscribe" ? "Confirm your subscription" : "Confirm a change"}</h1>`,
      `<p style='font-size:0.95rem;'>${escapeHtml(lead)}</p>`,
      `<a href='${escapeHtml(verifyUrl)}' style='display:inline-block;padding:10px 20px;border-radius:6px;background:#121719;color:#fff;text-decoration:none;font-weight:600;'>${button}</a>`,
      `<p style='font-size:0.8rem;color:#525c60;margin-top:20px;'>${expiry} If you didn't request this, ignore this email.</p>`,
      "</body></html>",
    ].join(""),
    text: `${lead}\n\n${button}: ${verifyUrl}\n\n${expiry}`,
  };
};

export const subscribeAndSendVerification = async ({
  email,
  alerts,
  weekly,
  planLines,
  runwayBand,
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
  /** The reader's runway band, held beside `planLines` and confirmed with them. */
  runwayBand?: RunwayBand;
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
  /* Past the address's allowance the request changes nothing and sends nothing:
     changing the record without a mail would retire the link in the reader's
     newest email. The caller cannot tell, because every route answers the same. */
  const now = new Date();
  const existing = await store.getSubscriberByEmail(email);
  if (existing && confirmationMailCapped(existing, now)) {
    return { subscriber: existing, verifyUrl: null };
  }

  const subscriber = await store.subscribe(email, { alerts, weekly, planLines, runwayBand });
  /* The request's own link, never the permanent token: that one is in the footer
     of every email this address has been sent. The caller's response is the same
     whichever email goes out, so it says nothing about whether the address is
     subscribed. */
  const verifyUrl = subscriber.confirmToken
    ? buildEmailActionUrl(`/api/email/verify?token=${encodeURIComponent(subscriber.confirmToken)}`, request)
    : null;

  const result = await adapter.send({ to: { email: subscriber.email }, ...confirmationEmail(subscriber, verifyUrl) });

  if (!result.ok) throw new Error(result.error);
  await store.recordConfirmationMail(subscriber.email, now);

  return { subscriber, verifyUrl };
};
