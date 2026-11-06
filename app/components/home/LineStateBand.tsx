import type { LineStateBandModel } from "../../../lib/report/home/homeSectionModel";
import { LineStateIcon } from "../ui/conceptIcons";

/**
 * The week's exception, above the call (2026-10-31).
 *
 * The band is the page's silhouette changing with the weather: it renders only when
 * `describeLineStateBand` finds a hold that just started or a line that is close, and
 * returns nothing otherwise, a standing hold included (2026-11-05). The card's area strip
 * states a hold and links to its rule, so the band carries no link of its own.
 *
 * Its glyph is the line state's own (§XXIV: pause for crossed, the dashed ring for close).
 */
export function LineStateBand({ model }: { model: LineStateBandModel }) {
  return (
    <p
      data-line-state-band={model.state}
      className="weather-line-band mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 px-4 py-2.5 text-fluid-nano"
    >
      <LineStateIcon state={model.state} className="self-center" />
      <span className="font-medium">{model.text}</span>
    </p>
  );
}
