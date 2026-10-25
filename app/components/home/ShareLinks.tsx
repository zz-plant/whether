import { ActionLink } from "../ui/actionLink";
import { ShareOrEmbedLink } from "../shareOrEmbedLink";
import { buildPublishedBriefPath, publishedBriefWeekLabel, selectCitablePermalinkBrief } from "../../../lib/report/publishedBriefs";

/**
 * The page's last line (2026-10-09): the link to /share, which holds every
 * format, the slide and image copies among them (2026-10-08), and the week's
 * published brief, the copy that can be cited. Copy Brief, DD-005's canonical
 * primary action, sits under the call card in `app/page.tsx`.
 *
 * It was a "Share" section: a heading over one link, then "The reading above is
 * from Oct 7, 2026. The last frozen record is dated Oct 6, 2026. Read the Oct 6,
 * 2026 record →", a third and fourth date on a page whose card already carries
 * the week and the reading's date. The record is named by its week now, as its
 * own page and every share name it, which also says which reading it holds: the
 * week the record froze, not the live reading above. A record that falls behind
 * names its own, earlier week.
 *
 * The published brief is gated on how far the archive has fallen behind
 * (`selectCitablePermalinkBrief`). When the freeze job stops running, a link to
 * the last week it wrote would stamp an old week onto the one screen whose claim
 * is that it is current; rendering no link is the safer failure.
 */
export function ShareLinks({ currentRecordDate }: { currentRecordDate: string }) {
  const brief = selectCitablePermalinkBrief(currentRecordDate);
  return (
    <p
      className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[color:var(--border-subtle)] pt-4 text-fluid-xs"
      data-share-links
    >
      <ShareOrEmbedLink />
      {brief ? (
        <ActionLink href={buildPublishedBriefPath(brief.slug)} variant="inline" data-published-brief-link>
          {`Published brief for the week of ${publishedBriefWeekLabel(brief)} →`}
        </ActionLink>
      ) : null}
    </p>
  );
}
