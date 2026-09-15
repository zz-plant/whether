/**
 * The activation funnel, and the definition of activation itself.
 *
 * Two telemetry systems already exist — `premiumFunnel.ts` for upgrade intent and
 * `operatorWorkflowTelemetry.ts` for route and panel usage — and neither answers
 * whether the product *works*. For a weekly-ritual product there is exactly one
 * answer to that, and it is not pageviews, HN traffic, or copy clicks: it is
 * whether the same browser came back the following week. A visitor who reads one
 * brief and never returns did not adopt a weekly ritual; they read an article.
 *
 * The steps, in order:
 *
 *   visited    — a brief was rendered for someone
 *   oriented   — they got far enough to dismiss the first-run explainer or open
 *                the signal breakdown, i.e. they understood what they were looking at
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

const ACTIVATION_TELEMETRY_ENDPOINT = "/api/telemetry/activation";

/** Holds an ISO week slug, e.g. "2026-w31". Never an identifier. */
export const activationLastWeekStorageKey = "whether.activation.lastWeek";

/** What the visitor did to reach `committed`. */
export type ActivationCommitment =
  | "copied_slack"
  | "copied_email"
  | "copied_meeting"
  | "copied_brief"
  | "subscribed";

/**
 * Bucketed rather than exact so the value cannot narrow a browser down to one
 * person: "next_week" is the ritual working, "lapsed" is a reader who drifted.
 */
type ActivationReturnGap = "same_week" | "next_week" | "within_month" | "lapsed";

type ActivationEvent =
  | { step: "visited" | "oriented"; path: string }
  | { step: "committed"; path: string; commitment: ActivationCommitment }
  | { step: "returned"; path: string; gap: ActivationReturnGap };

const COMMITMENTS: ActivationCommitment[] = [
  "copied_slack",
  "copied_email",
  "copied_meeting",
  "copied_brief",
  "subscribed",
];

const RETURN_GAPS: ActivationReturnGap[] = ["same_week", "next_week", "within_month", "lapsed"];

export const isActivationEvent = (input: unknown): input is ActivationEvent => {
  if (!input || typeof input !== "object") {
    return false;
  }

  const payload = input as Record<string, unknown>;

  if (typeof payload.path !== "string" || payload.path.length === 0) {
    return false;
  }

  if (payload.step === "visited" || payload.step === "oriented") {
    return true;
  }

  if (payload.step === "committed") {
    return COMMITMENTS.includes(payload.commitment as ActivationCommitment);
  }

  if (payload.step === "returned") {
    return RETURN_GAPS.includes(payload.gap as ActivationReturnGap);
  }

  return false;
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
  const body = JSON.stringify(event);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const beaconBody = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon(ACTIVATION_TELEMETRY_ENDPOINT, beaconBody)) {
      return;
    }
  }

  void fetch(ACTIVATION_TELEMETRY_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
    priority: "low",
  }).catch(() => {
    // Telemetry must never surface in the console of a product that claims to be quiet.
  });
};
