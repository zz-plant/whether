/**
 * VAPID: proving to a push service who is asking it to wake a browser.
 *
 * Web push has two cryptographic halves and this file is only the first.
 * VAPID (RFC 8292) is the signed assertion that identifies *us* to Mozilla's or
 * Google's push endpoint. RFC 8291 payload encryption is the other half, and
 * there is deliberately none of it here: the pushes this sends carry no body.
 *
 * That is a design decision, not a shortcut. A payload would have to hold a
 * reading, and a push sits in a queue — a phone that was off all evening would
 * light up with a regime that had already moved on, which is the published-
 * field-with-no-reading-behind-it failure in a form the reader cannot even
 * check. With no payload the service worker fetches the current call when the
 * notification is drawn, so what it says is true at the moment it is read.
 *
 * Configuration is an operator action, exactly like the brief freeze's
 * GITHUB_TOKEN: without the keys there is no offer to subscribe anywhere in the
 * UI, rather than a control that fails when pressed.
 */

export type VapidConfig = {
  /** The uncompressed P-256 point, base64url, as the browser is given it. */
  publicKey: string;
  privateKey: string;
  /** mailto: or https: identifying the sender, per RFC 8292 §2.1. */
  subject: string;
};

const base64UrlToBytes = (value: string): Uint8Array => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

const bytesToBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const encodeSegment = (value: unknown): string =>
  bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));

/**
 * The configured keys, or null when the operator has not set them.
 *
 * Null rather than a throw: "push is not configured" is a normal state that
 * every surface has to handle anyway, and it is the state of every developer
 * machine.
 */
export const resolveVapidConfig = (env: Record<string, string | undefined> = process.env): VapidConfig | null => {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  const subject = env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
};

/**
 * The signing key, rebuilt from the pair the operator set.
 *
 * A P-256 public key is `0x04 || x || y`, so the JWK the Web Crypto API wants
 * is assembled from the same two values rather than stored a second time —
 * one more encoding of the same key is one more thing that can disagree.
 */
const importSigningKey = async (config: VapidConfig): Promise<CryptoKey> => {
  const publicBytes = base64UrlToBytes(config.publicKey);
  if (publicBytes.length !== 65 || publicBytes[0] !== 0x04) {
    throw new Error("VAPID_PUBLIC_KEY is not an uncompressed P-256 point");
  }

  const privateBytes = base64UrlToBytes(config.privateKey);
  if (privateBytes.length !== 32) {
    throw new Error("VAPID_PRIVATE_KEY is not a 32-byte P-256 scalar");
  }

  return crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: bytesToBase64Url(publicBytes.slice(1, 33)),
      y: bytesToBase64Url(publicBytes.slice(33, 65)),
      d: bytesToBase64Url(privateBytes),
      ext: true,
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
};

/** Twelve hours. RFC 8292 caps the assertion at 24; half that survives clock skew either way. */
const TOKEN_LIFETIME_SECONDS = 12 * 60 * 60;

/**
 * The `Authorization` header for one push service origin.
 *
 * `aud` is the origin of the subscription endpoint and nothing else — a token
 * minted for one push service must not be replayable at another, which is the
 * whole point of the claim.
 */
export const buildVapidAuthorization = async (
  config: VapidConfig,
  endpoint: string,
  now: number = Date.now(),
): Promise<string> => {
  const audience = new URL(endpoint).origin;
  const header = encodeSegment({ typ: "JWT", alg: "ES256" });
  const payload = encodeSegment({
    aud: audience,
    exp: Math.floor(now / 1000) + TOKEN_LIFETIME_SECONDS,
    sub: config.subject,
  });

  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    await importSigningKey(config),
    new TextEncoder().encode(signingInput),
  );

  return `vapid t=${signingInput}.${bytesToBase64Url(new Uint8Array(signature))}, k=${config.publicKey}`;
};
