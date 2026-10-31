import Link from "next/link";
import type { LineStateBandModel } from "../../../lib/report/home/homeSectionModel";
import { LineStateIcon } from "../ui/conceptIcons";

/**
 * The week's exception, above the call (2026-10-31).
 *
 * A crossed pause line was drawn in five places on `/` — the stamp, the
 * ladder, the picker's badges, the area table and the card's "On hold:" line —
 * and loud in none, so a week with an area held looked like a week with none.
 * The band is the page's silhouette changing with the weather: it renders only
 * when `describeLineStateBand` finds an area on hold or close to its line, and
 * returns nothing on a calm week.
 *
 * Its glyph is the line state's own (§XXIV: pause for crossed, the dashed ring
 * for close), and the sentence carries the distance to the binding line — the
 * one fact the card does not state. It names no state word, because the card
 * below says "On hold: …" and two statements of the same state forty pixels
 * apart is how a page starts repeating itself.
 */
export function LineStateBand({ model }: { model: LineStateBandModel }) {
  return (
    <p
      data-line-state-band={model.state}
      className="weather-line-band mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 px-4 py-2.5 text-fluid-micro"
    >
      <LineStateIcon state={model.state} className="self-center" />
      <span className="font-medium">{model.text}</span>
      <Link href={model.href} className="weather-hit underline underline-offset-4">
        {model.action} →
      </Link>
    </p>
  );
}
