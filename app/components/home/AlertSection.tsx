import { HomeSection } from "./HomeSection";
import { SubscribeForm } from "../SubscribeForm";
import { RegimeAlertToggle } from "../regimeAlertToggle";
import { HOME_SECTIONS } from "../../../lib/report/home/homeSectionModel";

/**
 * The alert, fifth on the page and right after the lines it watches (2026-10-09).
 *
 * /about says it plainly: most Mondays nothing has moved, and the use is to set the
 * lines and hear the day one is crossed. So this is the page's core loop, and it
 * was the last thing on it, a form under "Do and share" headed "Get the weekly
 * guidance by email". It starts on alerts only, with the Monday email one choice
 * away; the section above states the lines, so the form does not repeat them. The
 * push toggle is the same alert by another route, and renders nothing where push
 * is unconfigured. A reader who arrived from a shared link was offered "Get it
 * every Monday" in the greeting, so for them the form starts on Monday delivery.
 */
export function AlertSection({ defaultFrequency = "alerts" }: { defaultFrequency?: "alerts" | "weekly" }) {
  return (
    <HomeSection id={HOME_SECTIONS.alert.id} heading={HOME_SECTIONS.alert.heading}>
      <SubscribeForm compact defaultFrequency={defaultFrequency} showTitle={false} />
      <RegimeAlertToggle />
    </HomeSection>
  );
}
