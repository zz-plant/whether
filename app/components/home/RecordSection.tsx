import Link from "next/link";
import { HomeSection } from "./HomeSection";
import { LastTimeCallChangedCard } from "./LastTimeCallChangedCard";
import { MonthStrip } from "../history/monthStrip";
import { HOME_SECTIONS } from "../../../lib/report/home/homeSectionModel";
import type { LastTimeCallChanged } from "../../../lib/report/lastTimeCallChanged";

/**
 * "Has this happened before?", seventh (2026-10-09): on a week conditions changed,
 * the last time they moved the same way and where the scores stood three months on;
 * on every week, how long these conditions lasted before (2026-10-13) and the
 * last turns in the record as links. It was an h3 inside the
 * picker on a first visit and a card under "What would change this guidance" for
 * everyone else, so the page answered the question twice in two places.
 *
 * The record drawn, not only counted (2026-10-21): every month-end since 2012 as
 * one band in its weather, the strip /history opens on. The sentences under it
 * say how long a spell lasts and where the last turns were; the band shows both
 * at once, and shows how rarely conditions change, which no sentence here says.
 */
export function RecordSection({
  lastTime,
  callChangeLines,
  turningPoints,
  spellLengths,
  record,
}: {
  lastTime: LastTimeCallChanged | null;
  callChangeLines: { tightness: number; riskAppetite: number };
  turningPoints: readonly { label: string; href: string }[];
  /** How long these conditions lasted before (`describeSpellLengths`); null on an archived view. */
  spellLengths?: string | null;
  /** Every month-end on record, for the band; left out of an archived view, whose record would end at its month. */
  record?: readonly { recordDate: string; regime: string; tightness?: number; riskAppetite?: number }[];
}) {
  if (!lastTime && turningPoints.length === 0 && !spellLengths && !record?.length) return null;
  return (
    <HomeSection id={HOME_SECTIONS.record.id} heading={HOME_SECTIONS.record.heading}>
      {lastTime ? <LastTimeCallChangedCard record={lastTime} callChangeLines={callChangeLines} /> : null}
      {record && record.length > 0 ? (
        <>
          <MonthStrip entries={record} />
          {/* Two sampling conventions on one page: the headline is this week's
              reading, the record behind this band is month-end readings. Said
              once, under the band, because a reader comparing the two would
              otherwise read the difference as a data gap (2026-10-22). */}
          <p className="max-w-[72ch] text-fluid-xs leading-relaxed text-slate-400" data-record-sampling>
            The record is month-end readings; the guidance above is this week&rsquo;s. A week that moved the
            guidance appears here at the month-end it belongs to.
          </p>
        </>
      ) : null}
      {spellLengths ? <p className="max-w-[72ch] text-fluid-xs leading-relaxed text-slate-300">{spellLengths}</p> : null}
      {turningPoints.length > 0 ? (
        <p className="max-w-[72ch] text-fluid-xs leading-relaxed text-slate-300">
          What the guidance said the last few times conditions changed:{" "}
          {turningPoints.map((point, index) => (
            <span key={point.href}>
              {index > 0 ? " · " : null}
              <Link href={point.href} className="weather-hit text-sky-300 underline decoration-sky-700 underline-offset-4 hover:text-sky-200">
                {point.label}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
    </HomeSection>
  );
}
