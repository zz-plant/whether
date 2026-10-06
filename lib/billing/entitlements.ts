import { z } from "zod";
import { getWhetherKv, parseStoredJson } from "../runtime/kv";
import type { PremiumPlan } from "../billingStripe";

/**
 * Entitlement persistence and proof.
 *
 * Until this module existed, the Stripe checkout had nothing behind it: the
 * webhook verified signatures and forwarded telemetry, no subscription state
 * was stored anywhere, and no surface ever read one. A completed payment
 * changed nothing for the buyer.
 *
 * The rail: the webhook persists an EntitlementRecord on
 * checkout.session.completed (and cancels it on customer.subscription.deleted);
 * POST /api/billing/confirm exchanges the checkout session id from the success
 * redirect for a signed token; gated surfaces verify that token via
 * POST /api/billing/status. Tokens are HMAC-SHA256 (WebCrypto, edge-safe)
 * under WHETHER_ENTITLEMENT_SECRET — when that secret is unset, issuing and
 * verifying both refuse loudly rather than minting unverifiable proofs.
 */

/* The optional fields come straight off the Stripe event, which sends null for an absent
   customer or email, so a stored record can carry null where nothing was known. */
type EntitlementRecord = {
  plan: PremiumPlan;
  sessionId: string;
  customerEmail?: string | null;
  stripeCustomerId?: string | null;
  seatBand?: string | null;
  status: "active" | "cancelled";
  activatedAt: string;
  cancelledAt?: string;
};

/* Loose, so a field a later deploy adds survives being read and written back by a cancel. */
const entitlementRecordSchema: z.ZodType<EntitlementRecord> = z.object({
  plan: z.enum(["pro", "team"]),
  sessionId: z.string(),
  customerEmail: z.string().nullish(),
  stripeCustomerId: z.string().nullish(),
  seatBand: z.string().nullish(),
  status: z.enum(["active", "cancelled"]),
  activatedAt: z.string(),
  cancelledAt: z.string().optional(),
}).loose();

const sessionKey = (sessionId: string) => `billing:entitlement:session:${sessionId}`;
const emailKey = (email: string) => `billing:entitlement:email:${email.trim().toLowerCase()}`;
const customerKey = (customerId: string) => `billing:entitlement:customer:${customerId}`;

const recordKeys = (record: EntitlementRecord): string[] => [
  sessionKey(record.sessionId),
  ...(record.customerEmail ? [emailKey(record.customerEmail)] : []),
  ...(record.stripeCustomerId ? [customerKey(record.stripeCustomerId)] : []),
];

/* KV when the binding exists, module-local map otherwise (tests, local dev) —
   the same fallback shape subscriberStore uses. */
const memoryStore = new Map<string, string>();

const readKey = async (key: string): Promise<EntitlementRecord | null> => {
  const kv = getWhetherKv();
  const raw = kv ? await kv.get(key) : memoryStore.get(key) ?? null;
  return parseStoredJson(raw, entitlementRecordSchema);
};

const writeRecord = async (record: EntitlementRecord): Promise<void> => {
  const kv = getWhetherKv();
  const raw = JSON.stringify(record);
  for (const key of recordKeys(record)) {
    if (kv) await kv.put(key, raw);
    else memoryStore.set(key, raw);
  }
};

export const saveEntitlement = async (record: EntitlementRecord): Promise<void> => {
  await writeRecord(record);
};

export const getEntitlementBySessionId = (sessionId: string) => readKey(sessionKey(sessionId));
export const getEntitlementByEmail = (email: string) => readKey(emailKey(email));
export const getEntitlementByCustomerId = (customerId: string) => readKey(customerKey(customerId));

export const cancelEntitlementByCustomerId = async (customerId: string): Promise<boolean> => {
  const record = await getEntitlementByCustomerId(customerId);
  if (!record) return false;
  await writeRecord({ ...record, status: "cancelled", cancelledAt: new Date().toISOString() });
  return true;
};

/** Test-only: clears the in-memory fallback. */
export const resetEntitlementMemoryStore = (): void => {
  memoryStore.clear();
};

/* ---------------------------------------------------------------- tokens --- */

type EntitlementTokenPayload = {
  plan: PremiumPlan;
  sessionId: string;
  email?: string;
  iat: number;
  exp: number;
};

type EntitlementTokenVerification =
  | { ok: true; payload: EntitlementTokenPayload }
  | { ok: false; reason: "unconfigured" | "malformed" | "bad_signature" | "expired" };

const TOKEN_TTL_MS = 35 * 24 * 60 * 60 * 1000; // outlives one monthly renewal cycle

const encoder = new TextEncoder();

const toBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");

const fromBase64Url = (value: string): Uint8Array | null => {
  try {
    const padded = value.replaceAll("-", "+").replaceAll("_", "/");
    const raw = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    return Uint8Array.from(raw, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
};

const getSigningSecret = (): string | null => {
  const secret = process.env.WHETHER_ENTITLEMENT_SECRET;
  return typeof secret === "string" && secret.trim().length > 0 ? secret.trim() : null;
};

const hmac = async (secret: string, message: string): Promise<Uint8Array> => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
};

const constantTimeBytesEqual = (left: Uint8Array, right: Uint8Array): boolean => {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) mismatch |= left[i] ^ right[i];
  return mismatch === 0;
};

export const issueEntitlementToken = async (
  record: Pick<EntitlementRecord, "plan" | "sessionId" | "customerEmail">,
  now = Date.now(),
): Promise<string | null> => {
  const secret = getSigningSecret();
  if (!secret) return null;

  const payload: EntitlementTokenPayload = {
    plan: record.plan,
    sessionId: record.sessionId,
    ...(record.customerEmail ? { email: record.customerEmail.trim().toLowerCase() } : {}),
    iat: now,
    exp: now + TOKEN_TTL_MS,
  };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = toBase64Url(await hmac(secret, body));
  return `${body}.${signature}`;
};

export const verifyEntitlementToken = async (
  token: string,
  now = Date.now(),
): Promise<EntitlementTokenVerification> => {
  const secret = getSigningSecret();
  if (!secret) return { ok: false, reason: "unconfigured" };

  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [body, signature] = parts;

  const providedSignature = fromBase64Url(signature);
  const payloadBytes = fromBase64Url(body);
  if (!providedSignature || !payloadBytes) return { ok: false, reason: "malformed" };

  const expectedSignature = await hmac(secret, body);
  if (!constantTimeBytesEqual(providedSignature, expectedSignature)) {
    return { ok: false, reason: "bad_signature" };
  }

  let payload: EntitlementTokenPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as EntitlementTokenPayload;
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (typeof payload.exp !== "number" || payload.exp <= now) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, payload };
};
