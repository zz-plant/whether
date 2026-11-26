import { HomeSection } from "./HomeSection";
import { ActionLink } from "../ui/actionLink";
import { ALERT_ANSWER, HOME_MONDAY_EMAIL_HASH, HOME_SECTIONS, type HomeQuestion } from "../../../lib/report/home/homeSectionModel";

/**
 * The alert, fifth on the page and right after the lines it watches (2026-10-09). Its
 * heading is the reader's question and its lead the answer (2026-11-18).
 *
 * It held the full subscribe form until 2026-11-26, when the Monday email moved under
 * the call as one field (`SubscribeForm inline`). That email carries every alert, so
 * this section points to it, and the full form, with alerts only and Slack, is on
 * `/share`: one email field on the page rather than two.
 */
export function AlertSection({
  question = { id: HOME_SECTIONS.alert.id, question: HOME_SECTIONS.alert.heading, answer: ALERT_ANSWER },
}: {
  question?: HomeQuestion;
} = {}) {
  return (
    <HomeSection id={HOME_SECTIONS.alert.id} heading={question.question} lead={question.answer}>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-fluid-sm">
        <ActionLink href={`#${HOME_MONDAY_EMAIL_HASH}`} variant="inline">
          The Monday email includes them
        </ActionLink>
        <ActionLink href="/share#subscribe-email" variant="inline">
          Alerts only, or Slack
        </ActionLink>
      </p>
    </HomeSection>
  );
}
