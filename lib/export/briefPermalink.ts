/**
 * The return path on a shared artifact.
 *
 * This product is built to be pasted into a Slack channel, and that channel is
 * full of the same operators it is for. Until now a pasted brief carried its
 * citations but no way back: the recipient could see where the *data* came from
 * and not where the *brief* came from, so the most common act of distribution
 * ended at the paste.
 *
 * Deliberately a bare URL with no campaign or per-share parameters. The product
 * advertises "no signup, no trackers", and decorating shared links with
 * attribution codes would trade that claim for a marginally better funnel
 * report. Distribution is instead readable from hits on the permalink path
 * itself, which needs nothing attached to the link.
 */
import { buildCanonicalUrl } from "../seo";
import { buildPublishedBriefPath, selectCitablePermalinkBrief } from "../report/publishedBriefs";

/**
 * The most specific stable URL for a given week: the frozen copy when the
 * archive is current, otherwise the live brief.
 *
 * Never the live URL *labelled* as a given week — `/` changes under one URL
 * every week, so pointing a dated citation at it would make the citation wrong
 * the following Monday.
 */
export const buildBriefPermalinkUrl = (recordDate: string) => {
  const frozen = selectCitablePermalinkBrief(recordDate);

  return frozen ? buildCanonicalUrl(buildPublishedBriefPath(frozen.slug)) : buildCanonicalUrl("/");
};

export const buildBriefPermalinkLine = (recordDate: string) =>
  `Full brief: ${buildBriefPermalinkUrl(recordDate)}`;
