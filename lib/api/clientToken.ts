import { constantTimeCompare } from "../constantTimeCompare";
import { readSetting } from "../runtime/settings";

/**
 * Proof that a client id was issued by this server rather than chosen by the caller.
 *
 * The ledger's client id is minted in the browser (`crypto.randomUUID()` in
 * `app/components/clientIdentity.ts`) and never round-trips through the server,
 * so `POST /api/decision-memory` had no way to tell a real browser's id from one
 * typed into a curl. `requireClientOwner` compared the header against the body —
 * both supplied by the same caller — which authenticates nothing.
 *
 * A signed token closes that without an account, which matters: `/pricing`
 * promises "No signup, no key, no trackers", and a login would be a larger
 * change to the product than to the threat. The server signs an id it has seen;
 * presenting the signature proves the id came from here.
 *
 * **Absent secret means unverified, never trusted.** With no
 * `WHETHER_LEDGER_SECRET` configured nothing can be verified, so every write is
 * recorded as unverified rather than rejected — the endpoint keeps working and
 * the records stop claiming more than the server can show. That is the opposite
 * of a silent fallback: the degradation is written into the record itself, in
 * `actor.kind`, where a reader of the ledger sees it.
 */

export const CLIENT_TOKEN_HEADER = "x-whether-client-token";

const resolveSecret = (): string | null => {
  const secret = readSetting("WHETHER_LEDGER_SECRET", { trim: false });
  return secret && secret.length >= 16 ? secret : null;
};

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");

const sign = async (clientId: string, secret: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(clientId)));
};

/** Mint a token for an id. Returns null when this deployment cannot sign. */
export const issueClientToken = async (clientId: string): Promise<string | null> => {
  const secret = resolveSecret();
  if (!secret) return null;
  return sign(clientId, secret);
};

/**
 * Verify a presented token against the id it claims to cover.
 *
 * Constant-time, and false for every failure mode — no secret, no token, wrong
 * token — so a caller cannot tell an unconfigured deployment from a bad
 * signature by timing or by response.
 */
export const verifyClientToken = async (
  clientId: string,
  token: string | null | undefined,
): Promise<boolean> => {
  const secret = resolveSecret();
  if (!secret || !token) return false;
  return constantTimeCompare(await sign(clientId, secret), token);
};
