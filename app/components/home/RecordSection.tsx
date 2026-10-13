import Link from "next/link";
import { HomeSection } from "./HomeSection";
import { LastTimeCallChangedCard } from "./LastTimeCallChangedCard";
import { HOME_SECTIONS } from "../../../lib/report/home/homeSectionModel";
import type { LastTimeCallChanged } from "../../../lib/report/lastTimeCallChanged";

/**
 * "Has this happened before?", seventh (2026-10-09): on a week conditions changed,
 * the last time they moved the same way and where the scores stood three months on;
 * on every week, how long these conditions lasted before (2026-10-13) and the
 * last turns in the record as links. It was an h3 inside the
 * picker on a first visit and a card under "What would change this guidance" for
 * everyone else, so the page answered the question twice in two places.
 */
export function RecordSection({
  lastTime,
  callChangeLines,
  turningPoints,
  spellLengths,
}: {
  lastTime: LastTimeCallChanged | null;
  callChangeLines: { tightness: number; riskAppetite: number };
  turningPoints: readonly { label: string; href: string }[];
  /** How long these conditions lasted before (`describeSpellLengths`); null on an archived view. */
  spellLengths?: string | null;
}) {
  if (!lastTime && turningPoints.length === 0 && !spellLengths) return null;
  return (
    <HomeSection id={HOME_SECTIONS.record.id} heading={HOME_SECTIONS.record.heading}>
      {lastTime ? <LastTimeCallChangedCard record={lastTime} callChangeLines={callChangeLines} /> : null}
      {spellLengths ? <p className="max-w-[72ch] text-fluid-xs leading-relaxed text-slate-300">{spellLengths}</p> : null}
      {turningPoints.length > 0 ? (
        <p className="max-w-[72ch] text-fluid-xs leading-relaxed text-slate-300">
          What the guidance said at the last turns:{" "}
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
