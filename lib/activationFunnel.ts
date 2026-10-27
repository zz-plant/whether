/**
 * The activation funnel, and the definition of activation itself.
 *
 * `operatorWorkflowTelemetry.ts` already measures route and panel usage, and it
 * does not answer whether the product *works*. For a weekly-ritual product there is exactly one
 * answer to that, and it is not pageviews, HN traffic, or copy clicks: it is
 * whether the same browser came back the following week. A visitor who reads one
 * brief and never returns did not adopt a weekly ritual; they read an article.
 *
 * The steps, in order:
 *
 *   visited    — a brief was rendered for someone
 *   oriented   — they did one deliberate thing on the page: pressed a control,
 *                opened a section or followed a link (`ActivationTracker`). At most
 *                once per `visited`, so `visited` minus `oriented` is the visits that
 *                touched nothing. Until 2026-09-30 only the first-visit picker and the
 *                explainer's Dismiss sent it, and a returning browser sees neither
 *   committed  — they copied an artifact or subscribed; the first act with intent
 *   returned   — they came back in a later ISO week
 *
 * `returned` is the north star. Everything above it is diagnostic: it says which
 * step is leaking, not whether the product succeeded.
 *
 * Identity: none. Return detection reads a single localStorage key holding an ISO
 * week slug and reports a bucketed gap. There is no id, no cookie, no cross-site
 * anything, and nothing that can be joined back to a person — the product
 * advertises no trackers, and this measurement is built to keep that true rather
 * than to be maximally informative.
 */
import { formatIsoWeekSlug, getIsoWeekInfo } from "./isoWeek";
import { sendTelemetry } from "./telemetry/sendTelemetry";

const ACTIVATION_TELEMETRY_ENDPOINT = "/api/telemetry/activation";

/** Holds an ISO week slug, e.g. "2026-w31". Never an identifier. */
export const activationLastWeekStorageKey = "whether.activation.lastWeek";

/** What the visitor did to reach `committed`. */
export type ActivationCommitment =
  | "copied_slack"
  | "copied_email"
  | "copied_meeting"
  | "copied_brief"
  | "copied_social"
  | "subscribed";

/**
 * Bucketed rather than exact so the value cannot narrow a browser down to one
 * person: "next_week" is the ritual working, "lapsed" is a reader who drifted.
 */
type ActivationReturnGap = "same_week" | "next_week" | "within_month" | "lapsed";

/**
 * Where a visit arrived from, as one of seven words. Never the referring URL,
 * its path, or a query string: the hostname is read in the browser, matched
 * against the lists below, and discarded. `/privacy` 2.5 promises exactly this
 * bucket, and for a while it promised it with nothing behind it.
 */
type ActivationArrival = "direct" | "search" | "social" | "chat" | "shared-link" | "internal" | "other";

type ActivationEvent =
  | { step: "visited"; path: string; arrival?: ActivationArrival; firstVisit?: boolean }
  | { step: "oriented"; path: string }
  | { step: "committed"; path: string; commitment: ActivationCommitment }
  | { step: "returned"; path: string; gap: ActivationReturnGap };

const COMMITMENTS: ActivationCommitment[] = [
  "copied_slack",
  "copied_email",
  "copied_meeting",
  "copied_brief",
  "copied_social",
  "subscribed",
];

const RETURN_GAPS: ActivationReturnGap[] = ["same_week", "next_week", "within_month", "lapsed"];

const ARRIVALS: ActivationArrival[] = ["direct", "search", "social", "chat", "shared-link", "internal", "other"];

/* Matched on the hostname's registrable tail, so `www.google.co.uk` and
   `l.facebook.com` land where a reader would expect. */
const SEARCH_HOSTS = ["google.", "bing.com", "duckduckgo.com", "search.yahoo.com", "ecosia.org", "search.brave.com", "kagi.com", "perplexity.ai", "chatgpt.com", "claude.ai"];
const SOCIAL_HOSTS = ["t.co", "x.com", "twitter.com", "linkedin.com", "lnkd.in", "news.ycombinator.com", "reddit.com", "facebook.com", "threads.net", "bsky.app", "substack.com"];
const CHAT_HOSTS = ["slack.com", "teams.microsoft.com", "teams.live.com", "discord.com", "discordapp.com", "mail.google.com", "outlook.live.com", "outlook.office.com"];

const hostMatches = (host: string, candidates: readonly string[]) =>
  candidates.some((candidate) =>
    candidate.endsWith(".") ? host.includes(candidate) : host === candidate || host.endsWith(`.${candidate}`));

/**
 * Buckets an arrival. Pure, so the rule is testable without a browser: the
 * caller hands in `document.referrer`, the site's own host, and whether the
 * link carried the share tag the copy formats print (`?ref=share`), which wins
 * because a pasted brief opened from a desktop Slack client arrives with no
 * referrer at all.
 */
export const classifyArrival = ({
  referrer,
  siteHost,
  sharedLink,
}: {
  referrer: string;
  siteHost: string;
  sharedLink: boolean;
}): ActivationArrival => {
  if (sharedLink) return "shared-link";
  if (!referrer) return "direct";
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return "other";
  }
  if (host === siteHost.toLowerCase()) return "internal";
  if (hostMatches(host, SEARCH_HOSTS)) return "search";
  if (hostMatches(host, SOCIAL_HOSTS)) return "social";
  if (hostMatches(host, CHAT_HOSTS)) return "chat";
  return "other";
};

/* The fields each step may carry, and nothing else. The intake's promise on
   `/privacy` is that a record with an unexpected field is refused, and this
   validator used to accept any extra key a caller sent. */
const ALLOWED_KEYS: Record<ActivationEvent["step"], readonly string[]> = {
  visited: ["step", "path", "arrival", "firstVisit"],
  oriented: ["step", "path"],
  committed: ["step", "path", "commitment"],
  returned: ["step", "path", "gap"],
};

const isStep = (value: unknown): value is ActivationEvent["step"] =>
  value === "visited" || value === "oriented" || value === "committed" || value === "returned";

export const isActivationEvent = (input: unknown): input is ActivationEvent => {
  if (!input || typeof input !== "object") {
    return false;
  }

  const step: unknown = Reflect.get(input, "step");
  const path: unknown = Reflect.get(input, "path");

  if (!isStep(step) || typeof path !== "string" || path.length === 0) {
    return false;
  }

  if (Object.keys(input).some((key) => !ALLOWED_KEYS[step].includes(key))) {
    return false;
  }

  if (step === "visited") {
    const arrival: unknown = Reflect.get(input, "arrival");
    const firstVisit: unknown = Reflect.get(input, "firstVisit");
    return (arrival === undefined || ARRIVALS.some((bucket) => bucket === arrival))
      && (firstVisit === undefined || typeof firstVisit === "boolean");
  }

  if (step === "committed") {
    const commitment: unknown = Reflect.get(input, "commitment");
    return COMMITMENTS.some((candidate) => candidate === commitment);
  }

  if (step === "returned") {
    const gap: unknown = Reflect.get(input, "gap");
    return RETURN_GAPS.some((candidate) => candidate === gap);
  }

  return true;
};

/** ISO weeks between two week slugs, or null when either is unreadable. */
export const weeksBetweenSlugs = (fromSlug: string, toSlug: string) => {
  const from = /^(\d{4})-w(\d{2})$/.exec(fromSlug);
  const to = /^(\d{4})-w(\d{2})$/.exec(toSlug);

  if (!from || !to) {
    return null;
  }

  const fromWeeks = Number(from[1]) * 52 + Number(from[2]);
  const toWeeks = Number(to[1]) * 52 + Number(to[2]);

  return toWeeks - fromWeeks;
};

export const classifyReturnGap = (weeks: number): ActivationReturnGap => {
  if (weeks <= 0) return "same_week";
  if (weeks === 1) return "next_week";
  if (weeks <= 4) return "within_month";
  return "lapsed";
};

export const currentWeekSlug = (now: Date) => formatIsoWeekSlug(getIsoWeekInfo(now));

/**
 * Reads the stored week, decides whether this counts as a return, and returns
 * the week to store next. Pure so the rule is testable without a browser — the
 * caller owns storage and the clock.
 */
export const resolveReturnVisit = (storedSlug: string | null, now: Date) => {
  const thisWeek = currentWeekSlug(now);

  if (!storedSlug || storedSlug === thisWeek) {
    return { gap: null, nextStoredSlug: thisWeek };
  }

  const weeks = weeksBetweenSlugs(storedSlug, thisWeek);

  if (weeks === null || weeks <= 0) {
    return { gap: null, nextStoredSlug: thisWeek };
  }

  return { gap: classifyReturnGap(weeks), nextStoredSlug: thisWeek };
};

export const trackActivationEvent = (event: ActivationEvent) => {
  sendTelemetry(ACTIVATION_TELEMETRY_ENDPOINT, event);
};
