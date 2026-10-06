import { NextResponse } from "next/server";
import { constantTimeCompare } from "../constantTimeCompare";
import { hmacSha256, toHex } from "../crypto";
import { readSetting } from "../runtime/settings";

/**
 * Slack signs every request it sends to an app — interactive actions, slash
 * commands, events — with HMAC-SHA256 over `v0:{timestamp}:{rawBody}` keyed by the
 * app's signing secret, and sends the hex digest as `X-Slack-Signature: v0=…` next
 * to `X-Slack-Request-Timestamp`. https://api.slack.com/authentication/verifying-requests-from-slack
 *
 * Without this check the actions route acted on any POST shaped like a Slack
 * payload, and then fetched the payload's `response_url` — a URL the sender chose.
 * The signature covers the bytes on the wire, so a caller reads the body as text
 * before any form parsing and hands that text in unchanged.
 */

const SLACK_SIGNATURE_VERSION = "v0";

/** Slack's own guidance: refuse a timestamp more than five minutes from local time. */
export const SLACK_SIGNATURE_TOLERANCE_SECONDS = 300;

const computeSlackSignature = async ({
  secret,
  timestamp,
  rawBody,
}: {
  secret: string;
  timestamp: string;
  rawBody: string;
}): Promise<string> => {
  const baseString = `${SLACK_SIGNATURE_VERSION}:${timestamp}:${rawBody}`;
  return `${SLACK_SIGNATURE_VERSION}=${toHex(await hmacSha256(secret, baseString))}`;
};

type SlackSignatureVerdict =
  | { ok: true }
  | { ok: false; error: "missing_signature" | "stale_timestamp" | "invalid_signature" };

export const verifySlackSignature = async ({
  rawBody,
  timestampHeader,
  signatureHeader,
  secret,
  nowSeconds = Math.floor(Date.now() / 1000),
}: {
  rawBody: string;
  timestampHeader: string | null;
  signatureHeader: string | null;
  secret: string;
  nowSeconds?: number;
}): Promise<SlackSignatureVerdict> => {
  if (!timestampHeader || !signatureHeader) {
    return { ok: false, error: "missing_signature" };
  }

  /* Slack sends an integer unix time. Anything else cannot be placed on the
     clock, and cannot have been signed by Slack either. */
  if (!/^\d+$/.test(timestampHeader)) {
    return { ok: false, error: "invalid_signature" };
  }

  /* Absolute distance: a replayed capture arrives late, a skewed sender early,
     and neither should be trusted. */
  const timestamp = Number.parseInt(timestampHeader, 10);
  if (Math.abs(nowSeconds - timestamp) > SLACK_SIGNATURE_TOLERANCE_SECONDS) {
    return { ok: false, error: "stale_timestamp" };
  }

  /* The header goes into the base string verbatim, not re-serialized from the
     parsed number, so "0123" signs as "0123". */
  const expected = await computeSlackSignature({ secret, timestamp: timestampHeader, rawBody });
  return constantTimeCompare(signatureHeader, expected)
    ? { ok: true }
    : { ok: false, error: "invalid_signature" };
};

/**
 * Route gate, shaped like `requireCronAuth`: the response to send when the
 * request is not Slack's, or null to proceed.
 *
 * An absent secret means two different things by lane. In production it is a
 * misconfigured deploy, and the route answers 503 so it fails loudly rather than
 * accepting unsigned actions. Outside production — `bun run dev`, the suite — the
 * check is skipped so the route can be exercised without a Slack app, the same
 * allowance `lib/email/emailDelivery.ts` makes for its stub. The Worker build
 * folds `NODE_ENV` to "production", so a deployed lane never takes the skip.
 */
export const requireSlackSignature = async (
  request: Request,
  rawBody: string,
): Promise<NextResponse | null> => {
  /* Untrimmed: the secret is an HMAC key, used byte for byte. */
  const secret = readSetting("SLACK_SIGNING_SECRET", { trim: false });

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { ok: false, error: "slack_signing_secret_not_configured" },
        { status: 503 },
      );
    }
    return null;
  }

  const verdict = await verifySlackSignature({
    rawBody,
    timestampHeader: request.headers.get("x-slack-request-timestamp"),
    signatureHeader: request.headers.get("x-slack-signature"),
    secret,
  });

  if (!verdict.ok) {
    return NextResponse.json({ ok: false, error: verdict.error }, { status: 401 });
  }

  return null;
};
