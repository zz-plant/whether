import { HomeSection } from "./HomeSection";
import { SubscribeForm } from "../SubscribeForm";
import { HOME_MONDAY_EMAIL_HASH, HOME_SECTIONS } from "../../../lib/report/home/homeSectionModel";

/**
 * The alert, fifth on the page and right after the lines it watches (2026-10-09).
 */
export function AlertSection({ defaultFrequency = "alerts" }: { defaultFrequency?: "alerts" | "weekly" }) {
  return (
    <HomeSection id={HOME_SECTIONS.alert.id} heading={HOME_SECTIONS.alert.heading}>
      <div id={HOME_MONDAY_EMAIL_HASH}>
        <SubscribeForm compact defaultFrequency={defaultFrequency} showTitle={false} />
      </div>
    </HomeSection>
  );
}
