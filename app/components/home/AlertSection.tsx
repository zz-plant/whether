import { HomeSection } from "./HomeSection";
import { SubscribeForm } from "../SubscribeForm";
import { ALERT_ANSWER, HOME_MONDAY_EMAIL_HASH, HOME_SECTIONS, type HomeQuestion } from "../../../lib/report/home/homeSectionModel";

/**
 * The alert, fifth on the page and right after the lines it watches (2026-10-09). Its
 * heading is the reader's question and its lead the answer (2026-11-18), so the form under
 * it leaves out the sentence the lead now says.
 */
export function AlertSection({
  defaultFrequency = "alerts",
  question = { id: HOME_SECTIONS.alert.id, question: HOME_SECTIONS.alert.heading, answer: ALERT_ANSWER },
}: {
  defaultFrequency?: "alerts" | "weekly";
  question?: HomeQuestion;
}) {
  return (
    <HomeSection id={HOME_SECTIONS.alert.id} heading={question.question} lead={question.answer}>
      <div id={HOME_MONDAY_EMAIL_HASH}>
        <SubscribeForm compact defaultFrequency={defaultFrequency} showTitle={false} alertsDescribed />
      </div>
    </HomeSection>
  );
}
