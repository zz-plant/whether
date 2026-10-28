import Link from "next/link";
import { HomeSection } from "./HomeSection";
import { getRegimePublicLabel } from "../../../lib/regimePresentation";
import { signalReadingMeaning } from "../../../lib/report/signalTranslations";
import { NOT_COUNTED_REASON } from "../../../lib/report/scoringBasis";
import { regimeAtCoordinates } from "../../../lib/regimePhaseSpace";
import { DEFAULT_THRESHOLDS } from "../../../lib/regimeEngineCore";
import { HOME_SECTIONS } from "../../../lib/report/home/homeSectionModel";

type NotCountedReading = {
  metric: "tightness" | "riskAppetite";
  label: string;
  /** The score with the inputs outside the record counted. */
  score: number;
  published: number;
  /** The line those inputs would cross, when they would cross one. */
  line: string | null;
};

/**
 * What the week's conditions are made of, and what the reading leaves out.
 *
 * It answers "how reliable is this?" where the reader asks it — after the
 * decisions, not inside a methodology page. The two scores print with their
 * meaning (`signalReadingMeaning`, the same phrase the brief card uses), so a
 * reader does not have to learn the 0–100 scale to know what 90 and 55 say.
 *
 * Two qualifications live here because they change the classification rather
 * than decorate it:
 *   - inputs outside the record are not counted. Counted, they would move a
 *     score across its change line and the conditions would not be what the
 *     headline says. The qualification is stated where the conditions are
 *     explained, not buried on /trust (2026-10-22).
 *   - a capped score shows less distance to its line than the pressure behind
 *     it. 90 against a 70 line reads "20 points"; the uncapped calculation is
 *     110, so the real distance is 40. Without that, a 0.22-point rate move
 *     suggested by the scenario fold looks inconsistent with the number.
 */
export function WhyConditionsSection({
  regime,
  tightness,
  riskAppetite,
  changeLines,
  saturatedPressure,
  notCounted,
  warning,
}: {
  regime: string;
  tightness: number;
  riskAppetite: number;
  /** The two change lines the conditions are cut at. */
  changeLines: { tightness: number; riskAppetite: number };
  /** The unclipped pressure behind a score pinned at the top of its scale. */
  saturatedPressure?: number;
  notCounted: readonly NotCountedReading[];
  /** What the uncounted inputs would do to a line, in one sentence; null when they would cross none. */
  warning: string | null;
}) {
  const regimeLabel = getRegimePublicLabel(regime);
  const readings = [
    { key: "tightness" as const, label: "Funding pressure", value: tightness, line: changeLines.tightness },
    { key: "riskAppetite" as const, label: "Risk appetite", value: riskAppetite, line: changeLines.riskAppetite },
  ];
  /* Where the reading would land with the excluded inputs counted, in the
     weather vocabulary — the same quadrant function the map uses, so the
     sentence cannot disagree with the picture. */
  const tightnessCounted = notCounted.find((candidate) => candidate.metric === "tightness")?.score ?? tightness;
  const riskAppetiteCounted = notCounted.find((candidate) => candidate.metric === "riskAppetite")?.score ?? riskAppetite;
  const countedRegime = regimeAtCoordinates(tightnessCounted, riskAppetiteCounted, {
    ...DEFAULT_THRESHOLDS,
    tightnessRegime: changeLines.tightness,
    riskAppetiteRegime: changeLines.riskAppetite,
  });
  const countedRegimeLabel = getRegimePublicLabel(countedRegime);
  /* The capped score's real distance: the uncapped pressure against the same
     change line, beside the number the score prints. */
  const cappedDistance =
    typeof saturatedPressure === "number" && saturatedPressure > tightness
      ? { shown: Math.abs(tightness - changeLines.tightness), actual: Math.abs(saturatedPressure - changeLines.tightness) }
      : null;

  return (
    /* The rule that turns two numbers into a weather word leads (2026-10-27): it is
       the answer to the heading, and it sat under the table that is its evidence. */
    <HomeSection
      id={HOME_SECTIONS.diagnosis.id}
      heading={`Why conditions are ${regimeLabel}`}
      lead={(
        <>
          Funding pressure is {tightness > changeLines.tightness ? "above" : "below"} its {changeLines.tightness} change
          line, and risk appetite is {riskAppetite > changeLines.riskAppetite ? "above" : "below"} its{" "}
          {changeLines.riskAppetite} change line. Together they put conditions in{" "}
          <span className="font-semibold">{regimeLabel}</span>.
        </>
      )}
    >
      {/* The readings beside what they leave out, from xl (2026-10-27): stacked, the
          note and the capped-score line sat under a 64rem table with the right half of
          a laptop screen empty, and a frame cut the section in two. */}
      <div className={notCounted.length > 0 || cappedDistance ? "xl:grid xl:grid-cols-2 xl:items-start xl:gap-8" : undefined}>
        <div className="min-w-0">
          <table className="w-full border-collapse text-fluid-sm" data-conditions-reading>
            <caption className="sr-only">
              The two readings behind this week&rsquo;s conditions, with what each one means.
            </caption>
            <thead>
              <tr className="border-b border-[color:var(--border-subtle)] text-left text-fluid-xs text-slate-400">
                <th scope="col" className="py-2 pr-4 font-medium">Reading</th>
                <th scope="col" className="py-2 pr-4 font-medium">Now</th>
                <th scope="col" className="py-2 font-medium">What it means</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((reading) => (
                <tr key={reading.key} className="border-b border-[color:var(--border-subtle)] align-baseline last:border-b-0">
                  <th scope="row" className="py-3 pr-4 text-left font-medium text-slate-200">{reading.label}</th>
                  <td className="py-3 pr-4 tabular-nums text-slate-100">{reading.value}</td>
                  <td className="py-3 text-slate-300">{signalReadingMeaning(reading.key, reading.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>
        <div className="min-w-0">
          {notCounted.length > 0 ? (
            <div className="weather-caveat-band mt-5 max-w-3xl px-4 py-3 xl:mt-0" data-excluded-inputs>
              <p className="weather-caveat-mark text-fluid-xs font-semibold">What the headline reading leaves out</p>
              <p className="mt-1 text-fluid-sm leading-relaxed text-slate-200">
                {warning
                  ? `${warning}${countedRegimeLabel !== regimeLabel ? ` If we counted them, conditions would be ${countedRegimeLabel}, not ${regimeLabel}.` : ""}`
                  : `If we counted them, we'd have ${notCounted
                      .map((entry) => `${entry.metric === "tightness" ? "funding pressure" : "risk appetite"} at ${entry.score}`)
                      .join(" and ")}.`}{" "}
                {NOT_COUNTED_REASON}
              </p>
            </div>
          ) : null}

          {cappedDistance ? (
            <p className="mt-4 max-w-3xl text-fluid-xs leading-relaxed text-slate-400" data-capped-reading>
              Funding pressure reads {tightness} because the score is capped there; without the cap it would read{" "}
              {saturatedPressure}. The distance to its {changeLines.tightness} change line is therefore{" "}
              {cappedDistance.shown} points on the score but {cappedDistance.actual} points of pressure.
            </p>
          ) : null}
        </div>
      </div>

      <p className="mt-4 text-fluid-xs text-slate-400">
        <Link href="/trust#formula-reference" className="weather-hit underline decoration-slate-600 underline-offset-4 hover:text-slate-200">
          How the scores are set
        </Link>
        {" · "}
        <Link href="/history" className="weather-hit underline decoration-slate-600 underline-offset-4 hover:text-slate-200">
          How these conditions compare with past months
        </Link>
      </p>
    </HomeSection>
  );
}
