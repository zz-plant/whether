/**
 * The WebCrypto steps the signing code shares. Slack signatures and ledger client tokens each
 * imported an HMAC key and hex-encoded a digest by hand; the comparison half is
 * `constantTimeCompare`.
 */
const encoder = new TextEncoder();

/** Lowercase hex, two digits a byte. */
export const toHex = (bytes: ArrayBuffer | Uint8Array): string =>
  Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");

/** HMAC-SHA256 of `message` keyed by `secret`, both UTF-8. */
export const hmacSha256 = async (secret: string, message: string): Promise<Uint8Array> => {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
};

/** SHA-256 of UTF-8 `text`, as hex. */
export const sha256Hex = async (text: string): Promise<string> =>
  toHex(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
