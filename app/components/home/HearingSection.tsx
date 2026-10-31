import { HomeSection } from "./HomeSection";
import { ActionLink } from "../ui/actionLink";
import { HearingBubbles } from "../ui/hearingBubbles";
import { HOME_SECTIONS } from "../../../lib/report/home/homeSectionModel";
import type { selectHearingForAreas } from "../../guides/stakeholderGuides";

/**
 * "What you may be hearing" (2026-10-31): the questions this week's crossed
 * pause lines invite, and the answer each one already has. It sits after "What
 * would change this guidance" because it is that section translated into the
 * rooms the reader walks into, and before the record, which is about the lines
 * rather than about the people asking.
 *
 * The selection is the route's (`selectHearingForAreas`): one question per
 * crossed area, one per group, one per speaker. A week no pause line is crossed
 * renders nothing — there is no line for anyone to ask about — so a calm brief
 * does not grow a section that says the same thing every week.
 */
export function HearingSection({
  entries,
}: {
  entries: ReturnType<typeof selectHearingForAreas>;
}) {
  if (entries.length === 0) return null;

  return (
    <HomeSection
      id={HOME_SECTIONS.hearing.id}
      heading={HOME_SECTIONS.hearing.heading}
      lead="The questions this week's lines invite, and the answer each one has."
      action={<ActionLink href="/resources#guided-translation" variant="inline">By role →</ActionLink>}
    >
      <HearingBubbles entries={entries.map(({ hearing }) => hearing)} className="max-w-2xl" />
    </HomeSection>
  );
}
