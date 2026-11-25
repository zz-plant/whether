import type { loadHomePageAssembly } from "../lib/report/homePageAssemblyLoader";
import type { ComparisonBasis } from "../lib/report/comparisonBasis";
import { getRegimePublicLabel, isRegimeKey } from "../lib/regimePresentation";
import { describeSpellLengths } from "../lib/report/lastTimeCallChanged";
import type { RunwayBand } from "../lib/report/operatorRunway";
import type { TimeMachineRegimeEntry } from "../lib/timeMachine/timeMachineCache";
import {
  ALERT_ANSWER,
  buildHomeQuestions,
  changedHeading,
  describeHeldAreas,
  describeScoreChanges,
  describeWeeklyMovement,
  describeWhyConditions,
  diagnosisHeading,
  type HomeAreaRow,
  type HomeQuestion,
  type SignalChangeRow,
} from "../lib/report/home/homeSectionModel";
import type { KnownDate } from "./components/ui/datedText";

type ReportData = Awaited<ReturnType<typeof loadHomePageAssembly>>["reportData"];
type Dynamics = {
  directionLabel?: string;
  /** The earlier reading the week was compared with. */
  comparedWith?: { recordDate: string } | null;
};

/**
 * The page's questions and their answers (2026-11-18), built once, out of the route so the
 * page stays under its line cap. Each section prints its heading and its first sentence
 * from here, and the JSON-LD marks up the same strings (`withHomeQuestions`), so the markup
 * cannot say what the page does not.
 *
 * Also what the answers read: how long these conditions lasted before (`describeSpellLengths`,
 * left out of an archived view, whose record would have to end at its month), and the
 * earlier reading's date as the page prints it ("since Nov 9"), with the ISO date a
 * `<time dateTime>` needs.
 */
export function buildHomePageQuestions({
  reportData,
  dynamics,
  areaRows,
  signalChangeRows,
  basis,
  scores,
  deltas,
  savedReadingDate,
  reversalTrigger,
  record,
  runwayBand,
}: {
  reportData: ReportData;
  dynamics: Dynamics;
  areaRows: readonly Pick<HomeAreaRow, "area" | "pause">[];
  signalChangeRows: readonly SignalChangeRow[];
  basis: ComparisonBasis;
  scores: { tightness: number; riskAppetite: number };
  deltas: { tightness: number; riskAppetite: number };
  savedReadingDate?: string;
  /** The week's "Conditions change if" sentence, which answers "What would change our mind?". */
  reversalTrigger: string | undefined;
  /** Every month-end on record; null on an archived view. */
  record: readonly TimeMachineRegimeEntry[] | null;
  runwayBand: RunwayBand | null;
}) {
  const { assessment } = reportData;
  const regime = assessment.regime;
  const regimeLabel = getRegimePublicLabel(regime);
  const changeLines = { tightness: assessment.thresholds.tightnessRegime, riskAppetite: assessment.thresholds.riskAppetiteRegime };
  const comparisonUnavailable = dynamics.directionLabel === "unavailable";
  const pendingConditions = assessment.regimeTransition?.pending ? assessment.regimeTransition.candidateState : undefined;
  const spellLengths = !record || !isRegimeKey(regime) ? null : describeSpellLengths({ series: record, currentRegime: regime, runwayBand });
  const changedTitle = changedHeading(basis);
  const questions = buildHomeQuestions({
    areas: describeHeldAreas(areaRows, savedReadingDate),
    changed: {
      question: changedTitle,
      answer: comparisonUnavailable
        ? describeWeeklyMovement({
            tightnessDelta: deltas.tightness,
            riskAppetiteDelta: deltas.riskAppetite,
            comparisonUnavailable,
            basis,
            savedReadingDate,
          })
        : describeScoreChanges(signalChangeRows),
    },
    diagnosis: {
      question: diagnosisHeading({ regimeLabel, pending: Boolean(pendingConditions) }),
      answer: describeWhyConditions({
        regime,
        regimeLabel,
        pendingLabel: pendingConditions ? getRegimePublicLabel(pendingConditions) : undefined,
        tightness: scores.tightness,
        riskAppetite: scores.riskAppetite,
        changeLines,
      }),
    },
    watch: reversalTrigger,
    record: spellLengths?.lead,
    alert: ALERT_ANSWER,
  });
  const comparedWith = dynamics.comparedWith;
  const dates: KnownDate[] = basis.date && comparedWith?.recordDate ? [{ label: basis.date, iso: comparedWith.recordDate.slice(0, 10) }] : [];
  return {
    questions,
    markedUp: Object.values(questions).filter((question): question is HomeQuestion => question !== null),
    changedTitle,
    pendingConditions,
    spellLengths,
    dates,
  };
}
