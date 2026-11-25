import { ActionLink } from "../components/ui/actionLink";
import { BaseRateMarks, type BaseRateMark } from "../components/trustStrip";
import type { CalibrationChoiceGroup } from "../../lib/report/confidenceCalibration";

/**
 * How often conditions held at each distance from a change (2026-11-18), on `/trust`
 * under "How close conditions are to changing".
 *
 * The strip above the page says "Past conditions held 7 of 10 months at this distance"
 * and draws a square per month, for this week's distance alone. This lays the other
 * distances beside it: a pick-one row of the groups `/calibration`'s table counts, in its
 * words, this week's picked by default, and the picked group's answer and count with its
 * squares, drawn by the strip's own `BaseRateMarks`. Each square names its month and opens
 * it, as the strip's do.
 *
 * The choice is the URL's (`?distance=`, the group's lower edge), and each option is a
 * link to that URL, as the phase map's window chooser on /history is: it works before any
 * script, a shared link opens on the same group, and the page stays a server component.
 * The default group is the link without the key.
 *
 * Document order is the reading order a search engine and a screen reader get: the
 * question, its answer in the next sentence (the caption of the squares it counts), then
 * the other distances to pick from.
 */
export function DistanceHeldChoice({
  groups,
  marksFor,
  hrefFor,
}: {
  groups: readonly CalibrationChoiceGroup[];
  /** The squares for a group, from the same entries its count adds up (`describeBaseRateMonth`). */
  marksFor: (group: CalibrationChoiceGroup) => readonly BaseRateMark[];
  /** The URL that picks a group, keeping the rest of the page's query. */
  hrefFor: (group: CalibrationChoiceGroup) => string;
}) {
  const selected = groups.find((group) => group.selected);
  if (!selected) return null;
  const marks = marksFor(selected);
  return (
    <div id="distance-held" className="space-y-3" data-distance-choice>
      <h3 id="distance-held-heading" className="text-sm font-semibold text-slate-100">
        How often did conditions hold?
      </h3>
      {/* No `m-0`: preflight already zeroes a figure's margins, and the utility took the
          gap `space-y-3` puts under it, so the squares touched the choices. */}
      <figure className="space-y-2" data-distance-group={selected.from}>
        <figcaption className="text-sm tabular-nums text-slate-200" data-distance-sentence>
          {selected.sentence}
        </figcaption>
        {/* The strip's squares at a size the eye can count: they are em-sized, so the
            line they sit in sets them. Filled where conditions held the next month. */}
        {marks.length === selected.months ? (
          <div className="text-xl leading-none">
            <BaseRateMarks marks={marks} />
          </div>
        ) : null}
      </figure>
      {/* Links, not radios: each is the URL of a group, and the current one says so
          (`.weather-pill[aria-current="page"]` draws it as chosen). */}
      <nav aria-labelledby="distance-held-heading" className="flex flex-wrap gap-1.5">
        {groups.map((group) => (
          <ActionLink
            key={group.from}
            href={hrefFor(group)}
            scroll={false}
            variant="pill"
            aria-current={group.selected ? "page" : undefined}
            className={group.selected ? undefined : "text-slate-300"}
            data-distance-option={group.from}
          >
            {group.label}
            {group.thisWeek ? <span className="ml-1 font-normal text-slate-400">· this week</span> : null}
          </ActionLink>
        ))}
      </nav>
    </div>
  );
}
