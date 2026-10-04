import { HomeSection } from "./HomeSection";
import { ActionLink } from "../ui/actionLink";
import { CopyMeetingSlideButton } from "../CopyMeetingSlideButton";
import { CopyImageCardButton } from "../CopyImageCardButton";
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
function CanonicalWeekPermalink({ currentRecordDate }: { currentRecordDate: string }) {
  const brief = selectCitablePermalinkBrief(currentRecordDate);
  if (!brief) return null;

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
 * Act and share: the slide and image copies, the plan and evidence links, the
 * subscribe row and the citable permalink. Copy Brief, DD-005's canonical
 * primary action, sits under the call card in `app/page.tsx` since 2026-09-30;
 * the plan link is the one `pill` on the page, and the rest are inline links.
 */
export function DoAndShareSection({
  operateHref,
  planLabel,
  currentRecordDate,
}: {
  operateHref: string;
  /** Named for the selected cadence, so the one plan CTA matches the horizon on screen. */
  planLabel?: string;
  currentRecordDate: string;
}) {
  return (
    <HomeSection id={HOME_SECTIONS.act.id} heading={HOME_SECTIONS.act.heading} className="order-5">
      <div className="flex flex-wrap items-center gap-2">
        {/* Neither takes a payload: the slide reads the same published
            artifact the share panel and the presentation frames read, and the
            image is the brief card `/share` lists, for the reading on screen. */}
        <CopyMeetingSlideButton />
        <CopyImageCardButton />
        <ActionLink href={operateHref} variant="pill">
          {planLabel ?? "Build this week’s plan →"}
        </ActionLink>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <ActionLink href="/operate#ops-decision-shield" variant="inline">
          Stress-test a plan →
        </ActionLink>
        <ActionLink href="/decisions" variant="inline">
          Track your decision record →
        </ActionLink>
        <ActionLink href="/resolve#direct-answers" variant="inline">
          Answers to common questions →
        </ActionLink>
        <ActionLink href="/api-docs" variant="inline">
          Connect an AI assistant →
        </ActionLink>
      </div>
      {/* The one conversion on the page, beside the actions rather than 3,000px
          below them. The push toggle sits with it: it is the same alert by
          another route, and renders nothing where push is unconfigured. */}
      <div id="subscribe" className="space-y-4 border-t border-slate-800/60 pt-4">
        <h3 className="sr-only">Get the weekly guidance by email</h3>
        <SubscribeForm compact />
        <RegimeAlertToggle />
      </div>
      <CanonicalWeekPermalink currentRecordDate={currentRecordDate} />
    </HomeSection>
  );
}
