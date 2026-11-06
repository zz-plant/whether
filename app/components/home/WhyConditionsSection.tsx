import Link from "next/link";
import { HomeSection } from "./HomeSection";
import { getRegimePublicLabel, isRegimeKey, REGIME_WEATHER_LINES } from "../../../lib/regimePresentation";
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
 * decisions, not inside a methodology page. The two scores print against their lines,
 * and `REGIME_WEATHER_LINES` says what they add up to, so a reader does not have to
 * learn the 0–100 scale to know what 90 and 55 say.
 *
 * Two qualifications live here because they change the classification rather
 * than decorate it:
 *   - inputs outside the record are not counted. Counted, they would move a
 *     score across its change line and the conditions would not be what the
 *     headline says. The qualification is stated where the conditions are
 *     explained, not buried on /trust (2026-10-22).
 */
export function WhyConditionsSection({
  regime,
  tightness,
  riskAppetite,
  changeLines,
  notCounted,
  warning,
}: {
  regime: string;
  tightness: number;
  riskAppetite: number;
  /** The two change lines the conditions are cut at. */
  changeLines: { tightness: number; riskAppetite: number };
  /** The unclipped pressure behind a score pinned at the top of its scale. */
  notCounted: readonly NotCountedReading[];
  /** What the uncounted inputs would do to a line, in one sentence; null when they would cross none. */
  warning: string | null;
}) {
  const regimeLabel = getRegimePublicLabel(regime);
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

  return (
    /* The rule that turns two numbers into a weather word leads (2026-10-27): it is
       the answer to the heading, and it sat under the table that is its evidence. */
    <HomeSection
      id={HOME_SECTIONS.diagnosis.id}
      heading={`Why conditions are ${regimeLabel}`}
      /* What each side means, in the lead, and no table under it (2026-10-27). The
         table printed the two scores a third time on the brief, beside the card's
         ladder and the rows of "What changed" further down; its one column of its
         own, what each reading means, is a clause here. */
      lead={(
        <>
          {/* The numbers against their lines, then what they add up to in the weather's
              terms (2026-11-05). Each score carried its meaning in brackets; the closing
              line says it once, for both. */}
          Funding pressure is {Math.round(tightness)}, {tightness > changeLines.tightness ? "above" : "below"}{" "}
          {changeLines.tightness}. Risk appetite is {Math.round(riskAppetite)},{" "}
          {riskAppetite > changeLines.riskAppetite ? "above" : "below"} {changeLines.riskAppetite}.{" "}
          {isRegimeKey(regime) ? `${REGIME_WEATHER_LINES[regime]} ` : null}
          <span className="font-semibold">That&rsquo;s {regimeLabel}.</span>
        </>
      )}
    >
      <div className="min-w-0">
        {notCounted.length > 0 ? (
          <div className="weather-caveat-band max-w-3xl px-4 py-3" data-excluded-inputs>
            <p className="weather-caveat-mark text-fluid-sm font-semibold">
              {countedRegimeLabel !== regimeLabel ? `Why it feels like ${countedRegimeLabel}` : "What the headline reading leaves out"}
            </p>
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
      </div>

      <p className="mt-4 text-fluid-sm text-slate-400">
        <Link href="/trust#formula-reference" className="weather-hit underline decoration-slate-600 underline-offset-4 hover:text-slate-200">
          How scores are set
        </Link>
        {" · "}
        <Link href="/history" className="weather-hit underline decoration-slate-600 underline-offset-4 hover:text-slate-200">
          Compare with past months
        </Link>
      </p>
    </HomeSection>
  );
}
