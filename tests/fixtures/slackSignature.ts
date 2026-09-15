import { createHmac } from "node:crypto";

/**
 * The headers Slack would send for `body`, signed with `secret`.
 *
 * Computed with node:crypto rather than the WebCrypto path in
 * `lib/api/slackSignature.ts`, so the test checks the implementation against an
 * independent one instead of against itself.
 */
export const slackSignatureHeaders = (
  body: string,
  secret: string,
  timestamp: string = String(Math.floor(Date.now() / 1000)),
): Record<string, string> => ({
  "x-slack-request-timestamp": timestamp,
  "x-slack-signature": `v0=${createHmac("sha256", secret).update(`v0:${timestamp}:${body}`).digest("hex")}`,
});
