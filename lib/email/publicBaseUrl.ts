import { siteUrl } from "../siteUrl";

/**
 * The origin an email's links should carry.
 *
 * `siteUrl` is the production origin, and it is the right answer for a cron send
 * that has no request behind it. It is the wrong answer for a send a request
 * triggered: a preview deployment keeps its own subscribers in its own KV, so a
 * whether.work link cannot find them, and the reader lands on "Link not
 * recognised" instead of the page the mail promised.
 *
 * Confirmation links have resolved their origin this way since 2026-10-02. The
 * footer's unsubscribe link did not, which is how a preview email could carry a
 * working confirm link and a dead unsubscribe link in the same message
 * (found 2026-10-30 by the email e2e).
 */

const normalizeBaseUrl = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
};

const siteHost = new URL(siteUrl).hostname;

const isDeveloperMachine = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";

/* Hosts a link may point at: the site, this worker on workers.dev (production,
   or a preview version's "<id>-whether.<account>.workers.dev"), and a
   developer's machine. */
const isTrustedLinkHost = (hostname: string) =>
  hostname === siteHost
  || hostname === `www.${siteHost}`
  || /^(?:[a-z0-9-]+-)?whether\.[a-z0-9-]+\.workers\.dev$/.test(hostname)
  || isDeveloperMachine(hostname);

/**
 * Where a link in an email points. A configured base wins; otherwise the host the
 * request came in on, but only one of ours. A forged Host header must not be able
 * to mail a reader a link to someone else's site.
 *
 * Every public host of ours answers on https, and a link to one is written https
 * whichever scheme the request used. The request's own origin was taken as given
 * until 2026-11-12, so a send triggered over plain http put an http link in
 * `List-Unsubscribe`, which Cloudflare refuses along with the whole message
 * (`unsubscribeHeaders` in `lib/email/emailShell.ts`): every recipient's send failed.
 */
export const resolveEmailBaseUrl = (request?: Request): string => {
  const configured = normalizeBaseUrl(process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL);
  if (configured) return configured;

  if (request) {
    const url = new URL(request.url);
    if (isDeveloperMachine(url.hostname)) return url.origin;
    if (isTrustedLinkHost(url.hostname)) return `https://${url.host}`;
  }

  return siteUrl;
};

export const buildEmailActionUrl = (path: string, request?: Request): string =>
  new URL(path, resolveEmailBaseUrl(request)).toString();
