import { HomeSection } from "./HomeSection";
import { ActionLink } from "../ui/actionLink";
import { ShareOrEmbedLink } from "../shareOrEmbedLink";
import { SubscribeForm } from "../SubscribeForm";
import { RegimeAlertToggle } from "../regimeAlertToggle";
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
 * Act and share: the plan, the link to every share format, the subscribe row
 * and the citable permalink. Copy Brief, DD-005's canonical primary action, sits
 * under the call card in `app/page.tsx` since 2026-09-30.
 *
 * One primary action. The plan link was a pill among two copy buttons, four
 * arrow links (stress-test, decision record, answers, AI assistant) and a
 * subscribe form, all at the same weight, so nothing said what to do next. The
 * plan is the primary button; the copies (now on /share, one link away) are
 * secondary; the four links are in the footer and the header already.
 */
export function DoAndShareSection({
  operateHref,
  planLabel,
  currentRecordDate,
  currentRecordDateLabel,
}: {
  operateHref: string;
  /** Named for the selected cadence, so the one plan CTA matches the horizon on screen. */
  planLabel?: string;
  currentRecordDate: string;
  currentRecordDateLabel: string;
}) {
  return (
    <HomeSection id={HOME_SECTIONS.act.id} heading={HOME_SECTIONS.act.heading} className="order-5">
      <div className="flex flex-wrap items-center gap-2">
        <ActionLink href={operateHref} variant="primary">
          {planLabel ?? "Build this week’s plan →"}
        </ActionLink>
        {/* One link where the slide and image copy buttons were: /share holds
            every format, both of those buttons among them (2026-10-08). */}
        <ShareOrEmbedLink />
      </div>
      {/* The one conversion on the page, beside the actions rather than 3,000px
          below them. The push toggle sits with it: it is the same alert by
          another route, and renders nothing where push is unconfigured. */}
      <div id="subscribe" className="space-y-4 border-t border-slate-800/60 pt-4">
        <h3 className="sr-only">Get the weekly guidance by email</h3>
        <SubscribeForm compact />
        <RegimeAlertToggle />
      </div>
      <CanonicalWeekPermalink currentRecordDate={currentRecordDate} currentRecordDateLabel={currentRecordDateLabel} />
    </HomeSection>
  );
}
