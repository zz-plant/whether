import type { LineStateBandModel } from "../../../lib/report/home/homeSectionModel";
import { LineStateIcon } from "../ui/conceptIcons";

/**
 * The week's exception, under the call (2026-10-31; inside the call since 2026-11-21).
 *
 * The band is the page's silhouette changing with the weather: it renders only when
 * `describeLineStateBand` finds a hold that just started or a line that is close, and
 * returns nothing otherwise, a standing hold included (2026-11-05). The card's area strip
 * states a hold and links to its rule, so the band carries no link of its own.
 *
 * It was a boxed band above the card; the one-page brief prints it as the call's own line,
 * in the crossed line's ink on the sky, with a rule at its left. A close line is a note,
 * not an error, so it takes the sky's ink and a neutral rule (forecast.css).
 *
 * Its glyph is the line state's own (§XXIV: pause for crossed, the dashed ring for close).
 */
export function LineStateBand({ model }: { model: LineStateBandModel }) {
  return (
    <p
      data-line-state-band={model.state}
      data-line-state-placement="call"
      className="weather-line-band-call grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 border-l border-line-crossed-border pl-3 text-fluid-sm leading-snug"
    >
      <LineStateIcon state={model.state} className="mt-0.5" />
      <span className="font-medium">{model.text}</span>
    </p>
  );
}
