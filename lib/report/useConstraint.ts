import { siteUrl } from "../siteUrl";

/**
 * What this output is, stated on the surfaces that leave the site.
 *
 * The Acceptable Use Policy forbids two things the product's own shape invites:
 * presenting outputs as authoritative or binding on third parties (§3.4), and
 * using them as the sole or determinative basis for decisions affecting
 * individuals — hiring, termination, compensation, promotion — without human
 * review (§3.2).
 *
 * Both prohibitions lived only in a legal page a reader had to go and find,
 * while the surfaces most likely to violate them carried nothing at all:
 * `/api/agent`, `/api/mcp`, the agent manifest and `/brief.md` had no
 * disclaimer, no policy link and no mention of human review, and their payloads
 * say things like "Limit hiring to backfills" against a decision area literally
 * named `hiring`. The one surface built for an agent to call with no person
 * present was the one that never said a person was required.
 *
 * This does not stop a determined misuse and is not meant to. It removes the
 * innocent case — someone wiring up an agent who never read the policy — which
 * is the common one, and it puts the constraint where the decision is actually
 * made rather than three clicks away.
 */
const ACCEPTABLE_USE_PATH = "/acceptable-use-policy";

const acceptableUseUrl = () => `${siteUrl}${ACCEPTABLE_USE_PATH}`;

/** One line, for a payload field or a footer. */
export const USE_CONSTRAINT_SUMMARY =
  "Informational only. Not investment, legal, tax or employment advice, and not a forecast.";

/**
 * The §3.2 sentence, for machine surfaces.
 *
 * Kept separate from the summary because it is the one an automated consumer
 * has to act on: the others describe what the output is, this one describes
 * what the caller may not do with it.
 */
const HUMAN_REVIEW_REQUIREMENT =
  "Not for use as the sole or determinative basis for decisions affecting individuals "
  + "(hiring, termination, compensation, promotion). Human review is required.";

/** The block every machine-readable surface embeds. */
export const buildUseConstraint = () => ({
  summary: USE_CONSTRAINT_SUMMARY,
  humanReview: HUMAN_REVIEW_REQUIREMENT,
  policy: acceptableUseUrl(),
});

/** The same thing as Markdown, for `/brief.md` and `llms.txt`-style documents. */
export const renderUseConstraintMarkdown = (): string =>
  [
    `> ${USE_CONSTRAINT_SUMMARY}`,
    `> ${HUMAN_REVIEW_REQUIREMENT}`,
    `> Acceptable use: ${acceptableUseUrl()}`,
  ].join("\n");
