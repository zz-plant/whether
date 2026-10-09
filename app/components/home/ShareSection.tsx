import { HomeSection } from "./HomeSection";
import { ActionLink } from "../ui/actionLink";
import { CopyMeetingSlideButton } from "../CopyMeetingSlideButton";
import { CopyImageCardButton } from "../CopyImageCardButton";
import { HOME_SECTIONS } from "../../../lib/report/home/homeSectionModel";
import { buildPublishedBriefPath, selectCitablePermalinkBrief } from "../../../lib/report/publishedBriefs";

/**
 * This view changes every week under one URL, so it cannot be cited or indexed as
 * a dated article. Point at the frozen copy of the week instead.
 *
 * Gated on how far the archive has fallen behind. When the freeze job stops
 * running this module keeps rendering the last week it managed to write, which
 * stamps an old date onto the one screen whose entire claim is that it is
 * current — the module then argues against the page it sits on. Rendering
 * nothing is the safer failure.
 */
function CanonicalWeekPermalink({
  currentRecordDate,
  currentRecordDateLabel,
}: {
  currentRecordDate: string;
  currentRecordDateLabel: string;
}) {
  const brief = selectCitablePermalinkBrief(currentRecordDate);
  if (!brief) return null;

  /* The record is frozen on Monday and the reading above keeps updating, so
     most days they are different readings. "Citable permalink" under a page
     dated Oct 2 sent a reader to the Sep 29 record as if it were this page.
     It says which reading the record holds when it is not this one. */
  if (brief.recordDate !== currentRecordDate) {
    return (
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-fluid-xs text-slate-300">
        <span>
          The reading above is from <span className="font-medium text-white">{currentRecordDateLabel}</span>. The last
          frozen record is dated <span className="font-medium text-white">{brief.recordDateLabel}</span>.
        </span>
        <ActionLink href={buildPublishedBriefPath(brief.slug)} variant="inline">
          Read the {brief.recordDateLabel} record →
        </ActionLink>
      </p>
    );
  }

  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-fluid-xs text-slate-300">
      <span>
        Published as a permanent record dated <span className="font-medium text-white">{brief.recordDateLabel}</span>.
      </span>
      <ActionLink href={buildPublishedBriefPath(brief.slug)} variant="inline">
        Citable permalink →
      </ActionLink>
    </p>
  );
}

/**
 * Share, last on the page (2026-10-09): the slide and image copies and the
 * citable permalink. Copy Brief, DD-005's canonical primary action, sits under
 * the call card in `app/page.tsx`. The alert form that sat here is its own
 * section now, fifth, because hearing the day a line is crossed is how the page
 * is meant to be used; the plan link closes the areas section, where the rules
 * it turns into a plan are.
 */
export function ShareSection({
  currentRecordDate,
  currentRecordDateLabel,
}: {
  currentRecordDate: string;
  currentRecordDateLabel: string;
}) {
  return (
    <HomeSection id={HOME_SECTIONS.share.id} heading={HOME_SECTIONS.share.heading}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Neither takes a payload: the slide reads the same published
            artifact the share panel and the presentation frames read, and the
            image is the brief card `/share` lists, for the reading on screen. */}
        <CopyMeetingSlideButton />
        <CopyImageCardButton />
        <ActionLink href="/share" variant="inline">
          Every other format →
        </ActionLink>
      </div>
      <CanonicalWeekPermalink currentRecordDate={currentRecordDate} currentRecordDateLabel={currentRecordDateLabel} />
    </HomeSection>
  );
}
