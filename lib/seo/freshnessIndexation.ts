import { CALL_FRESHNESS_WINDOW_HOURS, DEFAULT_FRESHNESS_WINDOW_HOURS } from "../report/seoQualityGates";
import type { SeoDecisionPayload } from "../report/seoDecisionPayload";

/**
 * One rule for "is this live-posture page fresh enough to be indexed".
 *
 * Three surfaces each wrote their own version: the scenario page and the
 * sitemap held byte-identical copies of a payload predicate, and the signal
 * watch pages flipped on `treasury.isLive` alone, which has no notion of age.
 * The window is the same 72 hours the payload freshness gate uses, so a page
 * is withheld when its data is older than that, or when it is the bundled
 * snapshot (whose stamp is older still), and not before. A reading a few hours
 * past its refresh is still this week's reading.
 */
export const INDEXATION_FRESHNESS_WINDOW_HOURS = DEFAULT_FRESHNESS_WINDOW_HOURS;

export const isStaleForIndexing = ({
  fetchedAtIso,
  isFallbackSnapshot = false,
  now = new Date(),
  windowHours = INDEXATION_FRESHNESS_WINDOW_HOURS,
}: {
  /** When the data behind the page was last read. */
  fetchedAtIso: string | null | undefined;
  /** The bundled snapshot rather than a live or materialized read. */
  isFallbackSnapshot?: boolean;
  now?: Date;
  windowHours?: number;
}): boolean => {
  if (isFallbackSnapshot) return true;
  const fetchedAtMs = fetchedAtIso ? new Date(fetchedAtIso).getTime() : Number.NaN;
  if (Number.isNaN(fetchedAtMs)) return true;
  const ageHours = (now.getTime() - fetchedAtMs) / (1000 * 60 * 60);
  return ageHours > windowHours;
};

/**
 * Whether a live-posture page is too stale on the week's call to be indexed.
 *
 * Separate from `isStaleForIndexing` on purpose. That one reads the *reading's*
 * age and is right for a cached card that must not show a stale figure; this one
 * reads the *call's* record date and is right for indexing. Judging both on the
 * 72-hour read window made one missed daily ingest de-index the whole corpus,
 * while the call it served was still this week's.
 */
export const isCallStaleForIndexing = ({
  recordDateIso,
  isFallbackSnapshot = false,
  now = new Date(),
  windowHours = CALL_FRESHNESS_WINDOW_HOURS,
}: {
  /** The record date the week's call was struck on. */
  recordDateIso: string | null | undefined;
  /** The bundled snapshot rather than a live or materialized read. */
  isFallbackSnapshot?: boolean;
  now?: Date;
  windowHours?: number;
}): boolean => {
  if (isFallbackSnapshot) return true;
  const recordMs = recordDateIso ? new Date(recordDateIso).getTime() : Number.NaN;
  if (Number.isNaN(recordMs)) return true;
  const ageHours = (now.getTime() - recordMs) / (1000 * 60 * 60);
  return ageHours > windowHours;
};

/**
 * Whether a programmatic payload's page should carry `noindex`.
 *
 * A missing payload, a payload that asked for it, a degraded one, and one whose
 * reasons name freshness or provenance all withhold the page. Other gate
 * reasons (a thin section, a duplicate sibling) already set `noindex` on the
 * payload itself, so this reads them through that flag.
 */
export const shouldNoindexPayload = (
  payload?: Pick<SeoDecisionPayload, "degraded" | "noindex" | "noindexReasons">,
): boolean => {
  if (!payload) return true;
  if (payload.noindex || payload.degraded) return true;
  return (payload.noindexReasons ?? []).some((reason) => reason.startsWith("freshness-") || reason.includes("provenance"));
};
